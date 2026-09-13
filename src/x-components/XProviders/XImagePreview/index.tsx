/**
 * ============================================================================
 * XImagePreview —— 命令式图片预览（X 系列，复刻自 components/ImagePreview）
 * ============================================================================
 *
 * 由四部分组成（单文件聚合，避免目录过碎）：
 * - XGalleryImage          单图渲染（fitContainer 适配屏幕）
 * - XImagePreview          预览 UI（Gallery 翻页 + 页码 + 关闭按钮）
 * - XImagePreviewProvider  状态宿主，App 根部挂载一次
 * - XImagePreviewService   命令式入口，任意地方调用
 *
 * 用法：
 *   XImagePreviewService.show({images: urls, initialIndex: 0});
 *   XImagePreviewService.hide();
 *
 * 实现要点：
 * - 全局句柄 useEffect 注册/清理（无 render 副作用）；
 * - 关闭时清空 images，及时释放大图列表引用；
 * - DEV 环境未挂载时给出 console.warn；
 * - Modal 使用 transparent + fade，浮在原页面上（系统相册同款观感）；
 * - GestureHandlerRootView 是 react-native-zoom-toolkit 手势正常工作的必要包裹。
 */
import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {Image, Modal, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import {stackTransition, Gallery, type GalleryRefType, fitContainer} from 'react-native-zoom-toolkit';
import {Gesture, GestureDetector, GestureHandlerRootView} from 'react-native-gesture-handler';
import AntDesign from '@react-native-vector-icons/ant-design';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// ================= 类型 =================

export interface XImagePreviewParams {
  images: string[];
  initialIndex?: number;
}

type XImagePreviewHandle = {
  show: (params: XImagePreviewParams) => void;
  hide: () => void;
};

// ================= 单图渲染 =================

type XGalleryImageProps = {
  uri: string;
  index: number;
};

const XGalleryImage: React.FC<XGalleryImageProps> = ({uri}) => {
  const {width, height} = useWindowDimensions();
  const [resolution, setResolution] = useState<{width: number; height: number}>({width: 1, height: 1});

  const size = fitContainer(resolution.width / resolution.height, {width, height});

  return (
    <Image
      source={{uri}}
      style={size}
      resizeMethod={'scale'}
      resizeMode={'cover'}
      onLoad={e => {
        setResolution({
          width: e.nativeEvent.source.width,
          height: e.nativeEvent.source.height,
        });
      }}
    />
  );
};

// ================= 预览 UI =================

interface XImagePreviewProps {
  initialIndex?: number;
  imageList: string[];
  onClose?: () => void;
}

export const XImagePreview = ({initialIndex = 0, imageList, onClose}: XImagePreviewProps) => {
  const ref = useRef<GalleryRefType>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const insets = useSafeAreaInsets();

  const renderItem = useCallback((item: string, index: number) => {
    return <XGalleryImage uri={item} index={index} />;
  }, []);

  const keyExtractor = useCallback((item: string, index: number) => {
    return `${item}-${index}`;
  }, []);

  const onIndexChange = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  const transition = useCallback(stackTransition, []);

  // 关闭按钮的手势：必须用 RNGH 的 Gesture.Tap，因为 Gallery 内部有一个全屏
  // + zIndex 最大 + 带 Tap 的手势探测器，RN 的 TouchableOpacity 会被它抢走 touch。
  // 关键：必须用 useMemo 真正稳定为一个 Gesture 对象，传函数 / useCallback(返回新对象) 会让 GestureDetector 反复重新注册识别器，导致手势永远识别失败。
  const closeTap = useMemo(
    () =>
      Gesture.Tap()
        .runOnJS(true)
        .onEnd((_e, success) => {
          if (success) onClose?.();
        }),
    [onClose],
  );

  // 下拉关闭手势（iOS 相册标配）：垂直下拉超过 80px 触发关闭。
  const verticalPullClose = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([10, 10])
        .onEnd((e, success) => {
          if (success && e.translationY > 80) onClose?.();
        }),
    [onClose],
  );

  return (
    <View style={styles.root}>
      {/* 图片画廊：先渲染，手势 / 缩放交互主体 */}
      {/* tapOnEdgeToItem={false}：禁掉「点屏幕左右边缘切换图片」，否则点右上角关闭按钮会被当成切下一张 */}
      <Gallery
        ref={ref}
        data={imageList}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        initialIndex={initialIndex}
        onIndexChange={onIndexChange}
        customTransition={transition}
        tapOnEdgeToItem={false}
      />
      <View pointerEvents='box-none' style={[styles.topOverlay, {paddingTop: insets.top + 20, paddingRight: 10}]}>
        {/* <View pointerEvents='box-none' style={[styles.topOverlay, {paddingTop: 12, paddingRight: 10}]}> */}
        <GestureDetector gesture={closeTap}>
          <View style={styles.closeButton}>
            <AntDesign name='close' size={22} color='rgba(255,255,255,0.92)' />
          </View>
        </GestureDetector>
      </View>
      {/* 底部计数器：当前索引 / 总数 */}
      <View pointerEvents='box-none' style={[styles.bottomOverlay, {paddingBottom: insets.bottom + 24}]}>
        <Text style={styles.counter}>
          {currentIndex + 1} / {imageList.length}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  modalRoot: {
    ...{position: "absolute", top: 0, left: 0, right: 0, bottom: 0},
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    // paddingTop 在组件渲染时动态设置（insets.top + 8）
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  counter: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 999,
    overflow: 'hidden',
  },
});

// ================= Provider + Service =================

/** 全局句柄：Provider 挂载时写入，卸载时清空 */
let handle: XImagePreviewHandle | null = null;

export const XImagePreviewProvider = ({children}: {children: ReactNode}) => {
  const [visible, setVisible] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [initialIndex, setInitialIndex] = useState(0);

  const show = useCallback(({images: list, initialIndex: index = 0}: XImagePreviewParams) => {
    setImages(list);
    setInitialIndex(index);
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    setVisible(false);
    setImages([]); // 释放图片列表引用
  }, []);

  useEffect(() => {
    handle = {show, hide};
    return () => {
      if (handle?.show === show) {
        handle = null;
      }
    };
  }, [show, hide]);

  return (
    <>
      {children}
      <Modal visible={visible} transparent animationType='fade' statusBarTranslucent hardwareAccelerated onRequestClose={hide}>
        {/* <Modal visible={visible} transparent animationType='fade' hardwareAccelerated onRequestClose={hide}> */}
        {/* 不再强制修改状态栏：不设 statusBarTranslucent，Modal 默认从状态栏下方开始渲染，
            状态栏保留系统原貌（图标颜色由 App 主题/系统决定），不被预览的黑色背景覆盖。 */}
        <View style={styles.modalRoot}>
          <GestureHandlerRootView style={styles.modalRoot}>
            <XImagePreview imageList={images} initialIndex={initialIndex} onClose={hide} />
          </GestureHandlerRootView>
        </View>
      </Modal>
    </>
  );
};

/**
 * XImagePreviewService —— 命令式调用入口（可在组件外使用）
 */
export const XImagePreviewService = {
  show: (params: XImagePreviewParams) => {
    if (__DEV__ && !handle) {
      console.warn('[XImagePreviewService] XImagePreviewProvider 未挂载，本次 show 调用被忽略');
    }
    handle?.show(params);
  },
  hide: () => {
    if (__DEV__ && !handle) {
      console.warn('[XImagePreviewService] XImagePreviewProvider 未挂载，本次 hide 调用被忽略');
    }
    handle?.hide();
  },
};
