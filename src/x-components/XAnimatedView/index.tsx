/**
 * ============================================================================
 * XAnimatedView —— 通用动画视图（duxapp Animated.View 的 RN 移植版）
 * ============================================================================
 *
 * 【它是干什么的？】
 * XPullView 内部直接用了 useSharedValue + withTiming 写动画；而这里提供的
 * XAnimatedView + anim() 是更通用的"动画引擎"，可以给任意自定义组件用，
 * 用法和 duxapp 的 Animated.create() 完全一致（链式声明多段动画）。
 *
 * 【动画声明格式】
 *   anim(200, 'ease-out')        // 默认时长 200ms、缓动 ease-out
 *     .translateY(300)           // 第 1 步：Y 移到 300（屏外）
 *     .opacity(0)                //        同时透明
 *     .step()                    // 把上面这两个"动作"打包成一段
 *     .translateY(0)             // 第 2 步：Y 移回 0
 *     .opacity(1)                //        同时不透明
 *     .step()                    // 打包成第二段
 *     .export()                  // 输出 XAnimStep[] 交给 XAnimatedView
 *
 * 【多段动画如何播放？】
 * 用一个 0→N 的 progress（withSequence 顺序播放 N 段 withTiming），
 * 每段把 progress 推向 1、2、3……N。useAnimatedStyle 里用 interpolate
 * 把 progress 映射成每个属性的具体值（inputRange: [0,1,2..N]）。
 *
 * 【为什么动画在 UI 线程？】
 * useAnimatedStyle 的函数会被 Reanimated 编译成 worklet，运行在 UI 线程。
 * JS 线程只需要发一次"开始动画"的指令，之后每一帧的插值计算
 * 都在 UI 线程完成 → 即使 JS 线程忙（网络请求、列表渲染），动画也不掉帧。
 * ============================================================================
 */

import React, {useEffect, useMemo} from 'react';
import {StyleSheet, StyleProp, ViewStyle} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/** 支持的缓动函数（与 CSS / duxapp 命名一致） */
export type TimingFunction = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out';

/** 一段动画：option 是时长/缓动配置，action 是这一段的属性目标值 */
export interface XAnimStep {
  option?: {
    duration?: number;
    timingFunction?: TimingFunction;
    delay?: number;
  };
  action: Record<string, number>;
}

/** 缓动函数表：字符串名 → Reanimated Easing 函数 */
const EASINGS: Record<TimingFunction, ReturnType<typeof Easing.out>> = {
  linear: Easing.linear, // 匀速
  ease: Easing.ease, // 默认缓动
  'ease-in': Easing.in(Easing.ease), // 慢→快
  'ease-out': Easing.out(Easing.ease), // 快→慢（入场常用，起步跟手）
  'ease-in-out': Easing.inOut(Easing.ease), // 慢→快→慢（过渡常用）
};

/** 动画构建器的链式 API */
interface XAnimBuilder {
  /** 把当前累积的"动作"打包成一段动画 */
  step(option?: Partial<XAnimStep['option']>): XAnimBuilder;
  /** 通用：直接设置某个属性目标值 */
  set(name: string, value: number): XAnimBuilder;
  translateY(v: number): XAnimBuilder;
  translateX(v: number): XAnimBuilder;
  scale(v: number): XAnimBuilder;
  opacity(v: number): XAnimBuilder;
  rotate(v: number): XAnimBuilder;
  /** 导出所有动画段 */
  export(): XAnimStep[];
}

/**
 * 动画构建器（链式调用）
 *
 * 实现思路：
 * - `current` 暂存当前累积的动作（{translateY: 300, opacity: 0}）；
 * - `.step()` 把 current 打包成 {option, action} 推入 steps，然后清空 current；
 * - `.export()` 把最后一段也打包并返回 steps 数组。
 */
export function anim(duration = 200, timingFunction: TimingFunction = 'ease-in-out', delay = 0): XAnimBuilder {
  const steps: XAnimStep[] = [];
  let current: Record<string, number> = {};
  const api: XAnimBuilder = {
    step(option?: Partial<XAnimStep['option']>) {
      // 只有 current 里真的有动作时才打包（避免空 step）
      if (Object.keys(current).length) {
        steps.push({
          option: {duration, timingFunction, delay, ...option},
          action: current,
        });
        current = {};
      }
      return api;
    },
    set(name: string, value: number) {
      current[name] = value;
      return api;
    },
    translateY(v: number) {
      return api.set('translateY', v);
    },
    translateX(v: number) {
      return api.set('translateX', v);
    },
    scale(v: number) {
      return api.set('scale', v);
    },
    opacity(v: number) {
      return api.set('opacity', v);
    },
    rotate(v: number) {
      return api.set('rotate', v);
    },
    export(): XAnimStep[] {
      api.step();
      return steps;
    },
  };
  return api;
}

interface XAnimatedViewProps {
  /** 动画段数组（anim().export() 的结果） */
  animation?: XAnimStep[];
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  /** 透传其余 View 属性（onPress 等） */
  [key: string]: any;
}

