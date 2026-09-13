/**
 * ============================================================================
 * XChart —— 轻量图表三件套（react-native-svg 自研）
 * ============================================================================
 *
 * 【方案定位】用户选定方案：基于项目已有 react-native-svg 自研，
 * 不引第三方图表库 —— 体积小、无原生依赖、token 与 XTheme 完全一致。
 * 覆盖最常用三类：
 *   - XLineChart  折线/面积图（平滑曲线、网格线、数据点）
 *   - XBarChart   柱状图（圆角柱、逐柱配色、顶部数值）
 *   - XPieChart   饼图/环形图（donut、中心文案、图例）
 *
 * 【实现约定】
 * - 宽度 onLayout 实测（不写死，适配容器），高度 props 指定；
 * - 颜色默认取 useXTheme() token，可逐项覆盖；
 * - 纯声明式渲染，数据变化即重绘（SVG 无动画库依赖，入场动画后续版本可加）。
 * ============================================================================
 */

import React, {useCallback, useState} from 'react';
import {LayoutChangeEvent, StyleSheet, Text, View, ViewStyle, StyleProp} from 'react-native';
import Svg, {Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText} from 'react-native-svg';
import {useXTheme, XTheme} from '../theme';

/** 默认分类色板（主色打头，暗黑下同样可读） */
function palette(t: XTheme): string[] {
  return [t.colorPrimary, t.colorSuccess, t.colorWarning, t.colorError, '#8C8CFF', '#36CFC9', '#FF9C6E', '#5CDBD3'];
}

/** 宽度自测量 Hook */
function useChartWidth() {
  const [width, setWidth] = useState(0);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setWidth(prev => (prev === w ? prev : w));
  }, []);
  return {width, onLayout};
}

// ---------------------------------------------------------------------------
// XLineChart 折线/面积图
// ---------------------------------------------------------------------------

