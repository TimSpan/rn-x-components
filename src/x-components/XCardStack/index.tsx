/**
 * ============================================================================
 * XCardStack —— 竖向堆叠卡片（HyperOS 组件堆叠那套交互）
 * ============================================================================
 *
 * 交互：手指在卡片上上下滑 → 当前卡片跟手位移/淡出，下一张同时放大顶上；
 * 松手超过阈值（或速度够快）就翻页，否则回弹。
 *
 * 视觉（对齐 HyperOS 观感）：
 * - 只有一张"后卡"露在下面，露出 PEEK 像素的一条边 + 轻微缩小（0.96）；
 * - 前卡跟手时透明度略降，后卡同步从 0.96 放大到 1，形成"顶上来了"的层次；
 * - 不做 3D 旋转，保持扁平但层次清楚（和系统组件堆叠一致）。
 *
 * 实现要点：
 * - 全程一个共享值 progress（-1 ~ 1）驱动两层的 transform，零 JS 逐帧；
 * - 翻页提交在动画结束后 runOnJS 改 index，避免动画中途换内容闪一下；
 * - 卡片数量为 1 时自动禁用滑动。
 * ============================================================================
 */
import React, {useCallback, useMemo} from 'react';
import {StyleProp, StyleSheet, View, ViewStyle} from 'react-native';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import {tickWheelHaptic} from '../XWheel/feedback';

export interface XCardStackProps<T> {
  data: T[];
  /** 渲染单张卡片（容器尺寸由 XCardStack 控制，内容自己撑满） */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** 受控索引 */
  index?: number;
  /** 翻页回调（松手并确认翻页后触发） */
  onIndexChange?: (index: number) => void;
  /** 卡片高度，必填（堆叠需要确定的高度来算位移） */
  height: number;
  /** 后卡在底部露出的高度，默认 10 */
  peek?: number;
  /** 是否循环翻页，默认 true */
  loop?: boolean;
  /** 翻页是否给触感反馈，默认 true */
  haptic?: boolean;
  /** 卡片圆角，默认 16 */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/** 前卡位移超过多少比例就翻页 */
const COMMIT_RATIO = 0.28;
/** 快速一甩（px/s）也翻页 */
const COMMIT_VELOCITY = 650;
/** 跟手时前卡最多淡到多少（再低会看着像消失） */
const MIN_OPACITY = 0.35;
/** 后卡的初始缩放 */
const BACK_SCALE = 0.96;

export function XCardStack<T>({
  data,
  renderCard,
  index = 0,
  onIndexChange,
  height,
  peek = 10,
  loop = true,
  haptic = true,
  radius = 16,
  style,
}: XCardStackProps<T>) {
  const total = data.length;
  const safeIndex = total ? Math.min(Math.max(index, 0), total - 1) : 0;
  /** 下一张（露边那张）；只有 1 张时不存在 */
  const nextIndex = total <= 1 ? -1 : loop ? (safeIndex + 1) % total : Math.min(safeIndex + 1, total - 1);

  /** -1 ~ 1：手指向上拖为负（下一张上移顶上），向下拖为正 */
  const progress = useSharedValue(0);
  /** 动画进行中，挡住重复手势 */
  const busy = useSharedValue(false);

  const commit = useCallback(
    (dir: 1 | -1) => {
      if (haptic) tickWheelHaptic();
      if (total <= 1) return;
      if (loop) {
        onIndexChange?.((safeIndex + (dir > 0 ? 1 : total - 1)) % total);
      } else {
        const target = Math.min(Math.max(safeIndex + (dir > 0 ? 1 : -1), 0), total - 1);
        onIndexChange?.(target);
      }
    },
    [haptic, loop, onIndexChange, safeIndex, total],
  );

  const settle = useCallback(
    (dir: 1 | -1 | 0) => {
      'worklet';
      if (dir === 0) {
        progress.value = withTiming(0, {duration: 220});
        return;
      }
      busy.value = true;
      progress.value = withTiming(dir, {duration: 220}, finished => {
        if (!finished) return;
        // 动画结束再换数据，避免内容替换发生在画面中间
        runOnJS(commit)(dir);
        progress.value = 0;
        busy.value = false;
      });
    },
    [busy, commit, progress],
  );

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-8, 8])
        .failOffsetX([-24, 24])
        .onUpdate(e => {
          'worklet';
          if (busy.value || total <= 1) return;
          // 拖到一张卡高度时刚好 1，稍微做点阻尼防止拖飞
          const raw = e.translationY / height;
          progress.value = Math.max(-1, Math.min(1, raw * 0.9));
        })
        .onEnd(e => {
          'worklet';
          if (busy.value || total <= 1) return;
          const p = progress.value;
          const quick = Math.abs(e.velocityY) > COMMIT_VELOCITY;
          if (p < -COMMIT_RATIO || (quick && e.velocityY < 0)) {
            settle(1); // 向上滑 -> 看下一张
          } else if (p > COMMIT_RATIO || (quick && e.velocityY > 0)) {
            settle(-1); // 向下滑 -> 回上一张
          } else {
            settle(0);
          }
        }),
    [busy, height, progress, settle, total],
  );

  /** 前卡：跟手位移 + 淡出 */
  const frontStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      transform: [{translateY: p * height * 0.85}, {scale: 1 - Math.abs(p) * 0.03}],
      opacity: 1 - Math.abs(p) * (1 - MIN_OPACITY),
      zIndex: 2,
    };
  });

  /** 后卡：一开始缩在后面、露出 peek，前卡一走就顶上放大。
   *  后卡要保持接近不透明（0.95），露出的那条边才清楚可见，否则像透出来的残影。 */
  const backStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const t = Math.min(Math.abs(p), 1);
    return {
      transform: [{translateY: (1 - t) * peek}, {scale: BACK_SCALE + (1 - BACK_SCALE) * t}],
      opacity: 0.95,
      zIndex: 1,
    };
  });

  if (!total) return null;

  const card = {height, borderRadius: radius};

  return (
    <GestureDetector gesture={pan}>
      {/* 宽度必须显式 100%：绝对定位的子卡片不占宽度，若父容器是
          alignItems:center（如 ScrollView 内容居中），这里会收缩成 0 宽导致卡片不可见 */}
      <View style={[{height: height + peek, width: '100%'}, style]}>
        {nextIndex >= 0 && (
          <Animated.View pointerEvents='none' style={[styles.layer, card, backStyle]}>
            {renderCard(data[nextIndex], nextIndex)}
          </Animated.View>
        )}
        <Animated.View style={[styles.layer, card, frontStyle]}>{renderCard(data[safeIndex], safeIndex)}</Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    overflow: 'hidden',
  },
});

export default XCardStack;
