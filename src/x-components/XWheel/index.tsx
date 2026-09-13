/**
 * ============================================================================
 * XWheel -- 通用滚轮列（antd-mobile picker-view/wheel.tsx 架构的 RN 移植）
 * ============================================================================
 *
 * 【被 XPickerDate（多列日期）与 XPicker（单列选项）共用】
 *
 * 架构（antd 的核心，丝滑的全部秘密）：
 * - 没有 ScrollView。"一个手势 + 一个平移值"：Gesture.Pan 驱动单个 y 共享值，
 *   整个行容器只是一个 View 整体 translateY。滚动中每帧只有 1 个 transform
 *   更新，零逐行计算、零 JS 参与。
 * - 所有行视觉完全一致（无逐行高亮）。选中表现完全来自遮罩层：
 *   上下渐变把远处行淡出到背景色 + 中间两条 1px 框线。
 * - 拖拽中越界走橡皮筋（rubberbandIfOutOfBounds，antd 原公式）；
 *   松手按"位置 + 速度投影"夹边界取整到行，withSpring 落位，
 *   同时立即上报选中（不等动画结束，antd 行为）。
 * ============================================================================
 */

import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import {Pressable, StyleSheet, View, Text} from 'react-native';
import Animated, {runOnJS, useAnimatedStyle, useSharedValue, withSpring} from 'react-native-reanimated';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import LinearGradient from 'react-native-linear-gradient';

/** 每行高度（antd: --item-height 34px） */
const ITEM_HEIGHT = 34;
/** 列可视高度（antd: --height 240px，约 7 行） */
const VISIBLE_HEIGHT = 240;
/** 遮罩渐变的背景色（antd --adm-color-background） */
const BG_COLOR = '#fff';
/**
 * 弹簧参数（antd: react-spring tension 400 / mass 0.8，换算到 Reanimated）。
 * damping 50 ≈ 轻微过阻尼，落位干脆利落，与 antd 观感一致。
 */
const SPRING_CONFIG = {mass: 0.8, stiffness: 400, damping: 50} as const;
/**
 * 松手动量投影系数。antd: 位置 + velocity(px/ms) * 50；RNGH velocity 是
 * px/s，等价换算为 velocity * 0.05（50ms 的动量投影，保守、不飘）。
 */
const VELOCITY_PROJECTION = 0.05;
/** 橡皮筋参数（antd 原值：dimension = itemHeight*50, constant 0.2） */
const RUBBERBAND_EXTENT_FACTOR = 50;
const RUBBERBAND_CONSTANT = 0.2;
/** 手势激活阈值：垂直位移超过它才算拖拽，小于它视为点击（行内 Pressable 接管） */
const PAN_ACTIVE_OFFSET = 6;

/* ------------------------------------------------------------------ *
 * antd utils/bound.ts 与 utils/rubberband.ts 的逐行移植               *
 * ------------------------------------------------------------------ */

const bound = (position: number, min: number, max: number) => {
  'worklet';
  return Math.min(Math.max(position, min), max);
};

const rubberband = (distance: number, dimension: number, constant: number) => {
  'worklet';
  return (distance * dimension * constant) / (dimension + constant * distance);
};

/**
 * 越界橡皮筋（antd 原公式）：越界后阻力随距离增大，拖不出"一屏"。
 * dimension = itemHeight * 50, constant = 0.2 与 antd 完全一致。
 * 注意：被手势 worklet 调用，自身必须是 worklet（'worklet' 指令不可省）。
 */
const rubberbandIfOutOfBounds = (position: number, min: number, max: number, dimension: number) => {
  'worklet';
  const c = RUBBERBAND_CONSTANT;
  if (position < min) {
    return -rubberband(min - position, dimension, c) + min;
  }
  if (position > max) {
    return +rubberband(position - max, dimension, c) + max;
  }
  return position;
};

/** 滚轮选项：label 显示文本，value 回传值 */
export interface XWheelOption<T = any> {
  label: string;
  value: T;
}

/** 父组件在"确定"时通过 ref 强制结算的句柄 */
export interface XWheelHandle {
  /**
   * 按当前视觉位置返回选项（拖拽/spring 进行中也能拿到正确值）。
   * antd 确认的是"看到的"值，不是"上次落位的"。
   */
  flush: () => XWheelOption | undefined;
}