export interface XLineChartProps {
  /** 数值序列 */
  data: number[];
  /** x 轴标签（可与 data 等长，超出抽样显示） */
  labels?: string[];
  height?: number;
  /** 线色，默认 colorPrimary */
  color?: string;
  /** 面积填充（渐变到透明），默认 false */
  area?: boolean;
  /** 平滑曲线，默认 true */
  smooth?: boolean;
  /** 水平网格线条数，默认 4（0 关闭） */
  grid?: number;
  /** 数据点上方显示数值，默认 false */
  showValues?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function XLineChart({
  data,
  labels,
  height = 220,
  color,
  area = false,
  smooth = true,
  grid = 4,
  showValues = false,
  style,
}: XLineChartProps) {
  const t = useXTheme();
  const {width, onLayout} = useChartWidth();
  const lineColor = color ?? t.colorPrimary;

  const PAD = {l: 34, r: 12, tt: 14, b: 26};
  const innerW = Math.max(0, width - PAD.l - PAD.r);
  const innerH = Math.max(0, height - PAD.tt - PAD.b);

  const maxV = Math.max(...data, 1);
  const n = data.length;

  /** 数值 → 坐标 */
  const pt = (i: number, v: number) => ({
    x: n <= 1 ? PAD.l + innerW / 2 : PAD.l + (innerW * i) / (n - 1),
    y: PAD.tt + innerH - (v / (maxV * 1.1)) * innerH,
  });
  const points = data.map((v, i) => pt(i, v));

  /** 平滑路径：中点三次贝塞尔（视觉平滑且不过冲） */
  const linePath = (() => {
    if (points.length === 0) return '';
    const d = [`M ${points[0].x} ${points[0].y}`];
    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];
      if (smooth) {
        const mx = (p0.x + p1.x) / 2;
        d.push(`C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`);
      } else {
        d.push(`L ${p1.x} ${p1.y}`);
      }
    }
    return d.join(' ');
  })();

  const baselineY = PAD.tt + innerH;
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : '';

  const labelStep = Math.ceil((labels?.length ?? 0) / 6);

  return (
    <View style={style} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {area && (
            <Defs>
              <LinearGradient id='xLineArea' x1='0' y1='0' x2='0' y2='1'>
                <Stop offset='0' stopColor={lineColor} stopOpacity={0.25} />
                <Stop offset='1' stopColor={lineColor} stopOpacity={0} />
              </LinearGradient>
            </Defs>
          )}
          {/* 网格 + y 轴刻度 */}
          {Array.from({length: grid + 1}, (_, i) => {
            const ratio = i / grid;
            const y = PAD.tt + innerH * (1 - ratio);
            const value = Math.round(maxV * 1.1 * ratio);
            return (
              <React.Fragment key={i}>
                <Line x1={PAD.l} y1={y} x2={width - PAD.r} y2={y} stroke={t.colorSplit} strokeWidth={1} />
                <SvgText x={PAD.l - 6} y={y + 4} fontSize={10} fill={t.colorTextTertiary} textAnchor='end'>
                  {value}
                </SvgText>
              </React.Fragment>
            );
          })}
          {/* 面积 */}
          {area && areaPath ? <Path d={areaPath} fill='url(#xLineArea)' /> : null}
          {/* 折线 */}
          <Path d={linePath} fill='none' stroke={lineColor} strokeWidth={2.5} strokeLinecap='round' />
          {/* 数据点 + 数值 */}
          {points.map((p, i) => (
            <React.Fragment key={i}>
              <Circle cx={p.x} cy={p.y} r={3.5} fill={t.colorBgContainer} stroke={lineColor} strokeWidth={2} />
              {showValues && (
                <SvgText x={p.x} y={p.y - 8} fontSize={10} fill={t.colorTextSecondary} textAnchor='middle'>
                  {data[i]}
                </SvgText>
              )}
            </React.Fragment>
          ))}
          {/* x 轴标签 */}
          {labels?.map((label, i) =>
            i % labelStep === 0 || i === labels.length - 1 ? (
              <SvgText key={i} x={points[i]?.x ?? 0} y={height - 8} fontSize={10} fill={t.colorTextTertiary} textAnchor='middle'>
                {label}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// XBarChart 柱状图
// ---------------------------------------------------------------------------

export interface XBarChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface XBarChartProps {
  data: XBarChartItem[];
  height?: number;
  /** 柱宽占比（0~1），默认 0.5 */
  barWidthRatio?: number;
  /** 顶部显示数值，默认 true */
  showValues?: boolean;
  grid?: number;
  style?: StyleProp<ViewStyle>;
}

export function XBarChart({data, height = 220, barWidthRatio = 0.5, showValues = true, grid = 4, style}: XBarChartProps) {
  const t = useXTheme();
  const {width, onLayout} = useChartWidth();
  const colors = palette(t);

  const PAD = {l: 34, r: 12, tt: 20, b: 26};
  const innerW = Math.max(0, width - PAD.l - PAD.r);
  const innerH = Math.max(0, height - PAD.tt - PAD.b);
  const maxV = Math.max(...data.map(d => d.value), 1);
  const band = data.length ? innerW / data.length : 0;
  const barW = Math.min(band * barWidthRatio, 40);

  return (
    <View style={style} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height}>
          {Array.from({length: grid + 1}, (_, i) => {
            const ratio = i / grid;
            const y = PAD.tt + innerH * (1 - ratio);
            return (
              <React.Fragment key={i}>
                <Line x1={PAD.l} y1={y} x2={width - PAD.r} y2={y} stroke={t.colorSplit} strokeWidth={1} />
                <SvgText x={PAD.l - 6} y={y + 4} fontSize={10} fill={t.colorTextTertiary} textAnchor='end'>
                  {Math.round(maxV * 1.1 * ratio)}
                </SvgText>
              </React.Fragment>
            );
          })}
          {data.map((item, i) => {
            const h = (item.value / (maxV * 1.1)) * innerH;
            const x = PAD.l + band * i + (band - barW) / 2;
            const y = PAD.tt + innerH - h;
            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={barW} height={Math.max(h, 2)} rx={3} fill={item.color ?? t.colorPrimary} />
                {showValues && (
                  <SvgText x={x + barW / 2} y={y - 6} fontSize={10} fill={t.colorTextSecondary} textAnchor='middle'>
                    {item.value}
                  </SvgText>
                )}
                <SvgText x={x + barW / 2} y={height - 8} fontSize={10} fill={t.colorTextTertiary} textAnchor='middle'>
                  {item.label}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// XPieChart 饼图/环形图
// ---------------------------------------------------------------------------

export interface XPieChartItem {
  label: string;
  value: number;
  color?: string;
}

export interface XPieChartProps {
  data: XPieChartItem[];
  height?: number;
  /** 环形（donut），默认 true */
  donut?: boolean;
  /** 环心文案 */
  centerLabel?: string;
  /** 图例，默认显示 */
  legend?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** 极坐标 → 直角坐标 */
const polar = (cx: number, cy: number, r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad)};
};

/** 扇形路径（含 donut 内弧） */
function slicePath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) {
  const large = endDeg - startDeg > 180 ? 1 : 0;
  const p1 = polar(cx, cy, rOuter, startDeg);
  const p2 = polar(cx, cy, rOuter, endDeg);
  if (rInner <= 0) {
    return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
  }
  const p3 = polar(cx, cy, rInner, endDeg);
  const p4 = polar(cx, cy, rInner, startDeg);
  return `M ${p1.x} ${p1.y} A ${rOuter} ${rOuter} 0 ${large} 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${rInner} ${rInner} 0 ${large} 0 ${p4.x} ${p4.y} Z`;
}

export function XPieChart({data, height = 220, donut = true, centerLabel, legend = true, style}: XPieChartProps) {
  const t = useXTheme();
  const {width, onLayout} = useChartWidth();
  const colors = palette(t);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const size = Math.min(width || height, height) - 8;
  const cx = (width || size) / 2;
  const cy = height / 2;
  const rOuter = size / 2;
  const rInner = donut ? rOuter * 0.62 : 0;

  /** 求各扇区起止角 */
  let acc = 0;
  const slices = data.map((item, i) => {
    const startDeg = (acc / total) * 360;
    acc += item.value;
    const endDeg = (acc / total) * 360;
    return {...item, color: item.color ?? colors[i % colors.length], startDeg, endDeg};
  });

  return (
    <View style={style} onLayout={onLayout}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            {slices.map((s, i) => (
              <Path key={i} d={slicePath(cx, cy, rOuter, rInner, s.startDeg, s.endDeg)} fill={s.color} />
            ))}
            {donut && centerLabel ? (
              <SvgText x={cx} y={cy + 5} fontSize={13} fontWeight='600' fill={t.colorText} textAnchor='middle'>
                {centerLabel}
              </SvgText>
            ) : null}
          </Svg>
          {legend && (
            <View style={styles.legend}>
              {slices.map((s, i) => (
                <View key={i} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: s.color}]} />
                  <Text style={[styles.legendText, {color: t.colorTextSecondary}]}>
                    {s.label} {Math.round((s.value / total) * 100)}%
                  </Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
});

export default {XLineChart, XBarChart, XPieChart};