/**
 * 推导动画起点：
 * 组件 style 里写的是什么，动画就从哪开始。
 * 比如 style={{transform: [{translateY: 300}], opacity: 0}}，
 * 那第一帧就停在这个隐藏态，动画再插值到目标值 —— 这就是"不闪现"的秘诀。
 * 如果没有显式初始值：opacity/scale 默认 1，其余默认 0。
 */
const getStartValue = (type: string, style: StyleProp<ViewStyle>): number => {
  const flat = StyleSheet.flatten(style) as any;
  // 1. 直接写在 style 上的属性（如 opacity）
  if (typeof flat?.[type] === 'number') {
    return flat[type];
  }
  // 2. 写在 transform 数组里的属性（如 translateY）
  if (Array.isArray(flat?.transform)) {
    const item = flat.transform.find((v: any) => v && typeof v === 'object' && type in v);
    if (item && typeof item[type] === 'number') {
      return item[type];
    }
  }
  // 3. 兜底默认值
  if (type === 'opacity' || type.startsWith('scale')) {
    return 1;
  }
  return 0;
};

export const XAnimatedView = ({animation = [], style, children, ...props}: XAnimatedViewProps) => {
  /** progress：0 → 1 → 2 … → N，驱动所有属性的插值 */
  const progress = useSharedValue(0);

  /**
   * 把 animation 序列化成字符串作为依赖：
   * 数组每次渲染都是新引用，直接拿它当依赖会导致动画重复播放；
   * 序列化后只有内容真的变化才重播。
   */
  const animationKey = useMemo(() => JSON.stringify(animation), [animation]);

  /**
   * 播放动画：把 progress 从 0 按顺序推进到 1..N
   */
  useEffect(() => {
    // 先取消上一次动画、归零，保证重复播放时从起点开始
    cancelAnimation(progress);
    progress.value = 0;
    if (!animation.length) {
      return;
    }
    // 每段动画 = 一个 withTiming：progress 推进到 index+1
    const steps = animation.map((step, index) => {
      const opt = step.option ?? {};
      const timing = withTiming(index + 1, {
        duration: opt.duration ?? 200,
        easing: EASINGS[opt.timingFunction ?? 'linear'] ?? Easing.linear,
      });
      // 有 delay 就包一层 withDelay
      return opt.delay ? withDelay(opt.delay, timing) : timing;
    });
    // withSequence：按顺序播放所有段（前一段完再播下一段）
    progress.value = withSequence(...steps);
    // 卸载时取消动画
    return () => cancelAnimation(progress);
  }, [animationKey, progress]);

  /**
   * 【关键】在 JS 线程预先计算好全部插值数据：
   * worklet（useAnimatedStyle）运行在 UI 线程，里面不能调用任何
   * 非 worklet 的 JS 函数，否则会抛
   * "[Worklets] Tried to synchronously call a RemoteFunction"。
   * 所以 getStartValue / 属性收集 / outputRange 推导全部在这里做完，
   * worklet 里只留纯 interpolate 数值计算。
   */
  const animData = useMemo(() => {
    if (!animation.length) {
      return null;
    }
    // 收集所有段里出现过的属性类型（去重）
    const typeSet: string[] = [];
    animation.forEach(step => {
      Object.keys(step.action).forEach(type => {
        if (!typeSet.includes(type)) {
          typeSet.push(type);
        }
      });
    });
    if (!typeSet.length) {
      return null;
    }
    // inputRange：progress 的取值点 [0, 1, 2, ..., N]
    const inputRange = [0, ...animation.map((_, index) => index + 1)];
    const entries = typeSet.map(type => {
      // outputRange：起点（style 里的初始值）→ 每段的目标值
      const outputRange = [getStartValue(type, style)];
      animation.forEach(step => {
        // 某一段没写这个属性就用上一段的值（保持不动）
        outputRange.push(step.action[type] ?? outputRange[outputRange.length - 1]);
      });
      return {type, outputRange};
    });
    return {inputRange, entries};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animationKey]);

  /**
   * 把 progress 映射成样式（worklet，UI 线程执行）：
   * 只做纯数值插值，不调用任何外部 JS 函数。
   */
  const animatedStyle = useAnimatedStyle(() => {
    if (!animData) {
      return {};
    }
    const res: Record<string, any> = {};
    const transform: any[] = [];
    const {inputRange, entries} = animData;
    for (let i = 0; i < entries.length; i++) {
      const {type, outputRange} = entries[i];
      // interpolate：把 progress 映射到 outputRange 区间
      const value = interpolate(progress.value, inputRange, outputRange);
      const isTransform =
        type.startsWith('translate') || type.startsWith('scale') || type.startsWith('rotate');
      if (isTransform) {
        // transform 属性：角度类要拼 'deg' 后缀
        if (type.startsWith('rotate')) {
          transform.push({[type]: `${value}deg`});
        } else {
          transform.push({[type]: value});
        }
      } else {
        // 非 transform 属性（如 opacity）直接放根级
        res[type] = value;
      }
    }
    if (transform.length) {
      res.transform = transform;
    }
    return res;
  });

  return (
    <Animated.View style={[style, animatedStyle]} {...props}>
      {children}
    </Animated.View>
  );
};