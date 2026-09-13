import React, {useCallback, useRef} from 'react';
import {View, StyleSheet, TouchableOpacity, LayoutChangeEvent, Text} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  ReduceMotion,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import AntDesign from '@react-native-vector-icons/ant-design';
import {xTheme} from '../theme';

/* ============================================================================
 * XAnimatedSearchPanel —— 可折叠搜索面板
 *
 * 【来源】由 components/AnimatedSearchPanel 迁入，命名与目录按 X-Components 约定加 X 前缀。
 *
 * 【设计要点一句话总结】
 * 整个动画只由一个 0~1 的 SharedValue（progress）驱动，所有视觉变化
 * （高度 / 透明度 / 位移 / 图标旋转 / 文案交叉淡入）都是它的纯函数派生。
 *
 * 这样做的三个好处：
 *   1. 动画全程运行在 UI 线程（Reanimated worklet），JS 线程即使在跑网络请求、
 *      列表 diff，动画也不会掉帧；
 *   2. React 端不持有任何动画中间态 → 动画期间 0 次重渲染；
 *   3. 多个属性共享同一时间轴，天然同步，不会出现「高度到了但内容还没淡入完」
 *      这种各自为政的错位感。
 *
 * 【为什么不用 LayoutAnimation / Animated(RN 内置) / height: 'auto'】
 *   - LayoutAnimation：Android 上表现不稳定，且无法精细控制曲线与联动属性；
 *   - RN 内置 Animated + useNativeDriver：height 不在 native driver 白名单里，
 *     只能走 JS 线程逐帧 setNativeProps，掉帧最明显的就是这种场景；
 *   - height: 'auto' 不可插值，RN 无法对 auto 做补间，必须先量出像素值。
 * ========================================================================== */

interface XAnimatedSearchPanelProps {
  children?: React.ReactNode;
  /**
   * 内容高度兜底值。
   * 首帧 onLayout 还没回调时用它，测到真实高度后立刻被覆盖。
   * 作用是避免「首次点击展开时高度是 0，动画看起来没反应」。
   */
  contentHeight?: number;
  onSearch: () => void;
  onReset: () => void;
  /**
   * 'spring'（默认）：收尾带极轻微回弹，手感更「活」；
   * 'timing'：纯缓动，时长可控、绝对不过冲。
   * 面板嵌在长列表头部、或对时序有严格要求时用 'timing'。
   */
  motion?: 'spring' | 'timing';
  defaultExpanded?: boolean;
  /**
   * 注意：如果父组件在这里 setState，会在展开首帧引入一次 React 渲染，
   * 可能造成第一帧轻微卡顿。只在真的需要同步外部状态时才传。
   */
  onToggle?: (expanded: boolean) => void;
}

/**
 * ── 展开/收起的弹簧参数 ──────────────────────────────────────────────
 * Reanimated 的 withSpring 是一个**阻尼谐振子**的数值积分：
 *   加速度 = (-stiffness * 位移 - damping * 速度) / mass
 *
 *   stiffness 刚度：越大越急，动画越快到达目标；
 *   damping   阻尼：越大越「粘」，越小越容易来回振荡；
 *   mass      质量：越大惯性越强，起步慢、余振长。
 *
 * 阻尼比 ζ = damping / (2 * sqrt(stiffness * mass))
 *   ζ < 1 欠阻尼（会过冲、有回弹）
 *   ζ = 1 临界阻尼（最快到达且不过冲）
 *   ζ > 1 过阻尼（慢慢爬过去，显得拖沓）
 * 本配置 ζ = 22 / (2 * sqrt(240 * 0.75)) ≈ 0.82 —— 略欠阻尼，
 * 收尾有一丝几乎察觉不到的回弹，这是「丝滑」的来源。
 *
 * ⚠️ rest 阈值必须调小：
 * progress 归一化在 0~1，而 Reanimated 默认阈值是按「像素级数值」定的
 * （restDisplacementThreshold 0.01 / restSpeedThreshold 2）。
 * 对 0~1 的量来说 0.01 相当于面板高度的 1%，弹簧会在肉眼可见的位置
 * 提前判定「已静止」而被直接吸附到终点，出现一次微小的跳变。
 */
