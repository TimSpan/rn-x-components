/**
 * XSelectField —— XFormPro 的 select 类型控件：触发区 + XPicker 弹层。
 * Form.Item 注入 value/onChange 后即可作为表单控件使用。
 */
import React, {useState} from 'react';
import {XPicker, XPickerOption} from '../../XPicker';
import {FieldTrigger} from './FieldTrigger';
import {useXLocale} from '../../XLocale';

export interface XSelectFieldProps {
  value?: any;
  onChange?: (value: any) => void;
  options: XPickerOption[];
  placeholder?: string;
  title?: string;
  disabled?: boolean;
}

export function XSelectField({value, onChange, options, placeholder, title, disabled}: XSelectFieldProps) {
  const {t} = useXLocale();
  const [visible, setVisible] = useState(false);
  const option = options.find(o => o.value === value);

  return (
    <>
      <FieldTrigger
        text={option?.label}
        placeholder={placeholder ?? t('pleaseSelectLabel', {n: title ?? ''})}
        disabled={disabled}
        onPress={() => setVisible(true)}
      />
      <XPicker
        visible={visible}
        onClose={() => setVisible(false)}
        options={options}
        value={value}
        title={title ?? t('pleaseSelect')}
        onChange={v => {
          onChange?.(v);
          setVisible(false);
        }}
      />
    </>
  );
}

export default XSelectField;
