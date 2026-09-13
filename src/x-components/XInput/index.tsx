/**
 * ============================================================================
 * XInput —— 项目通用输入框（样式取自 componentsTest 的 styles.input）
 * ============================================================================
 *
 * 把项目里反复手写的输入框样式沉淀成组件：
 * 发丝边框 + 8 圆角 + 浅灰底，多行模式自动变成"备注"样式（minHeight + 顶部对齐）。
 *
 * 用法：
 * ```tsx
 * <XInput value={name} onChangeText={setName} placeholder='请输入姓名' />
 * <XInput multiline placeholder='请输入备注' />
 * <XInput disabled value='只读' />
 * ```
 *
 * 与 antd Input 的对应：
 * - value / onChangeText：RN 原生命名（方便 XForm.Item 直接注入，trigger='onChangeText'）
 * - disabled：对应 antd disabled（不可编辑 + 禁用样式）
 * - multiline：对应 antd Input.TextArea
 * - allowClear：对应 antd allowClear（非多行时显示清空按钮）
 * - 其余 props（maxLength/keyboardType/secureTextEntry 等）原样透传给 TextInput
 *
 * 注意：value 是完全受控透传，不做任何 trim/transform —— 改写会打断
 * Android 中文输入法的合成过程（XForm 的同值守卫也依赖原样透传）。
 */
import React, {forwardRef, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, TextInput, TextInputProps, View, StyleProp, TextStyle, ViewStyle, Text} from 'react-native';
import {xTheme} from '../theme';

export interface XInputProps extends TextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  /** 禁用：不可编辑 + 禁用底色（antd disabled） */
  disabled?: boolean;
  /** 有内容时显示清空按钮（antd allowClear；multiline 下不生效） */
  allowClear?: boolean;
  style?: StyleProp<TextStyle>;
  /** 外层容器样式（有 allowClear 按钮时想要撑满/贴边用） */
  containerStyle?: StyleProp<ViewStyle>;
}

export const XInput = forwardRef<TextInput, XInputProps>(function XInput(
  {value, onChangeText, multiline, disabled, allowClear, style, containerStyle, editable, ...rest},
  ref,
) {
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || editable === false;

  /**
   * Android IME 防回抛镜像（关键）：
   * 受控模式下若把父级 store 的 value 每键原样回写给 TextInput，IME 合成会被
   * 打断并触发原生层再次回抛 onChangeText，形成"回写 -> 回抛 -> 回写"的同步
   * 递归（Maximum call stack size exceeded）。
   * 做法：输入先写本地镜像再上报，传回 TextInput 的 value 恒等于原生当前文本，
   * RN 的事件计数对得上就不会再 setText，循环从源头消失。
   * 外部改值（回填/重置）通过 reportedRef 区分：value 不等于我们最近上报的
   * 文本，说明是外部注入，才采纳进镜像。
   */
  const [mirror, setMirror] = useState(value);
  const reportedRef = useRef(value);

  useEffect(() => {
    if (value !== reportedRef.current) {
      reportedRef.current = value;
      setMirror(value);
    }
  }, [value]);

  const handleChange = (text: string) => {
    reportedRef.current = text;
    setMirror(text);
    onChangeText?.(text);
  };

  // 受控用法显示镜像；非受控（没传 value）不干预，TextInput 自己管
  const displayValue = value !== undefined ? mirror : undefined;
  const showClear = !!allowClear && !multiline && !isDisabled && !!displayValue;

  /** 清空后把光标送回输入框，继续输入不用再点一次 */
  const handleClear = () => {
    reportedRef.current = '';
    setMirror('');
    onChangeText?.('');
    ref && typeof ref === 'object' && ref.current?.focus();
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        {...rest}
        ref={ref}
        value={displayValue}
        onChangeText={handleChange}
        multiline={multiline}
        editable={!isDisabled}
        pointerEvents={isDisabled ? 'none' : undefined}
        style={[
          styles.input,
          multiline && styles.textarea,
          isDisabled && styles.disabled,
          focused && !isDisabled && styles.focused,
          style,
        ]}
        placeholderTextColor={rest.placeholderTextColor ?? xTheme.colorTextQuaternary}
        allowFontScaling={false}
        onFocus={e => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={e => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
      />
      {showClear && (
        <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
          <View style={styles.clearCircle}>
            <View style={[styles.clearX1, {backgroundColor: '#fff'}]} />
            <View style={[styles.clearX2, {backgroundColor: '#fff'}]} />
          </View>
        </Pressable>
      )}
    </View>
  );
});

/** antd Input.TextArea 的对应形态 */
export const XTextArea = (props: XInputProps) => <XInput multiline {...props} />;

type XInputWithTextArea = typeof XInput & {TextArea: typeof XTextArea};
(XInput as XInputWithTextArea).TextArea = XTextArea;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: '#333',
    backgroundColor: '#fafafa',
    flex: 1,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  disabled: {
    backgroundColor: xTheme.colorBgContainerDisabled,
    color: xTheme.colorTextQuaternary,
  },
  focused: {
    borderColor: xTheme.colorPrimary,
    backgroundColor: '#fff',
  },
  clearBtn: {
    position: 'absolute',
    right: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: xTheme.colorTextQuaternary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearX1: {
    position: 'absolute',
    width: 8,
    height: 1.5,
    transform: [{rotate: '45deg'}],
  },
  clearX2: {
    position: 'absolute',
    width: 8,
    height: 1.5,
    transform: [{rotate: '-45deg'}],
  },
});

export default XInput;
