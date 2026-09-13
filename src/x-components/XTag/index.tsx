/**
 * ============================================================================
 * XTag —— 对标 antd Tag（RN 自实现版），由老 components/Tag 复刻并增强
 * ============================================================================
 *
 * 支持的 antd Tag API：
 * - color: 预设色名（success/processing/error/warning/default + magenta/red/... 12 种）
 *          或自定义色值（'#f50' / '#0f0'），自动派生文字/背景/描边
 * - variant: light（antd 默认浅底彩字）| solid（实底白字，老 Tag 视觉）| outline（描边）
 * - closable + onClose: 可关闭小叉号（带 hitSlop，方便点按）
 * - icon: 前置图标节点
 * - bordered: 描边开关（light/outline 下生效，默认 true）
 * - onPress: 整体可点（按压有透明度反馈）
 * - children: 自定义内容（文本外的节点也行）
 *
 * 兼容老 Tag API（零成本迁移）：
 * - text / size(small|medium|large) / type(info|primary|success|warning|error|default)
 * - 注意：老 Tag 是实底白字，迁移时加 variant='solid' 可保持视觉不变；
 *   XTag 默认 light 是为了对齐 antd 默认观感
 *
 * 与 antd 的差异（RN 环境限制或有意取舍）：
 * - antd 无 size，RN 下保留老 Tag 的三档尺寸（字号 12/14/16）
 * - 不支持 'xxx-inverse' 色名写法，反色诉求直接用 variant='solid'
 * - 无 hover 态，按压反馈统一用透明度变化
 */
import React from 'react';
import {Pressable, StyleSheet, Text, TextStyle, View, ViewStyle, StyleProp} from 'react-native';
import AntDesign from '@react-native-vector-icons/ant-design';
import {xTheme} from '../theme';

export type XTagType = 'info' | 'primary' | 'success' | 'warning' | 'error' | 'default';
export type XTagSize = 'small' | 'medium' | 'large';
export type XTagVariant = 'light' | 'solid' | 'outline';

export interface XTagProps {
  /** 标签文本（兼容老 Tag；与 children 二选一，children 优先级更高） */
  text?: string;
  /** 语义类型（兼容老 Tag），会被 color 覆盖 */
  type?: XTagType;
  /** 尺寸（老 Tag 三档，antd 没有） */
  size?: XTagSize;
  /** 预设色名或自定义色值，优先级高于 type */
  color?: string;
  /** 视觉变体：light=浅底彩字（默认，antd 观感）/ solid=实底白字 / outline=描边 */
  variant?: XTagVariant;
  /** 是否带描边（light/outline 下生效），默认 true */
  bordered?: boolean;
  /** 胶囊圆角（shape='round' 时圆角取高度的一半） */
  shape?: 'default' | 'round';
  /** 前置图标节点 */
  icon?: React.ReactNode;
  /** 是否显示关闭叉号 */
  closable?: boolean;
  /** 关闭回调（e.preventDefault 风格不适用 RN，返回 false 不阻止隐藏，组件本身受控不隐藏） */
  onClose?: (e: any) => void;
  /** 整体点击 */
  onPress?: () => void;
  /** 自定义内容（优先级高于 text） */
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/** antd Tag 十二预设色（文档色板，magenta ~ purple） */
const PRESET_COLORS: Record<string, string> = {
  magenta: '#EB2F96',
  red: '#F5222D',
  volcano: '#FA541C',
  orange: '#FA8C16',
  gold: '#FAAD14',
  lime: '#A0D911',
  green: '#52C41A',
  cyan: '#13C2C2',
  blue: '#1677FF',
  geekblue: '#2F54EB',
  purple: '#722ED1',
};

/** 语义色（状态色名 + type 统一走这张表，值取 theme token） */
const SEMANTIC_COLORS: Record<string, {solid: string; lightBg: string}> = {
  primary: {solid: xTheme.colorPrimary, lightBg: xTheme.colorPrimaryBg},
  info: {solid: xTheme.colorPrimary, lightBg: xTheme.colorPrimaryBg},
  success: {solid: xTheme.colorSuccess, lightBg: xTheme.colorSuccessBg},
  warning: {solid: xTheme.colorWarning, lightBg: xTheme.colorWarningBg},
  error: {solid: xTheme.colorError, lightBg: xTheme.colorErrorBg},
  processing: {solid: xTheme.colorPrimary, lightBg: xTheme.colorPrimaryBg},
};

/** '#f50' / '#0f0' / '#rrggbbaa' -> rgba(alpha)，用于浅底/描边派生色 */
function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#')) {
    return color;
  }
  let hex = color.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(c => c + c)
      .join('');
  }
  if (hex.length === 8) {
    hex = hex.slice(0, 6);
  }
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/** color / type 解析成基准色（solid 色 + 浅底色），default 为灰色系 */
function resolvePalette(color?: string, type: XTagType = 'default') {
  // 1. 状态色名（antd 文档的 success/processing/...）
  const semantic = color ? SEMANTIC_COLORS[color] : undefined;
  if (semantic) {
    return {solid: semantic.solid, lightBg: semantic.lightBg, isDefault: false};
  }
  // 2. 预设色名（magenta / purple / ...）
  const preset = color ? PRESET_COLORS[color] : undefined;
  if (preset) {
    return {solid: preset, lightBg: withAlpha(preset, 0.12), isDefault: false};
  }
  // 3. 自定义色值（# 开头）
  if (color && color.startsWith('#')) {
    return {solid: color, lightBg: withAlpha(color, 0.12), isDefault: false};
  }
  // 4. type 语义（兼容老 Tag；default 走灰系）
  const byType = SEMANTIC_COLORS[type];
  if (byType) {
    return {solid: byType.solid, lightBg: byType.lightBg, isDefault: false};
  }
  return {solid: xTheme.colorTextSecondary, lightBg: 'rgba(0, 0, 0, 0.06)', isDefault: true};
}

