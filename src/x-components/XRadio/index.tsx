/**
 * ============================================================================
 * XRadio —— 对标 antd Radio（RN 自实现版）
 * ============================================================================
 *
 * 支持的 antd API：
 * - <XRadio value onChange disabled checked defaultChecked>label</XRadio>
 * - <XRadio.Group value defaultValue options onChange optionType buttonStyle disabled>
 *   - options: {label, value, disabled?}[]，传了就不用手写子 Radio
 *   - optionType: 'default'（圆点单选） | 'button'（按钮单选，配合 options 使用）
 *   - buttonStyle: 'outline' | 'solid'（按钮单选的选中样式）
 * - <XRadio.Button value>label</XRadio.Button>（手动组合按钮单选，各自独立胶囊）
 *
 * 与 antd 的差异：
 * - onChange 回调参数是轻量合成事件 {value, checked, target}（antd 是 DOM 事件包装）
 * - Radio.Button 手动组合时不做 antd 那种连体分段样式（连体只出现在
 *   Group options + optionType='button' 的自动渲染里，因为只有那一刻才拿得到索引）
 */
import React, {createContext, useContext, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View, StyleProp, ViewStyle, TextStyle, Text} from 'react-native';

import {xTheme} from '../theme';

/** antd Radio 的 onChange 事件对象的 RN 等价物 */
export interface XRadioChangeEvent {
  value: any;
  checked: boolean;
  target: {value: any; checked: boolean};
  stopPropagation: () => void;
}

export interface XRadioGroupContextValue {
  value?: any;
  disabled?: boolean;
  /** 圆点单选：走统一 onChange；按钮单选：Group 自渲染，同样走这里 */
  onRadioChange: (value: any, checked: boolean) => void;
  /** 是否是按钮形态（Group 内的 Radio.Button 交给 Group 统一渲染时使用） */
  optionType?: 'default' | 'button';
  buttonStyle?: 'outline' | 'solid';
}

const RadioGroupContext = createContext<XRadioGroupContextValue | null>(null);

function makeEvent(value: any, checked: boolean): XRadioChangeEvent {
  const event: XRadioChangeEvent = {
    value,
    checked,
    target: {value, checked},
    stopPropagation: () => {},
  };
  return event;
}

// ============================================================================
// Radio（单个体）
// ============================================================================
export interface XRadioProps {
  value?: any;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  onChange?: (e: XRadioChangeEvent) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

export function XRadio({value, checked, defaultChecked, disabled, onChange, children, style, textStyle, testID}: XRadioProps) {
  const group = useContext(RadioGroupContext);
  const [innerChecked, setInnerChecked] = useState(!!defaultChecked);

  // Group 里的选中态由 Group value 决定；独立使用时受控/非受控自管理
  const isChecked = group ? group.value !== undefined && group.value === value : checked ?? innerChecked;
  const isDisabled = disabled || (group?.disabled ?? false);

  const handlePress = () => {
    if (isDisabled || isChecked) return; // 单选已选中再点不触发（antd 同款）
    if (!group) {
      setInnerChecked(true);
      onChange?.(makeEvent(value, true));
    } else {
      group.onRadioChange(value, true);
    }
  };

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({pressed}) => [styles.radioRow, pressed && !isDisabled && styles.pressed, style]}
    >
      <XRadioIndicator checked={isChecked} disabled={isDisabled} />
      {children != null && (
        <Text style={[styles.radioLabel, isDisabled && styles.labelDisabled, textStyle]} allowFontScaling={false}>
          {children}
        </Text>
      )}
    </Pressable>
  );
}

/** 圆点指示器：外圈 20 + 选中内点 10，颜色随状态 */
function XRadioIndicator({checked, disabled}: {checked: boolean; disabled: boolean}) {
  const ringColor = disabled ? xTheme.colorBorder : checked ? xTheme.colorPrimary : xTheme.colorBorder;
  return (
    <View style={[styles.radioRing, {borderColor: ringColor}]}>
      {checked && <View style={[styles.radioDot, {backgroundColor: disabled ? xTheme.colorTextQuaternary : xTheme.colorPrimary}]} />}
    </View>
  );
}

