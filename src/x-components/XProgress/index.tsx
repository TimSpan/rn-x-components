/**
 * ============================================================================
 * XProgress —— 对标 antd Progress（RN 自实现版）
 * ============================================================================
 *
 * 支持的 antd API：
 * - type: 'line' | 'circle' | 'dashboard'
 * - percent / showInfo / format(percent) 自定义文案
 * - status: 'success' | 'exception' | 'normal' | 'active'
 * - strokeColor: 纯色 或 {from, to} 渐变（line 用 LinearGradient，circle 用 SVG 渐变）
 * - trailColor / strokeWidth
 * - success: {percent, strokeColor} —— line 形态下的已完成成功段（绿色前置段）
 * - size: circle/dashboard 的直径（antd 老 API 叫 width，这里 size 即 width）
 *
 * 与 antd 的差异：
 * - status='active' 的流光动画未实现（颜色按 normal 处理），其余行为一致
 * - percent 超过 100：进度条封顶 100%，文案显示真实值（同 antd）
 * - circle 满进度/成功态的 ✓、异常态的 ✕ 用 SVG Path 画（几何居中），不依赖图标字体
 */
import React, {useEffect, useId, useRef, useState} from 'react';
import {Animated, StyleSheet, View, StyleProp, TextStyle, ViewStyle, Text} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, {Circle, Circle as SvgCircle, Defs, LinearGradient as SvgLinearGradient, Path, Stop} from 'react-native-svg';

import {xTheme} from '../theme';