const SIZE_STYLES: Record<XTagSize, {fontSize: number; paddingH: number; paddingV: number; radius: number; iconSize: number}> = {
  small: {fontSize: xTheme.fontSizeSM, paddingH: 6, paddingV: 1, radius: xTheme.borderRadiusSM, iconSize: 10},
  medium: {fontSize: xTheme.fontSize, paddingH: 8, paddingV: 2, radius: xTheme.borderRadiusSM, iconSize: 12},
  large: {fontSize: xTheme.fontSizeLG, paddingH: 10, paddingV: 4, radius: xTheme.borderRadius, iconSize: 14},
};

export function XTag({
  text,
  type = 'default',
  size = 'medium',
  color,
  variant = 'light',
  bordered = true,
  shape = 'default',
  icon,
  closable = false,
  onClose,
  onPress,
  children,
  style,
  textStyle,
  testID,
}: XTagProps) {
  const sizeStyle = SIZE_STYLES[size];
  const palette = resolvePalette(color, type);
  const content = children ?? text;

  // 老组件行为：无文本不渲染（这里放宽为 icon/children 也算内容）
  if (content === undefined || content === null || content === '') {
    if (!icon) {
      return null;
    }
  }

  // --- 按 variant 派生背景 / 文字 / 描边 ---
  let backgroundColor: string = 'transparent';
  let textColor: string = palette.solid;
  let borderColor: string = 'transparent';
  let borderWidth = 0;

  if (variant === 'solid') {
    backgroundColor = palette.solid;
    textColor = palette.isDefault ? xTheme.colorText : xTheme.colorTextLightSolid;
  } else if (variant === 'outline') {
    borderColor = bordered ? palette.solid : 'transparent';
    borderWidth = bordered ? 1 : 0;
  } else {
    // light（默认）
    backgroundColor = palette.lightBg;
    borderColor = bordered ? withAlpha(palette.solid, 0.3) : 'transparent';
    borderWidth = bordered ? 1 : 0;
  }

  const borderRadius =
    shape === 'round'
      ? sizeStyle.fontSize / 2 + sizeStyle.paddingV + (variant === 'solid' ? 0 : borderWidth) // 近似胶囊
      : sizeStyle.radius;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor,
      borderColor,
      borderWidth,
      borderRadius,
      paddingHorizontal: sizeStyle.paddingH,
      paddingVertical: sizeStyle.paddingV,
    },
    style,
  ];

  const label = (
    <View style={styles.content}>
      {icon}
      <Text style={[{fontSize: sizeStyle.fontSize, color: textColor, fontWeight: '500'}, textStyle]}>
        {content}
      </Text>
    </View>
  );

  const body = closable ? (
    <View style={styles.content}>
      {label}
      <Pressable
        hitSlop={{top: 6, right: 6, bottom: 6, left: 6}}
        onPress={e => onClose?.(e)}
        style={({pressed}) => [styles.close, pressed && styles.closePressed]}
      >
        <AntDesign name='close' size={sizeStyle.iconSize} color={textColor} />
      </Pressable>
    </View>
  ) : (
    label
  );

  if (onPress) {
    return (
      <Pressable testID={testID} onPress={onPress} style={({pressed}) => [containerStyle, pressed && styles.pressed]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={containerStyle}>
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  close: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  closePressed: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.75,
  },
});

export default XTag;
