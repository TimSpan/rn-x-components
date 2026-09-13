/**
 * XFormPro 内部字段触发器：select / datePicker 这类"弹层控件"的触发区。
 *
 * 与 XInput 同视觉（浅灰底、发丝边框、右侧 ›），点击由外部接管打开弹层。
 */
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {useXTheme} from '../../theme';
import {useXLocale} from '../../XLocale';
import AntDesign from '@react-native-vector-icons/ant-design';

export interface FieldTriggerProps {
  /** 展示文本（已选值/已选 label；空串或 undefined 显示 placeholder） */
  text?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function FieldTrigger({text, placeholder, onPress, disabled}: FieldTriggerProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const resolvedPlaceholder = placeholder ?? i18n('pleaseSelect');
  return (
    <Pressable
      style={({pressed}) => [
        styles.trigger,
        {borderColor: t.colorBorder, backgroundColor: disabled ? t.colorBgContainerDisabled : t.colorBgLayout},
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.text, {color: text ? t.colorText : t.colorTextQuaternary}, !text && styles.placeholder]} allowFontScaling={false}>
        {text || resolvedPlaceholder}
      </Text>
      <AntDesign name='right' size={16} color={t.colorTextTertiary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {},
  text: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  placeholder: {},
});
