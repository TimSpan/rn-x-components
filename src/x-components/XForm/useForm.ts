/**
 * XForm.useForm —— 对标 antd Form.useForm()
 *
 * const [form] = XForm.useForm();
 * <XForm form={form}>...</XForm>
 *
 * 实例对象与 FormStore 绑定（__getStore），XForm 组件拿 form prop 反查 store；
 * 不传 form 时 XForm 内部自建，一样可用（只是外部拿不到实例方法）。
 */
import {useRef} from 'react';
import type {XFormInstance} from './types';
import {FormStore} from './FormStore';

export function useForm<Values extends Record<string, any> = any>(): [XFormInstance<Values>] {
  const ref = useRef<XFormInstance<Values> | undefined>(undefined);
  if (!ref.current) {
    const store = new FormStore();
    ref.current = store.getForm() as XFormInstance<Values>;
  }
  return [ref.current];
}
