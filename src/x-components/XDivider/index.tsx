/**
 * ============================================================================
 * XDivider —— 对标 antd Divider
 * ============================================================================
 *
 * 支持的 antd API：
 * - type: 'horizontal' | 'vertical'
 * - dashed: 虚线（RN 实现方式：0 高度 + dashed 上边框，Android 上虚线密度固定，视觉近似）
 * - orientation: 'left' | 'center' | 'right'（带 children 标题时分隔线的断开位置）
 * - orientationMargin: 标题距屏幕边缘的距离（number，RN 无 '%' margin 字符串场景，仅收 number）
 * - plain: 标题弱化样式（更浅的文字色）
 * - children: 标题内容（如 <XDivider>标题</XDivider>）
 *
 * 与 antd 的差异：
 * - orientationMargin 的 'xx%' 字符串不支持，只收 number
 */
import React from 'react';
import {StyleSheet, View, StyleProp, ViewStyle, Text} from 'react-native';

import {xTheme} from '../theme';

export interface XDividerProps {
  type?: 'horizontal' | 'vertical';
  dashed?: boolean;
  orientation?: 'left' | 'center' | 'right';
  orientationMargin?: number;
  plain?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 分隔线颜色，默认 colorSplit */
  color?: string;
  /** vertical 模式的高度，默认撑满（alignSelf: 'stretch'） */
  height?: number;
}

export function XDivider({
  type = 'horizontal',
  dashed = false,
  orientation = 'center',
  orientationMargin,
  plain = false,
  children,
  style,
  color = xTheme.colorSplit,
  height,
}: XDividerProps) {
  // ---- 垂直分隔线：一条竖线，宽度 hairline，高度默认跟随父容器拉伸 ----
  if (type === 'vertical') {
    return (
      <View
        style={[
          {
            width: StyleSheet.hairlineWidth,
            height: height,
            alignSelf: height ? 'center' : 'stretch',
            backgroundColor: color,
            marginHorizontal: 8,
          },
          style,
        ]}
      />
    );
  }

  // ---- 水平分隔线（无标题）：一条横线 ----
  if (children == null) {
    return (
      <View
        style={[
          styles.line,
          {backgroundColor: dashed ? 'transparent' : color},
          dashed && {borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: color, borderStyle: 'dashed'},
          style,
        ]}
      />
    );
  }

  // ---- 水平带标题：线 — 标题 — 线，orientation 决定标题位置 ----
  const hasLeftLine = orientation !== 'left';
  const hasRightLine = orientation !== 'right';

  // orientationMargin 生效规则（同 antd）：left 时约束左侧留白，right 时约束右侧留白
  const leftMargin = orientation === 'left' ? orientationMargin ?? 16 : undefined;
  const rightMargin = orientation === 'right' ? orientationMargin ?? 16 : undefined;

  const lineStyle: StyleProp<ViewStyle> = [
    styles.line,
    styles.titleLine,
    {backgroundColor: dashed ? 'transparent' : color},
    dashed && {borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: color, borderStyle: 'dashed'},
  ];

  return (
    <View style={[styles.titleContainer, {marginLeft: leftMargin, marginRight: rightMargin}, style]}>
      {hasLeftLine && <View style={lineStyle} />}
      <Text style={[styles.title, plain && styles.titlePlain]} allowFontScaling={false}>
        {children}
      </Text>
      {hasRightLine && <View style={lineStyle} />}
    </View>
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  titleLine: {
    flex: 1,
  },
  title: {
    fontSize: xTheme.fontSize,
    color: xTheme.colorText,
    marginHorizontal: 12,
  },
  /** plain：标题弱化（antd 同款：更浅的文字色） */
  titlePlain: {
    color: xTheme.colorTextTertiary,
    fontSize: xTheme.fontSizeSM,
  },
});

export default XDivider;
