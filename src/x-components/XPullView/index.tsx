/**
 * ============================================================================
 * XPullView —— 通用弹出层（duxapp/duxui XPullView 的 RN 移植版）
 * ============================================================================
 *
 * 【一句话理解】
 * 它不渲染任何东西到页面里（外层组件 return null），而是把弹层
 * "托管"给全局 XTopView 宿主，由宿主在应用根部绘制。
 *
 * 【为什么这比 RN 原生 Modal 丝滑？】
 * 1. 不是原生 Modal 窗口：没有原生窗口创建/销毁的开销；
 * 2. Reanimated 在 UI 线程驱动动画（worklet）：JS 线程不参与逐帧运算，
 *    动画期间 React 零重渲染；
 * 3. 只动画 transform + opacity（GPU 合成属性），不触发布局；
 * 4. 短时长 + ease-out 入场（默认 200ms，原生 Modal 约 300ms），起步快收尾利落；
 * 5. 正确的挂载时机：第一帧就是隐藏态（面板在屏幕外/透明），下一帧才开始
 *    入场动画，不存在"内容先闪现再移动"。
 *
 * 【组件分工】
 * - XPullView（对外壳）：监听 visible 变化，用 XTopViewStore 的 add/update
 *   把 PullOverlay 挂载/更新/移除；
 * - PullOverlay（核心层）：真正渲染遮罩+面板，负责入场/离场动画。
 *
 * 【生命周期（关键，多看几遍）】
 *   打开：visible=true
 *     → add(<PullOverlay visible />)  组件挂载，第一帧是隐藏态
 *     → 下一帧 rAF 触发入场动画（translateY: 屏高→0, ease-out）
 *
 *   关闭：visible=false
 *     → update(同一个 key, <PullOverlay visible={false} />)
 *     → React 按 key 复用同一个组件实例，只更新 props → 触发离场动画
 *     → 动画播完（duration+50ms）才 remove()，从宿主中摘掉
 *
 *   再次打开：visible=true
 *     → update 回 visible=true → 同一个实例重新播放入场动画
 *     （此时 shared value 正处于隐藏态，正好无缝衔接）
 * ============================================================================
 */

import React, {useCallback, useEffect, useRef} from 'react';
import {Dimensions, Pressable, StyleSheet, View, StyleProp, ViewStyle} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import {useXTopViewStore} from '../XTopViewStore';

/** 取一次屏幕宽高即可（旋转屏幕场景可改为监听 Dimensions 变化） */
const {width: windowWidth, height: windowHeight} = Dimensions.get('window');

/** 弹出方向：bottom 从底部滑入 / top 从顶部 / left、right 从两侧 / center 居中缩放 */
export type XPullSide = 'bottom' | 'top' | 'left' | 'right' | 'center';

