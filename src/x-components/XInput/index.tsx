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
 * <XInput customKeyboard='numeric' value={amount} onChangeText={setAmount} /> // 自绘数字键盘
 * ```
 *
 * 与 antd Input 的对应：
 * - value / onChangeText：RN 原生命名（方便 XForm.Item 直接注入，trigger='onChangeText'）
 * - disabled：对应 antd disabled（不可编辑 + 禁用样式）
 * - multiline：对应 antd Input.TextArea
 * - allowClear：对应 antd allowClear（非多行时显示清空按钮）
 * - customKeyboard='numeric'：盖住系统键盘，弹起自绘数字键盘（带"完成"按钮）
 *   适合金额/数量等场景，外观风格统一；与 XNumberKeyboard 同源渲染
 * - 其余 props（maxLength/keyboardType/secureTextEntry 等）原样透传给 TextInput
 *
 * 注意：value 是完全受控透传，不做任何 trim/transform —— 改写会打断
 * Android 中文输入法的合成过程（XForm 的同值守卫也依赖原样透传）。
 */
import React, {forwardRef, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, TextInput, TextInputProps, View, StyleProp, TextStyle, ViewStyle, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {XPullView} from '../XPullView';
import {XNumberKeyboard} from '../XNumberKeyboard';

export interface XInputProps extends TextInputProps {
  value?: string;
  onChangeText?: (text: string) => void;
  multiline?: boolean;
  /** 禁用：不可编辑 + 禁用底色（antd disabled） */
  disabled?: boolean;
  /** 有内容时显示清空按钮（antd allowClear；multiline 下不生效） */
  allowClear?: boolean;
  /**
   * 自定义键盘：'numeric' 时盖住系统键盘，弹起自绘数字键盘
   * （带"完成"工具栏，按键直接回写 value；与 XNumberKeyboard 同源）。
   * 仅单行模式生效；与 multiline 互斥。
   */
  customKeyboard?: 'numeric';
  /** 自定义键盘的小数点（false 隐藏；true 显示，默认 true） */
  customKeyboardPoint?: boolean;
  style?: StyleProp<TextStyle>;
  /** 外层容器样式（有 allowClear 按钮时想要撑满/贴边用） */
  containerStyle?: StyleProp<ViewStyle>;
}

export const XInput = forwardRef<TextInput, XInputProps>(function XInput(
  {
    value,
    onChangeText,
    multiline,
    disabled,
    allowClear,
    customKeyboard,
    customKeyboardPoint = true,
    style,
    containerStyle,
    editable,
    ...rest
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const isDisabled = disabled || editable === false;
  const useCustomKb = customKeyboard === 'numeric' && !multiline;
  /** 自定义键盘弹层是否展开 */
  const [kbVisible, setKbVisible] = useState(false);

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
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const insets = useSafeAreaInsets();
  const showClear = !!allowClear && !multiline && !isDisabled && !!displayValue;

  /** 清空后把光标送回输入框，继续输入不用再点一次 */
  const handleClear = () => {
    reportedRef.current = '';
    setMirror('');
    onChangeText?.('');
    if (!useCustomKb) {
      ref && typeof ref === 'object' && ref.current?.focus();
    } else {
      setKbVisible(true);
    }
  };

  /** 自定义键盘：按键 → 回写 value（带 maxLength 校验） */
  const handleKeyPress = (key: string) => {
    const prev = displayValue ?? '';
    const maxLength = rest.maxLength;
    if (typeof maxLength === 'number' && prev.length >= maxLength) return;
    // 小数点只允许一次、不允许开头
    if (key === '.' && (prev.includes('.') || prev.length === 0)) return;
    handleChange(prev + key);
  };

  /** 自定义键盘：退格 */
  const handleBackspace = () => {
    const prev = displayValue ?? '';
    handleChange(prev.slice(0, -1));
  };

  // 自定义键盘模式下，"聚焦状态"由弹层是否展开驱动
  const isFocused = useCustomKb ? kbVisible : focused;

  return (
    <View style={[styles.container, containerStyle]}>
      {useCustomKb ? (
        // 自定义键盘：整个 TextInput 区域是个 Pressable，点按弹键盘
        <Pressable onPress={() => !isDisabled && setKbVisible(true)} disabled={isDisabled}>
          {({pressed}) => (
            <View
              style={[
                styles.input,
                {
                  borderColor: isFocused && !isDisabled ? t.colorPrimary : t.colorBorder,
                  backgroundColor: isDisabled
                    ? t.colorBgContainerDisabled
                    : pressed
                      ? t.colorBgLayout
                      : t.colorBgContainer,
                },
              ]}
              pointerEvents='none'
            >
              <Text
                style={[
                  styles.kbText,
                  {
                    color: displayValue ? t.colorText : t.colorTextQuaternary,
                  },
                  typeof style === 'object' && !Array.isArray(style)
                    ? (style as TextStyle)
                    : undefined,
                ]}
                numberOfLines={1}
                allowFontScaling={false}
              >
                {displayValue || rest.placeholder}
              </Text>
            </View>
          )}
        </Pressable>
      ) : (
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
            {
              borderColor: focused && !isDisabled ? t.colorPrimary : t.colorBorder,
              color: isDisabled ? t.colorTextQuaternary : t.colorText,
              backgroundColor: isDisabled
                ? t.colorBgContainerDisabled
                : focused
                  ? t.colorBgContainer
                  : t.colorBgLayout,
            },
            multiline && styles.textarea,
            style,
          ]}
          placeholderTextColor={rest.placeholderTextColor ?? t.colorTextQuaternary}
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
      )}
      {showClear && (
        <Pressable onPress={handleClear} style={styles.clearBtn} hitSlop={8}>
          <View style={[styles.clearCircle, {backgroundColor: t.colorTextQuaternary}]}>
            <View style={[styles.clearX1, {backgroundColor: t.colorTextLightSolid}]} />
            <View style={[styles.clearX2, {backgroundColor: t.colorTextLightSolid}]} />
          </View>
        </Pressable>
      )}

      {/* 自定义数字键盘弹层（盖住系统键盘） */}
      {useCustomKb && (
        <XPullView visible={kbVisible} onClose={() => setKbVisible(false)} side='bottom' overlayOpacity={0.4}>
          <View style={[styles.kbPanel, {backgroundColor: t.colorBgContainer, paddingBottom: Math.max(insets.bottom, 10)}]}>
            {/* 工具栏：完成 */}
            <View style={[styles.kbToolbar, {borderBottomColor: t.colorSplit}]}>
              <Text style={[styles.kbToolbarTitle, {color: t.colorTextSecondary}]} numberOfLines={1}>
                {rest.placeholder ?? i18n('pleaseInput')}
              </Text>
              <Pressable onPress={() => setKbVisible(false)} hitSlop={8}>
                <Text style={[styles.kbDone, {color: t.colorPrimary}]}>{i18n('done')}</Text>
              </Pressable>
            </View>
            <XNumberKeyboard
              onKeyPress={handleKeyPress}
              onBackspace={handleBackspace}
              extraKey={customKeyboardPoint ? '.' : null}
            />
          </View>
        </XPullView>
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    flex: 1,
  },
  textarea: {
    minHeight: 72,
    textAlignVertical: 'top',
    paddingVertical: 10,
  },
  kbText: {
    fontSize: 15,
    paddingVertical: 2,
  },
  kbPanel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  kbToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  kbToolbarTitle: {
    fontSize: 13,
    flex: 1,
    marginRight: 8,
  },
  kbDone: {
    fontSize: 15,
    fontWeight: '600',
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