const SPRING_CONFIG = {
  damping: 22,
  stiffness: 240,
  mass: 0.75,
  // 允许轻微过冲（true 会硬性截断，手感变「木」）
  overshootClamping: false,
  restDisplacementThreshold: 0.001,
  restSpeedThreshold: 0.01,
  // 跟随系统「减弱动效」无障碍开关：开启时 Reanimated 自动降级为瞬时到位
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * ── 纯缓动参数 ──────────────────────────────────────────────────────
 * cubic-bezier(0.22, 1, 0.36, 1) 即 easeOutQuint：
 * 起步极快、尾巴很长的减速曲线。
 * 折叠面板最忌讳「匀速」（linear 会像机械百叶窗）和「先慢后快」，
 * 人眼对「立刻响应 + 缓缓停住」的判断就是「顺滑」。
 * 320ms 是折叠类交互的舒适区间：<200ms 会显得生硬突兀，>400ms 开始觉得慢。
 */
const TIMING_CONFIG = {
  duration: 320,
  easing: Easing.bezier(0.22, 1, 0.36, 1),
  reduceMotion: ReduceMotion.System,
} as const;

/**
 * ── 内容自身高度变化时的补间 ─────────────────────────────────────────
 * 场景：面板已展开，里面的下拉选项异步加载完成 / 校验错误提示出现，
 * 内容高度从 240 变成 310。若直接赋值，用户会看到一次生硬跳变。
 * 这里用一段更短更朴素的缓动（220ms + easeOutQuad）平滑过去——
 * 它是「修正」而不是「主角」，所以不该比主动画更抢眼。
 */
const RESIZE_CONFIG = {
  duration: 220,
  easing: Easing.out(Easing.quad),
  reduceMotion: ReduceMotion.System,
} as const;

export const XAnimatedSearchPanel = ({
  children,
  contentHeight = 300,
  onSearch,
  onReset,
  motion = 'spring',
  defaultExpanded = false,
  onToggle,
}: XAnimatedSearchPanelProps) => {
  /**
   * progress：唯一的动画时间轴，0 = 完全收起，1 = 完全展开。
   * SharedValue 是一块 JS 与 UI 线程共享的内存，写入它不会触发 React 渲染，
   * 所以动画过程对 React 完全「透明」。
   */
  const progress = useSharedValue(defaultExpanded ? 1 : 0);

  /**
   * contentH：onLayout 量到的真实内容高度，同样放在 SharedValue 里。
   * 关键点——不要用 useState 存高度：
   * 那会让每次测量都触发一次 React 重渲染，而且 useAnimatedStyle 里
   * 读 state 需要把它作为依赖重建 worklet，得不偿失。
   */
  const contentH = useSharedValue(0);

  /**
   * 展开状态用 ref 而非 state：
   * 组件的视觉表现完全由 progress 决定，React 不需要为「展开与否」重渲染。
   * ref 只是给 toggle 逻辑做方向判断用的普通变量。
   */
  const expandedRef = useRef(defaultExpanded);
  /** 上一次量到的高度，用于去重，避免 onLayout 抖动导致反复触发补间 */
  const measuredRef = useRef(0);

  const toggle = useCallback(() => {
    // 先算目标值，再翻转 ref，顺序反了会拿到错误的方向
    const next = expandedRef.current ? 0 : 1;
    expandedRef.current = !expandedRef.current;

    /**
     * 这一行是整个组件的核心：
     * 只要给 progress 赋一个 withSpring/withTiming 包装的值，
     * Reanimated 就会在 UI 线程按帧推进它，所有依赖它的
     * useAnimatedStyle 自动重算。
     *
     * 打断行为天然正确：连点时新动画会从**当前中间值和当前速度**继续，
     * 而不是从 0/1 重新开始——这就是不会出现「跳一下再动」的原因。
     */
    progress.value = motion === 'timing' ? withTiming(next, TIMING_CONFIG) : withSpring(next, SPRING_CONFIG);

    onToggle?.(expandedRef.current);
  }, [motion, onToggle, progress]);

  const onContentLayout = useCallback(
    (e: LayoutChangeEvent) => {
      // 取整：亚像素高度会让去重判断永远不相等，从而反复触发补间
      const h = Math.round(e.nativeEvent.layout.height);
      // h <= 0 是布局过程中的中间态（例如父容器高度为 0 时），直接丢弃
      if (h <= 0 || h === measuredRef.current) return;

      const isFirstMeasure = measuredRef.current === 0;
      measuredRef.current = h;

      /**
       * 两种赋值策略：
       *  - 首次测量 或 当前是收起态：用户看不见这层内容，直接硬赋值，
       *    省掉一次无意义的动画（也避免首帧出现一次「自己长出来」的动作）；
       *  - 已展开状态下高度变了：走 RESIZE_CONFIG 补间，避免跳变。
       */
      if (isFirstMeasure || !expandedRef.current) {
        contentH.value = h;
      } else {
        contentH.value = withTiming(h, RESIZE_CONFIG);
      }
    },
    [contentH],
  );

  /**
   * ── 派生样式 1：容器高度 ──────────────────────────────────────────
   * useAnimatedStyle 的回调是一个 worklet：它被编译后直接在 UI 线程执行，
   * 每帧读取 SharedValue 并返回样式对象，然后由原生侧直接改视图属性，
   * 完全不经过 JS 线程和 React 的 diff。
   *
   * Math.max(0, ...)：spring 欠阻尼在收起方向会短暂冲到负值，
   * 负高度在 Android 上会报警告/表现异常，这里 clamp 住，
   * 保证收起只有减速、不会「反向溢出」。
   *
   * contentH.value || contentHeight：真实高度还没量到时退回兜底值。
   */
  const bodyStyle = useAnimatedStyle(() => {
    const target = contentH.value || contentHeight;
    return {height: Math.max(0, progress.value * target)};
  });

  /**
   * ── 派生样式 2：内容淡入 + 轻微下滑 ───────────────────────────────
   * 只做高度变化会像「拉幕布」，因为内容是被裁切出来的，缺少自身的运动。
   * 叠一层 opacity + translateY 之后，内容像是「跟着容器一起落下来」，
   * 层次感来自这两条曲线的时间差（错峰，staggering）：
   *
   *   opacity   在 progress 0.12~0.7 之间完成 → 容器先开一点点，内容才开始显现
   *   translateY 在 0~1 全程从 -14 走到 0     → 位移贯穿整段，收尾最平缓
   *
   * Extrapolation.CLAMP：超出输入区间时保持端点值，
   * 否则 spring 过冲到 1.03 时 opacity 会被线性外推成 >1（部分平台异常）。
   */
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.12, 0.7], [0, 1], Extrapolation.CLAMP),
    transform: [{translateY: interpolate(progress.value, [0, 1], [-14, 0], Extrapolation.CLAMP)}],
  }));

  /**
   * ── 派生样式 3：箭头旋转 ──────────────────────────────────────────
   * 直接线性映射到 0~180deg。它和高度共享同一 progress，
   * 所以弹簧的回弹也会同步体现在箭头上——这种「一起动、一起停」
   * 的一致性是廉价但极有效的高级感来源。
   */
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${progress.value * 180}deg`}],
  }));

  /**
   * ── 派生样式 4/5：标题文案交叉淡入（cross-fade）────────────────────
   * 「展开搜索 / 收起搜索」两段文字**同时存在**，用绝对定位叠在一起，
   * 靠透明度和位移交替出没，而不是 progress > 0.5 ? A : B 的条件渲染。
   *
   * 为什么不用条件渲染：那会在中途产生一次 React 重渲染 + 文字节点增删，
   * 视觉上是硬切换，且会让这一帧比其他帧更耗时（掉帧就发生在这一帧）。
   *
   * 两段区间刻意不重叠（0~0.45 与 0.55~1），中间留出 0.1 的空档，
   * 避免两行字同时半透明地重影在一起。
   */
  const expandTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.45], [1, 0], Extrapolation.CLAMP),
    transform: [{translateY: interpolate(progress.value, [0, 0.45], [0, -8], Extrapolation.CLAMP)}],
  }));

  const collapseTextStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0.55, 1], [0, 1], Extrapolation.CLAMP),
    transform: [{translateY: interpolate(progress.value, [0.55, 1], [8, 0], Extrapolation.CLAMP)}],
  }));

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.searchHeader} onPress={toggle} activeOpacity={0.7}>
        {/* titleWrap 固定宽高：里面两层是 absolute，脱离文档流后父容器会塌陷，
            固定尺寸能防止标题区在动画中抖动、也避免 header 高度跟着变 */}
        <View style={styles.titleWrap}>
          <Animated.View style={[styles.titleLayer, expandTextStyle]}>
            <Text style={styles.searchTitle}>展开搜索</Text>
          </Animated.View>
          <Animated.View style={[styles.titleLayer, collapseTextStyle]}>
            <Text style={styles.searchTitle}>收起搜索</Text>
          </Animated.View>
        </View>
        <Animated.View style={iconStyle}>
          <AntDesign name='down' size={20} color={xTheme.colorText} />
        </Animated.View>
      </TouchableOpacity>

      {/**
       * 这里有两个容易踩的 Android 坑：
       *
       * 1. overflow: 'hidden' 必须写在**静态** StyleSheet 里。
       *    从 animatedStyle 下发的动态 overflow 在 Android 上裁剪不可靠，
       *    会出现内容溢出到 header 外面的闪现。
       *
       * 2. collapsable={false}：Android 的 RN 会把「没有自身绘制内容」的
       *    View 层级折叠掉以优化渲染。这层容器只负责裁剪，正好符合被折叠的
       *    特征，一旦被折叠，height + overflow 就失效了。
       *
       * 结构上分成两层也是刻意的：
       *   外层 Animated.View 负责「高度 + 裁剪」；
       *   内层 Animated.View 负责「透明度 + 位移」。
       * 合成一层会导致 transform 参与父级的裁剪计算，出现内容被切掉一截。
       */}
      <Animated.View style={[styles.body, bodyStyle]} collapsable={false}>
        <Animated.View style={contentStyle}>
          {/* onLayout 挂在最内层的普通 View 上：
              它的高度不受动画影响，永远等于内容的自然高度，
              这才是我们要量的目标值。挂在带动画的层上会量到中间态。 */}
          <View onLayout={onContentLayout}>
            {children}

            <View style={styles.searchButtons}>
              <TouchableOpacity style={[styles.searchButton, styles.resetButton]} onPress={onReset} activeOpacity={0.7}>
                <Text style={styles.resetButtonText}>重置</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchButton, styles.submitButton]} onPress={onSearch} activeOpacity={0.7}>
                <Text style={styles.submitButtonText}>搜索</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/**
 * 样式取值约定（同 X-Components 其他组件）：
 * 颜色 / 圆角 / 字号一律从 xTheme 取，组件内不写死色值；
 * 仅阴影基色是纯黑中性值，theme 中无对应 token，故保留字面量。
 */
const styles = StyleSheet.create({
  card: {
    backgroundColor: xTheme.colorBgContainer,
    borderRadius: xTheme.borderRadiusXL,
    marginHorizontal: 12,
    paddingHorizontal: 12,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },

  searchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  /** 给交叉淡入的两层文案撑出固定尺寸，见 JSX 注释 */
  titleWrap: {
    width: 100,
    height: 22,
    justifyContent: 'center',
  },
  titleLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  searchTitle: {
    fontSize: xTheme.fontSizeLG,
    width: 100,
    fontWeight: '500',
    color: xTheme.colorText,
  },

  /** overflow 静态声明，动画只改 height —— 这是折叠效果的实现基础 */
  body: {
    overflow: 'hidden',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  searchLabel: {
    width: 80,
    fontSize: xTheme.fontSize,
    color: xTheme.colorTextSecondary,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: xTheme.colorBorder,
    borderRadius: xTheme.borderRadiusSM,
    paddingHorizontal: 12,
    paddingVertical: 2,
    fontSize: xTheme.fontSize,
  },
  dateText: {
    fontSize: xTheme.fontSize,
    lineHeight: 34,
    color: xTheme.colorText,
  },
  placeholderText: {
    lineHeight: 34,
    fontSize: xTheme.fontSize,
    color: xTheme.colorTextTertiary,
  },
  searchButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginVertical: 16,
  },
  searchButton: {
    paddingHorizontal: 24,
    height: xTheme.controlHeightSM,
    borderRadius: xTheme.borderRadiusSM,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  resetButton: {
    borderWidth: 1,
    borderColor: xTheme.colorPrimary,
    backgroundColor: xTheme.colorBgContainer,
  },
  resetButtonText: {
    color: xTheme.colorPrimary,
    fontSize: xTheme.fontSize,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: xTheme.colorPrimary,
  },
  submitButtonText: {
    color: xTheme.colorTextLightSolid,
    fontSize: xTheme.fontSize,
    fontWeight: '500',
  },
});

export type {XAnimatedSearchPanelProps};
export default XAnimatedSearchPanel;