/** XPullView 对外 API */
interface XPullViewProps {
  /** 是否显示（受控组件，与原生 Modal 的 visible 用法一致） */
  visible: boolean;
  /** 关闭回调：点遮罩（maskClosable）或需要关闭时触发 */
  onClose?: () => void;
  /** 弹出方向，默认 bottom */
  side?: XPullSide;
  /** 动画时长，默认 200ms（duxui 同款） */
  duration?: number;
  /** 遮罩最终透明度，默认 0.5（越接近 1 越黑） */
  overlayOpacity?: number;
  /** 是否显示黑色遮罩，默认 true */
  mask?: boolean;
  /** 点击遮罩是否关闭，默认 true */
  maskClosable?: boolean;
  /** 面板额外样式 */
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** 每种方向的"面板停靠位置"：absolute 定位，配合位移动画实现滑入滑出 */
const SIDE_STYLES: Record<XPullSide, ViewStyle> = {
  bottom: {position: 'absolute', bottom: 0, left: 0, right: 0}, // 贴底，宽度撑满
  top: {position: 'absolute', top: 0, left: 0, right: 0}, // 贴顶
  left: {position: 'absolute', left: 0, top: 0, bottom: 0}, // 贴左，高度撑满
  right: {position: 'absolute', right: 0, top: 0, bottom: 0}, // 贴右
  center: {
    // 居中：全屏 + flex 居中，面板在正中间
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
};

/**
 * 重要！遮罩要用 Animated.createAnimatedComponent 包装成"动画组件"。
 *
 * 【踩坑记录】useAnimatedStyle 返回的动画样式，只有 Reanimated 的
 * Animated.* 组件（Animated.View / Animated.Text / createAnimatedComponent
 * 包装的组件）才会生效。之前直接传给普通 <Pressable>，opacity 动画根本没跑，
 * 遮罩变成了纯黑（#000 没有透明度）。这一行就是修复。
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** PullOverlay 的 props = XPullView 的 props + onExitEnd（离场播完通知宿主移除） */
interface PullOverlayProps extends XPullViewProps {
  /** 离场动画播放完毕回调（由宿主把这一层从 XTopView 摘掉） */
  onExitEnd: () => void;
}

/**
 * PullOverlay —— 真正渲染在 XTopView 宿主中的弹层（遮罩 + 面板）
 *
 * 【动画原理】
 * 4 个 shared value（UI 线程上的"共享变量"）驱动一切：
 *   translate  = 面板位移（隐藏时 = 屏高/屏宽，展示时 = 0）
 *   scale      = 面板缩放（仅 center 方向用：0.85 → 1）
 *   opacity    = 面板透明度（0 → 1）
 *   maskOpacity = 遮罩透明度（0 → overlayOpacity）
 *
 * withTiming 是"动画指令"：告诉 Reanimated"用多少时长、什么缓动
 * 把值动画到目标"。动画全程在 UI 线程跑，不经过 JS 线程和 React 渲染。
 */
const PullOverlay = ({
  visible,
  onClose,
  side = 'bottom',
  duration = 200,
  overlayOpacity = 0.5,
  mask = true,
  maskClosable = true,
  style,
  children,
  onExitEnd,
}: PullOverlayProps) => {
  const isCenter = side === 'center';
  const horizontal = side === 'left' || side === 'right';
  // 隐藏位移取整屏尺寸：保证不管面板多高/多宽，都能完全移出屏幕外
  const hiddenOffset = horizontal ? windowWidth : windowHeight;
  // center 方向不位移，改用缩放（0.85 → 1），质感更柔和
  const hiddenScale = isCenter ? 0.85 : 1;

  // 初始值 = 隐藏态（面板在屏幕外、透明）→ 这就是"第一帧不闪现"的关键
  const translate = useSharedValue(hiddenOffset);
  const scale = useSharedValue(hiddenScale);
  const opacity = useSharedValue(0);
  const maskOpacity = useSharedValue(0);

  /**
   * 入场动画：visible 为 true 时执行。
   * 用 requestAnimationFrame 包一层 → 保证组件先以隐藏态渲染完一帧，
   * 下一帧才开启动画。如果直接在 useEffect 里改值，React 批处理可能
   * 导致第一帧就直接以目标值渲染（看不到动画）。
   */
  useEffect(() => {
    if (visible) {
      const raf = requestAnimationFrame(() => {
        // 入场用 ease-out：起步快、末尾减速，给人"轻快"的感觉
        translate.value = withTiming(0, {duration, easing: Easing.out(Easing.ease)});
        scale.value = withTiming(1, {duration, easing: Easing.out(Easing.ease)});
        opacity.value = withTiming(1, {duration});
        maskOpacity.value = withTiming(overlayOpacity, {duration});
      });
      // 组件卸载或 visible 变化时取消未执行的 rAF，防止内存泄漏/误触发
      return () => cancelAnimationFrame(raf);
    }
  }, [visible, duration, overlayOpacity]);

  /**
   * 离场动画：visible 变为 false 时执行。
   * 四个值反向动画回隐藏态，duration+50ms 后调用 onExitEnd 让宿主移除本层
   * （+50ms 是安全余量，确保最后一帧已经渲染完成）。
   * 注意清除 setTimeout：如果动画中途被重新打开，不能让旧的定时器把层移除。
   */
  useEffect(() => {
    if (!visible) {
      // 离场用 ease-in-out：中间快、两端慢，收尾自然
      translate.value = withTiming(hiddenOffset, {duration, easing: Easing.inOut(Easing.ease)});
      scale.value = withTiming(hiddenScale, {duration});
      opacity.value = withTiming(0, {duration});
      maskOpacity.value = withTiming(0, {duration});
      const timer = setTimeout(onExitEnd, duration + 50);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onExitEnd]);

  /**
   * useAnimatedStyle：把 shared value 映射成"动画样式"。
   * 这个 worklet 函数在 UI 线程上每次动画帧都会执行，
   * 返回值直接合成到视图样式上 —— 这就是动画期间 React 零重渲染的原因。
   */
  const panelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: isCenter
      ? [{scale: scale.value}] // 居中：只缩放
      : horizontal
        ? [{translateX: translate.value}] // 左右：横向位移
        : [{translateY: translate.value}], // 上下：纵向位移
  }));

