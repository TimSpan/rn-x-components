/**
 * ============================================================================
 * XCarousel —— 轮播图（duxui Swiper 的 RN 原生重写版）
 * ============================================================================
 *
 * 【与 duxui Swiper 的关系】
 * duxui 的 Swiper 直接封装 Taro <Swiper>（RN 端是 Taro 适配层），
 * 本项目脱离 Taro 运行时，这里用原生 ScrollView pagingEnabled 自实现，
 * 并补齐 duxui 没有的「无限循环」（克隆首尾页 + 落点归位）。
 *
 * 【实现要点】
 * 1. 无限循环：pages = [克隆尾页, ...data, 克隆首页]，初始停在真实首页；
 *    onMomentumScrollEnd 检测到落在克隆页时，立即无动画滚回真实页，
 *    视觉上完全无感；
 * 2. 自动播放：setInterval 定时 scrollTo 下一页（animated），当前下标以
 *    currentRef 为单一数据源（momentum 回调同步回写）；手指拖动期间
 *    （onScrollBeginDrag）暂停，松手后恢复，避免"抢手感"；
 * 3. 指示点：自绘 View（duxui 的 dot/dotColor/dotSelectColor/dotDistance 同名 props）；
 * 4. 容器宽度用 onLayout 实测（不依赖 Dimensions，适配分屏/旋转），
 *    首次测量完成后做一次初始落位。
 *
 * 【对标 duxui API】autoplay/interval/circular/vertical/dot/dotColor/
 * dotSelectColor/dotDistance/defaultCurrent 全保留；差异：RN 端用
 * renderItem 数据驱动（duxui 是 SwiperItem 子组件声明式），更贴合列表习惯。
 * ============================================================================
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import {useXTheme} from '../theme';

/** 单条数据：优先级 render > image > color（title 叠加在色块上，便于无图演示） */
export interface XCarouselItem {
  /** 网络图/本地图 */
  image?: {uri: string} | number;
  /** 无图时用纯色块占位 */
  color?: string;
  /** 色块上的标题文字（可选） */
  title?: string;
  /** 完全自定义渲染 */
  render?: () => React.ReactNode;
}

export interface XCarouselProps {
  /** 数据源 */
  data: XCarouselItem[];
  /** 自定义渲染每页 */
  renderItem?: (item: XCarouselItem, index: number) => React.ReactNode;
  /** 自动播放，默认 true（data.length <= 1 时自动关闭） */
  autoplay?: boolean;
  /** 自动播放间隔 ms，默认 3000 */
  interval?: number;
  /** 无限循环，默认 true */
  circular?: boolean;
  /** 纵向轮播，默认 false */
  vertical?: boolean;
  /** 是否显示指示点，默认 true */
  dot?: boolean;
  /** 指示点颜色（未选中），默认白 40% */
  dotColor?: string;
  /** 指示点选中色，默认白色 */
  dotSelectColor?: string;
  /** 指示点间距，默认 6 */
  dotDistance?: number;
  /** 初始页（真实数据下标），默认 0 */
  defaultCurrent?: number;
  /** 高度，默认 180 */
  height?: number;
  /** 页面切换回调（真实数据下标） */
  onIndexChange?: (index: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** 取一次屏幕宽做初始兜底（onLayout 首帧后立刻被真实宽度覆盖） */
const INITIAL_WIDTH = Dimensions.get('window').width;

export function XCarousel({
  data,
  renderItem,
  autoplay = true,
  interval = 3000,
  circular = true,
  vertical = false,
  dot = true,
  dotColor,
  dotSelectColor,
  dotDistance = 6,
  defaultCurrent = 0,
  height = 180,
  onIndexChange,
  style,
}: XCarouselProps) {
  const t = useXTheme();
  const listRef = useRef<ScrollView>(null);
  /** 容器宽度（onLayout 实测） */
  const [width, setWidth] = useState(INITIAL_WIDTH);
  /** 当前真实数据下标（渲染指示点用） */
  const [current, setCurrent] = useState(defaultCurrent);
  /** 当前真实下标的 ref（自动播放的单一数据源，避免 setState 副作用） */
  const currentRef = useRef(defaultCurrent);
  /** 手指拖动中：暂停自动播放 */
  const draggingRef = useRef(false);
  /** 是否已完成初始落位 */
  const positionedRef = useRef(false);

  const count = data.length;
  const single = count <= 1;

  /**
   * 循环模式：首尾各克隆一页。
   * pages[0] = data[count-1]，pages[count+1] = data[0]，
   * 真实页在 [1, count]，初始落位 pages 下标 = defaultCurrent + 1。
   */
  const pages = useMemo(() => {
    if (single || !circular) return data;
    return [data[count - 1], ...data, data[0]];
  }, [data, circular, single, count]);

  /** 真实下标 → pages 下标（含克隆偏移） */
  const toPageIndex = useCallback((realIndex: number) => realIndex + 1, []);
  /** pages 下标 → 真实下标（克隆页归一化到 0 / count-1） */
  const toRealIndex = useCallback(
    (pageIndex: number) => {
      if (pageIndex <= 0) return count - 1;
      if (pageIndex >= count + 1) return 0;
      return pageIndex - 1;
    },
    [count],
  );

  /** 滚动到指定 pages 下标 */
  const scrollToPage = useCallback(
    (pageIndex: number, animated: boolean) => {
      listRef.current?.scrollTo(
        vertical ? {y: pageIndex * height, animated} : {x: pageIndex * width, animated},
      );
    },
    [vertical, height, width],
  );

  /** 真实下标上报 + 指示点同步（ref 与 state 同步更新） */
  const reportReal = useCallback(
    (realIndex: number) => {
      currentRef.current = realIndex;
      setCurrent(prev => (prev === realIndex ? prev : realIndex));
      onIndexChange?.(realIndex);
    },
    [onIndexChange],
  );

  /** 首次测得真实宽度后做初始落位（落在 defaultCurrent 对应真实页） */
  const handleLayout = useCallback(
    (e: {nativeEvent: {layout: {width: number}}}) => {
      const w = e.nativeEvent.layout.width;
      setWidth(prev => {
        positionedRef.current = true;
        const pageIndex = toPageIndex(currentRef.current);
        // 无动画跳到初始页；用实测宽度计算，rAF 等 ScrollView 完成布局
        requestAnimationFrame(() =>
          listRef.current?.scrollTo(
            vertical ? {y: pageIndex * height, animated: false} : {x: pageIndex * w, animated: false},
          ),
        );
        return prev === w ? prev : w;
      });
    },
    [toPageIndex, vertical, height],
  );

  /**
   * onMomentumScrollEnd 统一处理：
   * 1. 由 pages 下标算真实下标并上报；
   * 2. 落在克隆页时立即无动画归位（用户无感）。
   */
  const handleMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offset = vertical ? e.nativeEvent.contentOffset.y : e.nativeEvent.contentOffset.x;
      const size = vertical ? height : width;
      if (size <= 0) return;
      const pageIndex = Math.round(offset / size);
      if (!single && circular) {
        if (pageIndex === 0) {
          // 落在"尾页克隆"→ 归位到真实最后一页
          reportReal(count - 1);
          scrollToPage(1, false);
          return;
        }
        if (pageIndex === count + 1) {
          // 落在"首页克隆"→ 归位到真实第一页
          reportReal(0);
          scrollToPage(count, false);
          return;
        }
        reportReal(toRealIndex(pageIndex));
        return;
      }
      const realIndex = Math.min(Math.max(pageIndex, 0), count - 1);
      reportReal(realIndex);
    },
    [vertical, height, width, single, circular, count, reportReal, scrollToPage, toRealIndex],
  );