export interface XProgressProps {
  type?: 'line' | 'circle' | 'dashboard';
  /** 0-100；超出封顶显示 */
  percent?: number;
  showInfo?: boolean;
  status?: 'success' | 'exception' | 'normal' | 'active';
  /** 纯色或渐变 {from, to} */
  strokeColor?: string | {from: string; to: string};
  trailColor?: string;
  /** line 默认 8，circle 默认 6 */
  strokeWidth?: number;
  /** circle/dashboard 直径，默认 120 */
  size?: number;
  /** line 形态的成功段 */
  success?: {percent?: number; strokeColor?: string};
  /** 自定义文案，返回 null 可隐藏（配合 showInfo） */
  format?: (percent?: number) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** 把 strokeColor 归一化成 {from, to} */
function normalizeGradient(color?: string | {from: string; to: string}): {from: string; to: string} | null {
  if (!color) return null;
  if (typeof color === 'string') return null; // 字符串走纯色逻辑
  return color;
}

/**
 * 数字过渡动画 hook：percent 变化时从当前值平滑过渡到目标值，
 * 每帧 setState 驱动重渲染（circle 的 strokeDashoffset 需要 JS 侧值）。
 */
function useAnimatedPercent(percent: number, animate = true): number {
  const [display, setDisplay] = useState(animate ? 0 : percent);
  const current = useRef(display);

  useEffect(() => {
    if (!animate) {
      current.current = percent;
      setDisplay(percent);
      return;
    }
    const value = new Animated.Value(current.current);
    const listener = value.addListener(({value: v}) => {
      current.current = v;
      setDisplay(v);
    });
    const timing = Animated.timing(value, {
      toValue: percent,
      duration: xTheme.motionDurationMid * 3,
      useNativeDriver: false, // 要驱动 setState，不能走 native
    });
    timing.start(({finished}) => {
      if (finished) value.removeListener(listener);
    });
    // 卸载时停掉动画，避免 setState after unmount
    return () => {
      timing.stop();
      value.removeListener(listener);
    };
  }, [percent, animate]);

  return display;
}

export function XProgress({
  type = 'line',
  percent = 0,
  showInfo = true,
  status = 'normal',
  strokeColor,
  trailColor,
  strokeWidth,
  success,
  format,
  size = 120,
  style,
  testID,
}: XProgressProps) {
  // 状态色：exception 红 / success 绿 / 其余主色（active 视同 normal）
  const semanticColor = status === 'exception' ? xTheme.colorError : status === 'success' ? xTheme.colorSuccess : xTheme.colorPrimary;

  const gradient = normalizeGradient(strokeColor);
  // antd 规则：渐变模式下状态色不覆盖（strokeColor 优先级高于 status）
  const solidColor = typeof strokeColor === 'string' ? strokeColor : semanticColor;
  const finalColor = gradient ? gradient.from : solidColor;

  // 视觉封顶 100（文案仍显示真实值）
  const clamped = Math.min(Math.max(percent, 0), 100);
  const successPercent = success?.percent ? Math.min(Math.max(success.percent, 0), 100) : 0;
  const successColor = success?.strokeColor ?? xTheme.colorSuccess;

  if (type === 'line') {
    return (
      <XLineProgress
        percent={clamped}
        successPercent={successPercent}
        successColor={successColor}
        color={finalColor}
        gradient={gradient}
        trailColor={trailColor}
        strokeWidth={strokeWidth ?? 8}
        showInfo={showInfo}
        format={format}
        percentRaw={percent}
        status={status}
        style={style}
        testID={testID}
      />
    );
  }

  return (
    <XCircleProgress
      variant={type}
      percent={clamped}
      percentRaw={percent}
      color={finalColor}
      gradient={gradient}
      trailColor={trailColor}
      strokeWidth={strokeWidth ?? 6}
      size={size}
      showInfo={showInfo}
      format={format}
      status={status}
      style={style}
      testID={testID}
    />
  );
}

// ============================================================================
// line 形态
// ============================================================================
/**
 * 信息文案渲染：format 返回的可能是纯字符串 —— RN 里 View 的字符串子节点不渲染，
 * 必须包一层 Text（antd 网页端没这个约束，这是 RN 适配点）。
 */
function renderInfo(showInfo: boolean, format: XProgressProps['format'], percentRaw: number, textStyle?: StyleProp<TextStyle>): React.ReactNode {
  if (!showInfo) return null;
  const node = format ? format(percentRaw) : `${percentRaw}%`;
  if (node === null || node === undefined) return null;
  if (typeof node === 'string' || typeof node === 'number') {
    return (
      <Text style={textStyle} allowFontScaling={false}>
        {node}
      </Text>
    );
  }
  return node;
}

interface XLineProgressProps {
  percent: number;
  percentRaw: number;
  successPercent: number;
  successColor: string;
  color: string;
  gradient: {from: string; to: string} | null;
  trailColor?: string;
  strokeWidth: number;
  showInfo: boolean;
  format?: (percent?: number) => React.ReactNode;
  status: XProgressProps['status'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function XLineProgress(props: XLineProgressProps) {
  const {percent, percentRaw, successPercent, successColor, color, gradient, trailColor, strokeWidth, showInfo, format, status, style, testID} =
    props;
  const animated = useAnimatedPercent(percent);

  /**
   * 填充宽度 = 进度百分比。不能用 flex：轨道是 column 方向，flex 控制的是
   * 主轴（竖向）尺寸，横向会被 stretch 撑满 —— 表现为进度条永远全宽。
   */
  const barStyle = {width: `${Math.max(animated, 0)}%` as const};

  const info = renderInfo(showInfo, format, percentRaw, [styles.lineInfo, status === 'exception' && {color: xTheme.colorError}]);

  return (
    <View testID={testID} style={[styles.lineRow, style]}>
      <View
        style={[
          styles.track,
          {
            height: strokeWidth,
            borderRadius: strokeWidth / 2,
            backgroundColor: trailColor ?? xTheme.colorProgressTrack,
          },
        ]}
      >
        <View style={[styles.lineFill, {flexDirection: 'row'}, barStyle]}>
          {successPercent > 0 && <View style={{flex: successPercent, backgroundColor: successColor}} />}
          {gradient ? (
            <LinearGradient
              colors={[gradient.from, gradient.to]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 0}}
              style={{flex: Math.max(animated - successPercent, 0)}}
            />
          ) : (
            <View style={{flex: Math.max(animated - successPercent, 0), backgroundColor: color}} />
          )}
        </View>
      </View>
      {info}
    </View>
  );
}

// ============================================================================
// circle / dashboard 形态
// ============================================================================
interface XCircleProgressProps {
  variant: 'circle' | 'dashboard';
  percent: number;
  percentRaw: number;
  color: string;
  gradient: {from: string; to: string} | null;
  trailColor?: string;
  strokeWidth: number;
  size: number;
  showInfo: boolean;
  format?: (percent?: number) => React.ReactNode;
  status: XProgressProps['status'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function XCircleProgress(props: XCircleProgressProps) {
  const {variant, percent, percentRaw, color, gradient, trailColor, strokeWidth, size, showInfo, format, status, style, testID} = props;
  const animated = useAnimatedPercent(percent);
  const gradientId = `xprog-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  // dashboard：上下各留 45° 缺口（antd gapDegree=75 的视觉近似值，取 45° 更圆润）
  const totalAngle = variant === 'dashboard' ? 270 : 360;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  // 参与弧长的周长比例（dashboard 只画 270°）
  const arcLength = (c * totalAngle) / 360;
  /**
   * 进度弧 = 可见弧长 + 空白补齐。不能用"全长 dash + offset 回退"的画法：
   * 360° 圆的 gap 为 0，图案退化为连续线，offset 失效 —— 表现为圆环永远满圈。
   */
  const visibleArc = arcLength * (Math.min(Math.max(animated, 0), 100) / 100);
  const strokeDasharray = `${visibleArc} ${c - visibleArc}`;
  // SVG Circle 的 dash 起点在 3 点钟；circle：-90° 把起点挪到 12 点；dashboard：135° 起点在 7:30
  // 注意：react-native-svg 的 transform 用字符串形式（对象形式支持不完整）
  const transform = `rotate(${variant === 'dashboard' ? 135 : -90}, ${size / 2}, ${size / 2})`;

  // 满圈/成功 → ✓；异常 → ✕（antd 同款行为；SVG Path 绘制，几何上绝对居中）
  const showDone = status === 'success' || (percent >= 100 && status !== 'exception');
  const showException = status === 'exception';
  const badgeColor = showDone ? xTheme.colorSuccess : xTheme.colorError;

  return (
    <View testID={testID} style={[{width: size, height: size, alignItems: 'center', justifyContent: 'center'}, style]}>
      <Svg width={size} height={size}>
        <Defs>
          {gradient && (
            <SvgLinearGradient id={gradientId} x1='0%' y1='0%' x2='100%' y2='100%'>
              <Stop offset='0%' stopColor={gradient.from} />
              <Stop offset='100%' stopColor={gradient.to} />
            </SvgLinearGradient>
          )}
        </Defs>
        {/* 轨道 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trailColor ?? xTheme.colorProgressTrack}
          strokeWidth={strokeWidth}
          fill='none'
          strokeDasharray={`${arcLength} ${c - arcLength}`}
          transform={transform}
        />
        {/* 进度弧：可见弧长随百分比伸缩 */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={gradient ? `url(#${gradientId})` : color}
          strokeWidth={strokeWidth}
          fill='none'
          strokeLinecap='round'
          strokeDasharray={strokeDasharray}
          transform={transform}
        />
      </Svg>
      {showInfo && (
        <View style={styles.infoOverlay} pointerEvents='none'>
          {showDone ? (
            <Svg width={40} height={40} viewBox='0 0 40 40'>
              <SvgCircle cx={20} cy={20} r={17.5} stroke={badgeColor} strokeWidth={2.5} fill='none' />
              <Path d='M12.5 20.5 L17.5 25.5 L27 13.5' stroke={badgeColor} strokeWidth={3} fill='none' strokeLinecap='round' strokeLinejoin='round' />
            </Svg>
          ) : showException ? (
            <Svg width={40} height={40} viewBox='0 0 40 40'>
              <SvgCircle cx={20} cy={20} r={17.5} stroke={badgeColor} strokeWidth={2.5} fill='none' />
              <Path d='M14.5 14.5 L25.5 25.5 M25.5 14.5 L14.5 25.5' stroke={badgeColor} strokeWidth={3} fill='none' strokeLinecap='round' />
            </Svg>
          ) : (
            <View style={styles.circleInfo}>{renderInfo(true, format, percentRaw, styles.circleInfoText)}</View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  track: {
    flex: 1,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  lineFill: {
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
  },
  lineInfo: {
    fontSize: xTheme.fontSize,
    color: xTheme.colorTextSecondary,
    marginLeft: 8,
    minWidth: 40,
    textAlign: 'right',
  },
  /**
   * 信息浮层：absoluteFillObject 定位到圆心区域 + 双轴居中。
   * 注意不能只用 StyleSheet.absoluteFill：绝对定位的子元素不参与父级
   * alignItems/justifyContent 布局（Yoga 行为），必须自己声明居中，
   * 否则 SVG 图标会缩在左上角。
   */
  infoOverlay: {
    ...{position: "absolute", top: 0, left: 0, right: 0, bottom: 0},
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInfo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleInfoText: {
    fontSize: xTheme.fontSizeLG,
    color: xTheme.colorText,
    fontWeight: '600',
  },
});

export default XProgress;