  /** 遮罩样式：纯黑底 + 动画透明度（0.5 就是常见的半透明黑） */
  const maskAnimatedStyle = useAnimatedStyle(() => ({opacity: maskOpacity.value}));

  /** 点遮罩关闭（maskClosable 为 true 时） */
  const handleMaskPress = useCallback(() => {
    if (maskClosable) {
      onClose?.();
    }
  }, [maskClosable, onClose]);

  return (
    // 全屏层：box-none = 自己不拦截触摸，但允许子元素接收触摸
    <View style={StyleSheet.absoluteFill} pointerEvents='box-none'>
      {/* 遮罩：全屏黑色，动画透明度淡入淡出；点击触发关闭 */}
      {mask && (
        <AnimatedPressable
          onPress={handleMaskPress}
          style={[StyleSheet.absoluteFill, {backgroundColor: '#000'}, maskAnimatedStyle]}
        />
      )}
      {/* 面板：绝对定位 + 动画位移/缩放 */}
      <Animated.View style={[SIDE_STYLES[side], panelAnimatedStyle, style]} pointerEvents='box-none'>
        {/* 内容容器：auto 保证内容可点击；center 方向让子元素自然撑开居中 */}
        <View pointerEvents='auto' style={isCenter ? undefined : styles.panelWrapper}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
};

/**
 * XPullView —— 对外组件（薄壳）
 *
 * 【为什么壳要这么设计？】
 * 弹层要一直"活着"到离场动画播完，所以不能 visible=false 就直接卸载。
 * 这里用一个 keyRef 记录宿主中的 key：
 *   - visible=true  && 无 key → add 挂载
 *   - visible=true  && 有 key → update 更新（比如 children 变了）
 *   - visible=false && 有 key → update 成离场态，由 PullOverlay 播完动画后
 *                               调用 onExitEnd → remove
 *   - 组件自身卸载（页面销毁）→ 兜底 remove
 */
export const XPullView = ({
  visible,
  onClose,
  side = 'bottom',
  duration = 200,
  overlayOpacity = 0.5,
  mask = true,
  maskClosable = true,
  style,
  children,
}: XPullViewProps) => {
  // 从全局 store 取三个操作（选择器写法：只订阅这几个函数的引用）
  const add = useXTopViewStore(s => s.add);
  const update = useXTopViewStore(s => s.update);
  const remove = useXTopViewStore(s => s.remove);
  /** 记录当前弹层在宿主中的 key；null 表示没有挂载 */
  const keyRef = useRef<number | null>(null);

  /**
   * 根据 show 构建要挂载的弹层元素。
   * useCallback 缓存：children/参数不变时复用同一引用，
   * 避免 useEffect 因依赖变化反复执行。
   */
  const buildElement = useCallback(
    (show: boolean) => (
      <PullOverlay
        visible={show}
        side={side}
        duration={duration}
        overlayOpacity={overlayOpacity}
        mask={mask}
        maskClosable={maskClosable}
        style={style}
        onClose={onClose}
        onExitEnd={() => {
          // 离场播完：从宿主移除，并把 key 置空（下次打开重新 add）
          if (keyRef.current) {
            remove(keyRef.current);
            keyRef.current = null;
          }
        }}
      >
        {children}
      </PullOverlay>
    ),
    [children, duration, mask, maskClosable, onClose, overlayOpacity, remove, side, style],
  );

  /** 核心逻辑：visible 变化 → 挂载/更新弹层 */
  useEffect(() => {
    if (visible) {
      // 打开：没挂载就挂载（入场），已挂载就更新（比如重新打开或内容变化）
      if (!keyRef.current) {
        keyRef.current = add(buildElement(true));
      } else {
        update(keyRef.current, buildElement(true));
      }
    } else if (keyRef.current) {
      // 关闭：更新成离场态，动画播完后 PullOverlay 会调用 onExitEnd 移除
      update(keyRef.current, buildElement(false));
    }
  }, [visible, add, update, buildElement]);

  /** 兜底：XPullView 自身被卸载时（比如页面 navigate 走了），清理宿主里的弹层 */
  useEffect(() => {
    return () => {
      if (keyRef.current) {
        remove(keyRef.current);
        keyRef.current = null;
      }
    };
  }, [remove]);

  // 壳本身不渲染任何 UI，弹层都在 XTopView 宿主里
  return null;
};

const styles = StyleSheet.create({
  /** 非 center 方向：让面板宽度/高度撑满停靠边 */
  panelWrapper: {
    alignSelf: 'stretch',
  },
});