  /** 自动播放：拖动暂停；interval 到点滚向下一页（末页循环回首） */
  useEffect(() => {
    if (!autoplay || single) return;
    const timer = setInterval(() => {
      if (draggingRef.current) return;
      const nextReal = (currentRef.current + 1) % count;
      scrollToPage(toPageIndex(nextReal), true);
    }, interval);
    return () => clearInterval(timer);
  }, [autoplay, single, interval, count, scrollToPage, toPageIndex]);

  /** 指示点最终颜色（默认适配图片场景：白点；可覆盖） */
  const inactiveDot = dotColor ?? 'rgba(255, 255, 255, 0.4)';
  const activeDot = dotSelectColor ?? t.colorTextLightSolid;

  /** 单页渲染 */
  const renderPage = (item: XCarouselItem, realIndex: number) => {
    if (renderItem) return renderItem(item, realIndex);
    if (item.render) return item.render();
    if (item.image) {
      return <Image source={item.image} style={styles.image} resizeMode='cover' />;
    }
    return (
      <View style={[styles.colorPage, {backgroundColor: item.color ?? t.colorPrimary}]}>
        {item.title ? <Text style={styles.title}>{item.title}</Text> : null}
      </View>
    );
  };

  return (
    <View style={[styles.container, {height, borderRadius: t.borderRadiusXL}, style]} onLayout={handleLayout}>
      <ScrollView
        ref={listRef}
        horizontal={!vertical}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={() => (draggingRef.current = true)}
        onScrollEndDrag={() => (draggingRef.current = false)}
        onMomentumScrollEnd={handleMomentumEnd}
      >
        {pages.map((item, pageIndex) => (
          <View key={pageIndex} style={{width, height}}>
            {renderPage(item, Math.min(Math.max(toRealIndex(pageIndex), 0), count - 1))}
          </View>
        ))}
      </ScrollView>
      {dot && count > 1 && (
        <View style={styles.dots} pointerEvents='none'>
          {data.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {marginHorizontal: dotDistance / 2, backgroundColor: i === current ? activeDot : inactiveDot},
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    backgroundColor: '#ddd',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  colorPage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
  },
  dots: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});

export default XCarousel;
