/**
 * ============================================================================
 * XCheckbox —— 对标 antd Checkbox（RN 自实现版）
 * ============================================================================
 *
 * 支持的 antd API：
 * - <XCheckbox checked defaultChecked indeterminate disabled onChange value>
 * - <XCheckbox.Group value defaultValue options onChange disabled>
 *   - value: 选中值数组；onChange(checkedValues: any[])
 *   - options: {label, value, disabled?}[]
 *
 * 与 antd 的差异：
 * - onChange 的参数是轻量合成事件 {checked, value, target}（antd 是 DOM 事件包装）
 * - 勾选用 View 边框旋转画出来的（L 形旋转 45°），不依赖图标字体
 */
import React, {createContext, useContext, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View, StyleProp, ViewStyle, TextStyle, Text} from 'react-native';
import Svg, {Path} from 'react-native-svg';

import {useXTheme, xTheme} from '../theme';

/** antd Checkbox onChange 事件对象的 RN 等价物 */
export interface XCheckboxChangeEvent {
  checked: boolean;
  value?: any;
  target: {checked: boolean; value?: any};
  stopPropagation: () => void;
}

interface XCheckboxGroupContextValue {
  value: any[];
  disabled?: boolean;
  toggle: (v: any) => void;
  /** 给注册进来的 Checkbox 判断选中态 */
  isChecked: (v: any) => boolean;
}

const CheckboxGroupContext = createContext<XCheckboxGroupContextValue | null>(null);

// ============================================================================
// Checkbox（单个体）
// ============================================================================
export interface XCheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  /** 半选态：显示横杠而不是勾（父级全选框常用） */
  indeterminate?: boolean;
  disabled?: boolean;
  /** Group 内用于标识自己的值；独立使用时只是透传给 onChange */
  value?: any;
  onChange?: (e: XCheckboxChangeEvent) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function XCheckbox({
  checked,
  defaultChecked,
  indeterminate = false,
  disabled,
  value,
  onChange,
  children,
  style,
  textStyle,
  testID,
}: XCheckboxProps) {
  const t = useXTheme();
  const group = useContext(CheckboxGroupContext);
  const [innerChecked, setInnerChecked] = useState(!!defaultChecked);

  const inGroupWithValue = group && value !== undefined;
  const isChecked = inGroupWithValue ? group.isChecked(value) : checked ?? innerChecked;
  const isDisabled = disabled || (group?.disabled ?? false);

  const handlePress = () => {
    if (isDisabled) return;
    const next = !isChecked;
    if (inGroupWithValue) {
      group.toggle(value);
    } else {
      setInnerChecked(next);
    }
    onChange?.({
      checked: next,
      value,
      target: {checked: next, value},
      stopPropagation: () => {},
    });
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({pressed}) => [styles.row, pressed && !isDisabled && styles.pressed, style]}
    >
      <XCheckboxIndicator checked={isChecked} indeterminate={indeterminate} disabled={isDisabled} />
      {children != null && (
        <Text style={[styles.label, {color: isDisabled ? t.colorTextQuaternary : t.colorText}, textStyle]} allowFontScaling={false}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * 方框指示器：20x20 圆角方框；选中画 SVG 勾（几何精确、居中且不裁切），
 * 半选画主色横杠。
 * 勾用 react-native-svg 的 Path 画，不用 View 旋转拼装的近似画法——
 * 那种画法旋转后的视觉包围盒超出布局盒，会出现勾显示不全的问题。
 */
function XCheckboxIndicator({checked, indeterminate, disabled}: {checked: boolean; indeterminate: boolean; disabled: boolean}) {
  const t = useXTheme();
  const active = checked || indeterminate;
  // 底色：选中/半选用主色（禁用时用禁用灰），否则透明白底
  const bgColor = disabled
    ? active
      ? t.colorBgContainerDisabled
      : t.colorBgContainer
    : active
      ? t.colorPrimary
      : t.colorBgContainer;
  const borderColor = disabled ? t.colorBorder : active ? t.colorPrimary : t.colorBorder;
  // 禁用时勾用灰色（白勾在禁用浅灰底上看不见）
  const checkColor = disabled ? t.colorTextQuaternary : t.colorTextLightSolid;

  return (
    <View style={[styles.box, {backgroundColor: bgColor, borderColor}]}>
      {checked && !indeterminate && (
        <Svg width={12} height={12} viewBox='0 0 12 12'>
          <Path d='M2 6.5 L4.8 9.2 L10 3' stroke={checkColor} strokeWidth={2} fill='none' strokeLinecap='round' strokeLinejoin='round' />
        </Svg>
      )}
      {indeterminate && !checked && <View style={[styles.dash, {backgroundColor: disabled ? t.colorTextQuaternary : t.colorPrimary}]} />}
    </View>
  );
}

// ============================================================================
// Checkbox.Group
// ============================================================================
export interface XCheckboxGroupProps {
  value?: any[];
  defaultValue?: any[];
  options?: Array<{label: React.ReactNode; value: any; disabled?: boolean}>;
  onChange?: (checkedValues: any[]) => void;
  disabled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function XCheckboxGroup(props: XCheckboxGroupProps) {
  const {value, defaultValue, options, onChange, disabled, children, style, testID} = props;
  const [innerValue, setInnerValue] = useState<any[]>(defaultValue ?? []);
  const currentValue = value !== undefined ? value : innerValue;

  const toggle = (v: any) => {
    const next = currentValue.includes(v) ? currentValue.filter(item => item !== v) : [...currentValue, v];
    if (value === undefined) {
      setInnerValue(next);
    }
    onChange?.(next);
  };

  const ctx = useMemo<XCheckboxGroupContextValue>(
    () => ({
      value: currentValue,
      disabled,
      toggle,
      isChecked: (v: any) => currentValue.includes(v),
    }),
    [currentValue, disabled, value, onChange],
  );

  return (
    <CheckboxGroupContext.Provider value={ctx}>
      <View testID={testID} style={[styles.group, style]}>
        {options
          ? options.map(opt => (
              <XCheckbox key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </XCheckbox>
            ))
          : children}
      </View>
    </CheckboxGroupContext.Provider>
  );
}

XCheckbox.Group = XCheckboxGroup;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // 扩大点击热区
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  box: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 半选横杠（antd 半选是主色短横线） */
  dash: {
    width: 10,
    height: 2,
    borderRadius: 1,
  },
  label: {
    fontSize: xTheme.fontSize,
    marginLeft: 8,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
    columnGap: 16,
  },
});

export default XCheckbox;