// ============================================================================
// Radio.Button（独立按钮形态单选，也可放 Group 里）
// ============================================================================
export interface XRadioButtonProps {
  value?: any;
  disabled?: boolean;
  checked?: boolean;
  onChange?: (e: XRadioChangeEvent) => void;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function XRadioButton({value, disabled, checked, onChange, children, style, testID}: XRadioButtonProps) {
  const group = useContext(RadioGroupContext);
  const isChecked = group ? group.value === value : !!checked;
  const isDisabled = disabled || (group?.disabled ?? false);
  const buttonStyle = group?.buttonStyle ?? 'outline';

  const handlePress = () => {
    if (isDisabled || isChecked) return;
    if (group) {
      group.onRadioChange(value, true);
    } else {
      onChange?.(makeEvent(value, true));
    }
  };

  // outline：选中=主色描边+主色字；solid：选中=主色实底+白字
  const selected = buttonStyle === 'solid';
  const bg = isDisabled ? xTheme.colorBgContainerDisabled : isChecked && selected ? xTheme.colorPrimary : xTheme.colorBgContainer;
  const textColor = isDisabled ? xTheme.colorTextQuaternary : isChecked ? (selected ? '#fff' : xTheme.colorPrimary) : xTheme.colorTextSecondary;
  const borderColor = isDisabled ? xTheme.colorBorder : isChecked ? xTheme.colorPrimary : xTheme.colorBorder;

  return (
    <Pressable
      testID={testID}
      onPress={handlePress}
      disabled={isDisabled}
      style={({pressed}) => [styles.buttonBase, {backgroundColor: bg, borderColor}, pressed && !isDisabled && styles.pressed, style]}
    >
      <Text style={[styles.buttonText, {color: textColor}]} allowFontScaling={false}>
        {children}
      </Text>
    </Pressable>
  );
}

// ============================================================================
// Radio.Group
// ============================================================================
export interface XRadioGroupProps {
  value?: any;
  defaultValue?: any;
  options?: Array<{label: React.ReactNode; value: any; disabled?: boolean}>;
  onChange?: (e: XRadioChangeEvent) => void;
  optionType?: 'default' | 'button';
  buttonStyle?: 'outline' | 'solid';
  disabled?: boolean;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

function XRadioGroup(props: XRadioGroupProps) {
  const {value, defaultValue, options, onChange, optionType = 'default', buttonStyle = 'outline', disabled, children, style, testID} = props;
  const [innerValue, setInnerValue] = useState(defaultValue);
  // 受控模式：外部传了 value 就以外部为准；否则用内部态
  const currentValue = value !== undefined ? value : innerValue;

  const handleRadioChange = (v: any, checked: boolean) => {
    if (value === undefined) {
      setInnerValue(v);
    }
    onChange?.(makeEvent(v, checked));
  };

  const ctx = useMemo<XRadioGroupContextValue>(
    () => ({value: currentValue, disabled, onRadioChange: handleRadioChange, optionType, buttonStyle}),
    [currentValue, disabled, optionType, buttonStyle, value, onChange],
  );

  return (
    <RadioGroupContext.Provider value={ctx}>
      <View testID={testID} style={[styles.group, style]}>
        {options ? (
          optionType === 'button' ? (
            // 按钮形态：连体分段（首尾圆角、中间直角），对标 antd Radio.Button 组。
            // 单独包一层无 gap 容器：styles.group 的 columnGap 会把连体按钮隔开
            <View style={styles.buttonRow}>
              {options.map((opt, idx) => (
                <GroupButton
                  key={String(opt.value)}
                  option={opt}
                  idx={idx}
                  total={options.length}
                  checked={currentValue === opt.value}
                  disabled={disabled ?? opt.disabled ?? false}
                  solid={buttonStyle === 'solid'}
                  onPress={() => handleRadioChange(opt.value, true)}
                />
              ))}
            </View>
          ) : (
            // 圆点形态：横排换行
            options.map(opt => (
              <XRadio key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </XRadio>
            ))
          )
        ) : (
          children
        )}
      </View>
    </RadioGroupContext.Provider>
  );
}

/** Group options + button 形态的连体按钮（需要知道 idx 才能算首尾圆角） */
function GroupButton({
  option,
  idx,
  total,
  checked,
  disabled,
  solid,
  onPress,
}: {
  option: {label: React.ReactNode; value: any; disabled?: boolean};
  idx: number;
  total: number;
  checked: boolean;
  disabled: boolean;
  solid: boolean;
  onPress: () => void;
}) {
  const isFirst = idx === 0;
  const isLast = idx === total - 1;
  const radius = xTheme.borderRadius;

  const bg = disabled ? xTheme.colorBgContainerDisabled : checked && solid ? xTheme.colorPrimary : xTheme.colorBgContainer;
  const textColor = disabled ? xTheme.colorTextQuaternary : checked ? (solid ? '#fff' : xTheme.colorPrimary) : xTheme.colorTextSecondary;
  const borderColor = disabled ? xTheme.colorBorder : checked ? xTheme.colorPrimary : xTheme.colorBorder;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({pressed}) => [
        styles.groupButton,
        {
          backgroundColor: bg,
          borderColor,
          borderTopLeftRadius: isFirst ? radius : 0,
          borderBottomLeftRadius: isFirst ? radius : 0,
          borderTopRightRadius: isLast ? radius : 0,
          borderBottomRightRadius: isLast ? radius : 0,
          // 连体：非首元素左移一个边框宽度，实现边框重叠（antd 的 -1px margin 同款思路）
          marginLeft: isFirst ? 0 : -1,
          // 后画的兄弟会盖住前一个的右边框：选中的按钮抬高层级，
          // 保证自己的蓝色右边框压在后一个按钮的灰色左边框之上（antd 的 z-index:1 同款）
          zIndex: checked ? 2 : 1,
        },
        pressed && !disabled && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, {color: textColor}]} allowFontScaling={false}>
        {option.label}
      </Text>
    </Pressable>
  );
}

XRadio.Group = XRadioGroup;
XRadio.Button = XRadioButton;

const styles = StyleSheet.create({
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // 扩大点击热区（对标 antd RN 的 Radio 触摸面积）
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
  radioRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  radioLabel: {
    fontSize: xTheme.fontSize,
    color: xTheme.colorText,
    marginLeft: 8,
  },
  labelDisabled: {
    color: xTheme.colorTextQuaternary,
  },
  buttonBase: {
    height: xTheme.controlHeight,
    paddingHorizontal: 14,
    borderRadius: xTheme.borderRadius,
    borderWidth: StyleSheet.hairlineWidth * 2,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  groupButton: {
    height: xTheme.controlHeight,
    paddingHorizontal: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: xTheme.fontSize,
  },
  group: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 8,
    columnGap: 16,
  },
});

export default XRadio;