interface XWheelProps {
  /** 选项列表（顺序即列内顺序） */
  items: XWheelOption[];
  /** 当前选中值（受控，父组件传；不在列表中时夹到最近边界） */
  value?: any;
  /** 选中上报（松手/点选时触发；antd 的 onSelect） */
  onSelect: (value: any) => void;
}

/**
 * 把 value 换算成索引。
 * 若 value 不在 items 里（如切到 2 月后，天列只剩 1~28，而 value 还是 31），
 * 则夹到最近的边界：大于最大值 -> 最后一项，否则 -> 第一项。
 */
const clampIndex = (items: XWheelOption[], value: any) => {
  let index = items.findIndex(item => item.value === value);
  if (index === -1) {
    index = items.length ? (value > items[items.length - 1].value ? items.length - 1 : 0) : 0;
  }
  return Math.max(0, index);
};

/**
 * XWheel -- 单列滚轮。
 *
 * 唯一的动态值是 y（0 = 第一项停在选中位，负值向上滚）。
 * 每帧只发生一件事：y 变化 -> 一个 useAnimatedStyle 重新求值 ->
 * 容器整体 translateY。所有行是纯静态 View，滚动中零重渲染、零重绘。
 */
export const XWheel = React.memo(
  forwardRef<XWheelHandle, XWheelProps>(function XWheel({items, value, onSelect}, ref) {
    /** 受控 value 对应的目标索引 */
    const targetIndex = clampIndex(items, value);
    const listRef = useRef(items);
    listRef.current = items;
    const onSelectRef = useRef(onSelect);
    onSelectRef.current = onSelect;

    /** 滚轮位置（antd 的 y）：0 ~ -(n-1)*ITEM_HEIGHT，负值向上 */
    const y = useSharedValue(-targetIndex * ITEM_HEIGHT);
    /** 拖拽进行中（同步受控更新用；antd 的 draggingRef） */
    const isDragging = useSharedValue(false);
    /** 手势起始时的 y（onUpdate 里从它累加 translationY） */
    const startY = useSharedValue(0);
    /** 最后已上报的值：去重，切断"上报 -> 父更新 -> 再同步"循环 */
    const lastSynced = useSharedValue(value);

    /** JS 侧选中上报（stable，供 worklet runOnJS 调用；antd 的 onSelect） */
    const select = useCallback(
      (v: any) => {
        if (v !== undefined && v !== lastSynced.value) {
          lastSynced.value = v;
          onSelectRef.current?.(v);
        }
      },
      [lastSynced],
    );

    /** 滚到某行（antd 的 scrollSelect：spring 动画 + 立即选中） */
    const scrollSelect = useCallback(
      (index: number) => {
        const list = listRef.current;
        const i = Math.min(Math.max(index, 0), Math.max(list.length - 1, 0));
        y.value = withSpring(-i * ITEM_HEIGHT, SPRING_CONFIG);
        select(list[i]?.value);
      },
      [y, select],
    );

    /**
     * 手势（antd 的 useDrag + rubberband）。
     * deps=[items]：数据变化（如天列 31->28）时重建闭包，min 实时正确 --
     * 拖着列时外部数据变化，松手自动被新边界夹取。
     */
    const pan = useMemo(
      () =>
        Gesture.Pan()
          // 垂直位移超过阈值才算拖滚轮；更小的位移留给行内 Pressable（点选）
          .activeOffsetY([-PAN_ACTIVE_OFFSET, PAN_ACTIVE_OFFSET])
          .onStart(() => {
            'worklet';
            isDragging.value = true;
            startY.value = y.value;
          })
          .onUpdate(e => {
            'worklet';
            if (!items.length) {
              return;
            }
            const min = -((items.length - 1) * ITEM_HEIGHT);
            y.value = rubberbandIfOutOfBounds(startY.value + e.translationY, min, 0, ITEM_HEIGHT * RUBBERBAND_EXTENT_FACTOR);
          })
          .onEnd(e => {
            'worklet';
            isDragging.value = false;
            if (!items.length) {
              return;
            }
            const min = -((items.length - 1) * ITEM_HEIGHT);
            // antd：位置 + 动量投影 -> 夹边界 -> 取整到行
            const projected = y.value + e.velocityY * VELOCITY_PROJECTION;
            const bounded = bound(projected, min, 0);
            const target = -Math.round(bounded / ITEM_HEIGHT);
            y.value = withSpring(-target * ITEM_HEIGHT, SPRING_CONFIG);
            // 去重统一在 select 内部（不在此预写 lastSynced，
            // 否则双重去重互相打架导致选中永远上报不出去）
            const v = items[target]?.value;
            if (v !== undefined) {
              runOnJS(select)(v);
            }
          })
          // 手势被打断（如弹层关闭）：只复位拖拽标记，位置交给受控同步
          .onFinalize(() => {
            'worklet';
            isDragging.value = false;
          }),
      [items, isDragging, startY, y, lastSynced, select],
    );

    /**
     * 受控同步（antd 的 useIsomorphicLayoutEffect）：
     * 外部 value / 数据源变化时对齐。拖拽中坚决不动 y（antd 同款防护）。
     */
    useEffect(() => {
      lastSynced.value = value;
      if (isDragging.value) {
        return;
      }
      y.value = withSpring(-targetIndex * ITEM_HEIGHT, SPRING_CONFIG);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [targetIndex, items]);

    /**
     * flush：确定按钮按下时按当前视觉位置取选项。
     * 拖拽/spring 进行中拿到的也是"看到的"值（antd 行为）。
     */
    useImperativeHandle(
      ref,
      () => ({
        flush: () => {
          const list = listRef.current;
          const index = Math.min(Math.max(-Math.round(y.value / ITEM_HEIGHT), 0), Math.max(list.length - 1, 0));
          return list[index];
        },
      }),
      [],
    );

    /** 整个行容器唯一的动画样式：每帧只重求值这一个 */
    const wheelStyle = useAnimatedStyle(() => ({
      transform: [{translateY: y.value}],
    }));

    /** 点某一行：滚到它并直接选中（antd 的 handleClick -> scrollSelect） */
    const handlePressItem = useCallback(
      (index: number) => {
        if (isDragging.value) {
          return;
        }
        scrollSelect(index);
      },
      [isDragging, scrollSelect],
    );

    return (
      <View style={styles.column}>
        <GestureDetector gesture={pan}>
          <View style={StyleSheet.absoluteFill}>
            {/* 行容器：纯静态内容，唯一的动画是整体 translateY */}
            <Animated.View style={[styles.wheel, wheelStyle]}>
              {items.map((item, index) => (
                <Pressable key={String(item.value)} onPress={() => handlePressItem(index)} style={styles.item}>
                  <Text allowFontScaling={false} style={styles.itemText}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </Animated.View>
          </View>
        </GestureDetector>
        {/* 遮罩层（antd picker-view.less 的 mask）：上/下渐变把远处行淡出到背景色 */}
        <LinearGradient
          colors={[BG_COLOR, 'rgba(255,255,255,0.6)']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          pointerEvents='none'
          style={styles.maskTop}
        />
        <LinearGradient
          colors={['rgba(255,255,255,0.6)', BG_COLOR]}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          pointerEvents='none'
          style={styles.maskBottom}
        />
        {/* 中间选中框：两条 1px 边框（antd mask-middle） */}
        <View pointerEvents='none' style={styles.maskMiddle} />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  /** 单列：240 高，相对定位，遮罩绝对定位盖在上面 */
  column: {
    height: VISIBLE_HEIGHT,
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  /**
   * 行容器（antd 的 column-wheel）：绝对定位在垂直中点，
   * 唯一的动画是整体 translateY（y 为负值时向上滚）。
   */
  wheel: {
    position: 'absolute',
    top: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
  },
  /** 单行：纯静态样式（antd 的 column-item，高度 34、字色统一、无任何动画） */
  item: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: '#333',
  },
  /** 上遮罩：远端全背景色 -> 靠中间半透明（antd mask-top 的渐变） */
  maskTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
  },
  /** 下遮罩：靠中间半透明 -> 远端全背景色（antd mask-bottom 的渐变） */
  maskBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
  },
  /** 中间选中框：两条 1px 边框（antd mask-middle），背景透明不遮行 */
  maskMiddle: {
    position: 'absolute',
    top: (VISIBLE_HEIGHT - ITEM_HEIGHT) / 2,
    left: 0,
    right: 0,
    height: ITEM_HEIGHT,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#e5e5e5',
  },
});
