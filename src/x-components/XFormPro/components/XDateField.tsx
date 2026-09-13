/**
 * XDateField —— XFormPro 的 datePicker 类型控件：触发区 + XPickerDate 弹层。
 *
 * 日期/日期时间/时间统一走 format：
 * - 'YYYY-MM-DD'            日期
 * - 'YYYY-MM-DD HH:mm'      日期时间
 * - 'HH:mm:ss' / 'HH:mm'    时间（原 timePicker 类型）
 */
import React, {useState} from 'react';
import {XPickerDate} from '../../XPickerDate';
import {FieldTrigger} from './FieldTrigger';

export interface XDateFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  /** 列配置（见 XPickerDate），如 'YYYY-MM-DD'、'HH:mm' */
  format?: string;
  placeholder?: string;
  title?: string;
  minYear?: number;
  maxYear?: number;
  disabled?: boolean;
}

export function XDateField({value, onChange, format, placeholder, title, minYear, maxYear, disabled}: XDateFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <FieldTrigger
        text={value}
        placeholder={placeholder ?? '请选择日期'}
        disabled={disabled}
        onPress={() => setVisible(true)}
      />
      <XPickerDate
        visible={visible}
        onClose={() => setVisible(false)}
        value={value}
        title={title ?? '请选择日期'}
        format={format}
        minYear={minYear}
        maxYear={maxYear}
        onChange={v => {
          onChange?.(v);
          setVisible(false);
        }}
      />
    </>
  );
}

export default XDateField;
