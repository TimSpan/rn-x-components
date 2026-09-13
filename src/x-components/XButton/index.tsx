/**
 * ============================================================================
 * XButton —— 对标 antd Button（RN 自实现版）
 * ============================================================================
 *
 * 支持的 antd API：
 * - type: primary | default | ghost | dashed | link | text
 * - danger: 语义色变为错误红
 * - size: large | middle | small
 * - block: 撑满父容器宽度
 * - loading: 加载态（自动禁用 + 显示转圈）
 * - icon: 前置图标节点
 * - shape: default | round | circle（circle 一般配合 icon-only 使用）
 * - onPress / disabled / style / textStyle
 *
 * 与 antd 的差异（RN 环境限制，有意为之）：
 * - dashed 在 Android 上圆角+虚线组合会退化为实线（RN 已知行为），视觉上仍保留虚线
 * - 无 hover 态，按压反馈统一用透明度变化（对标 antd 的 active 态）
 */
import React from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, TextStyle, View, ViewStyle, StyleProp} from 'react-native';
import {useXTheme, xTheme} from '../theme';

export type XButtonType = 'primary' | 'default' | 'ghost' | 'dashed' | 'link' | 'text';
export type XButtonSize = 'large' | 'middle' | 'small';
export type XButtonShape = 'default' | 'round' | 'circle';

export interface XButtonProps {
  type?: XButtonType;
  size?: XButtonSize;
  danger?: boolean;
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  shape?: XButtonShape;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  /** 覆盖文字样式（一般只用来调字号/加粗，颜色跟随 type 自动算） */
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/** 尺寸相关样式：高度、左右内边距、字号、圆角基准 */
function useSizeStyles(size: XButtonSize, shape: XButtonShape) {
  switch (size) {
    case 'large':
      return {
        height: xTheme.controlHeightLG,
        paddingHorizontal: shape === 'circle' ? 0 : 18,
        fontSize: xTheme.fontSizeLG,
        radius: shape === 'round' || shape === 'circle' ? xTheme.controlHeightLG / 2 : xTheme.borderRadius,
      };
    case 'small':
      return {
        height: xTheme.controlHeightSM,
        paddingHorizontal: shape === 'circle' ? 0 : 10,
        fontSize: xTheme.fontSizeSM,
        radius: shape === 'round' || shape === 'circle' ? xTheme.controlHeightSM / 2 : xTheme.borderRadius,
      };
    default:
      return {
        height: xTheme.controlHeight,
        paddingHorizontal: shape === 'circle' ? 0 : 14,
        fontSize: xTheme.fontSize,
        radius: shape === 'round' || shape === 'circle' ? xTheme.controlHeight / 2 : xTheme.borderRadius,
      };
  }
}

export function XButton({
  type = 'default',
  size = 'middle',
  danger = false,
  block = false,
  loading = false,
  disabled = false,
  icon,
  shape = 'default',
  onPress,
  onPressIn,
  onPressOut,
  children,
  style,
  textStyle,
  testID,
}: XButtonProps) {
  const t = useXTheme();
  const s = useSizeStyles(size, shape);
  // 语义基准色：danger 用错误红，否则用主色
  const baseColor = danger ? t.colorError : t.colorPrimary;

  const isFilled = type === 'primary'; // 只有 primary 是实底
  const isTextLike = type === 'link' || type === 'text'; // 无边框无底
  const isGhostOrDashed = type === 'ghost' || type === 'dashed'; // 透明底 + 描边

  // ---- 按 type × disabled 组合算出底色 / 文字色 / 边框色 ----
  let backgroundColor: string = t.colorBgContainer;
  let textColor: string = t.colorText;
  let borderColor: string | undefined = t.colorBorder;

  if (isFilled) {
    backgroundColor = baseColor;
    textColor = t.colorTextLightSolid;
    borderColor = undefined;
  } else if (isGhostOrDashed) {
    backgroundColor = 'transparent';
    textColor = baseColor;
    borderColor = baseColor;
  } else if (isTextLike) {
    backgroundColor = 'transparent';
    textColor = baseColor;
    borderColor = undefined;
  }

  // 禁用/加载态统一压成灰（antd 规则：禁用后不区分 danger/type，统一样式）
  const inert = disabled || loading;
  if (inert) {
    if (isFilled) {
      backgroundColor = t.colorPrimaryDisabled;
      textColor = t.colorTextLightSolid;
    } else {
      backgroundColor = isTextLike ? 'transparent' : t.colorBgContainerDisabled;
      textColor = t.colorTextQuaternary;
      borderColor = isTextLike ? undefined : t.colorBorder;
    }
  }

  // link 类型下划线：用 Text 的 textDecorationLine 实现
  const underline = type === 'link' && !inert;

  /**
   * 纯文本 children 判定：字符串 / 数字 / 纯字符串数组都算。
   * JSX 里写 `确定{cond ? '（2）' : ''}` 会生成字符串数组——若不包 <Text>
   * 直接丢给 Pressable（View），RN 会报
   * "Text strings must be rendered within a <Text> component"。
   */
  const isPlainChildren =
    typeof children === 'string' ||
    typeof children === 'number' ||
    (Array.isArray(children) && children.every(c => typeof c === 'string' || typeof c === 'number'));

  const content = (
    <>
      {loading && (
        <ActivityIndicator size='small' color={isFilled ? t.colorTextLightSolid : baseColor} style={styles.spinner} />
      )}
      {/* 非 loading 时也保留占位，避免 loading 切换时文字抖动 */}
      {!loading && icon != null && <View style={styles.iconWrap}>{icon}</View>}
      {isPlainChildren ? (
        <Text
          style={[
            {fontSize: s.fontSize, color: textColor, fontWeight: isFilled ? '600' : '400'},
            underline && {textDecorationLine: 'underline'},
            textStyle,
          ]}
          allowFontScaling={false}
        >
          {children}
        </Text>
      ) : (
        children
      )}
    </>
  );

  const borderRadius = shape === 'circle' ? s.height / 2 : s.radius;

  return (
    <Pressable
      testID={testID}
      disabled={inert}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({pressed}) => [
        styles.base,
        {
          height: s.height,
          paddingHorizontal: s.paddingHorizontal,
          borderRadius,
          backgroundColor,
          borderColor,
          borderWidth: isTextLike ? 0 : StyleSheet.hairlineWidth * 2,
        },
        type === 'dashed' && !inert && {borderStyle: 'dashed'},
        block && styles.block,
        pressed && !inert && styles.pressed,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  block: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.75,
  },
  spinner: {
    marginRight: 6,
  },
  iconWrap: {
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default XButton;
