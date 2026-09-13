/**
 * XFormPro 内部字段触发器：select / datePicker 这类"弹层控件"的触发区。
 *
 * 与 XInput 同视觉（浅灰底、发丝边框、右侧 ›），点击由外部接管打开弹层。
 */
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';
import {xTheme} from '../../theme';
import AntDesign from '@react-native-vector-icons/ant-design';

export interface FieldTriggerProps {
  /** 展示文本（已选值/已选 label；空串或 undefined 显示 placeholder） */
  text?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
}

export function FieldTrigger({text, placeholder = '请选择', onPress, disabled}: FieldTriggerProps) {
  return (
    <Pressable style={({pressed}) => [styles.trigger, pressed && styles.pressed, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.text, !text && styles.placeholder]} allowFontScaling={false}>
        {text || placeholder}
      </Text>
      <AntDesign name='right' size={16} color='#bbb' />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fafafa',
    minHeight: 40,
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    backgroundColor: xTheme.colorBgContainerDisabled,
  },
  text: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    marginRight: 8,
  },
  placeholder: {
    color: xTheme.colorTextQuaternary,
  },
});
