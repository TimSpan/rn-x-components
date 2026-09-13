/**
 * ============================================================================
 * XFormPro —— 低代码表单（老 FormPro 的 X 系列重制版，基于 XForm 实现）
 * ============================================================================
 *
 * 对外 API 与老 FormPro 同名同义（value/onUpdateValue/formItemOptions/
 * ref.validate + restoreValidation），老页面迁移只改 import 和组件名。
 *
 * 与老 FormPro 的差异：
 * 1. 内部用 XForm（自研）替代 @ant-design/react-native 的 Form；
 * 2. 控件全部换 X 系列（详见 types.ts 的 XFm 映射说明）；
 * 3. 新增 hiddenValues：编辑场景把 id 等字段带进表单 —— 不渲染表单项，
 *    但值进 store，validate/onUpdateValue 的结果里都带，且不受 resetFields 影响。
 *
 * 使用方式：
 * ```tsx
 * const [formValue, setFormValue] = useState({name: '', sex: undefined});
 * const formRef = useRef<XFormProInst>(null);
 *
 * const options: XFormItemOptions<typeof formValue> = {
 *   name: {required: true, type: 'input', label: '姓名'},
 *   sex: {required: true, type: 'radioGroup', label: '性别',
 *         options: [{label: '男', value: 1}, {label: '女', value: 0}]},
 * };
 *
 * <XFormPro ref={formRef} value={formValue} onUpdateValue={setFormValue}
 *   formItemOptions={options} hiddenValues={{id: 'xxx'}} />
 *
 * const values = await formRef.current.validate(); // 含 hiddenValues
 * ```
 */
import React, {forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef} from 'react';
import XForm from '../XForm';
import {deepClone} from '../XForm/utils';
import {renderXFormField} from './renderers';
import type {XFormProInst, XFormProItemProps, XFormProProps, XFormItemOptions} from './types';

export type {XFormModelValue, XOptionItem, XFormProRule, XBaseFormItemProps, XFormProItemProps, XFormItemOptions, XFormProProps, XFormProInst, XFm} from './types';
export {registerXFormProRenderer} from './renderers';
export type {XFormProCustomRenderer} from './renderers';

/**
 * 通用非空校验（老 FormPro 的 universalValidator 同款）：
 * null/undefined/纯空格串/空数组 视为空
 */
function isValueEmpty(value: any): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '') ||
    (Array.isArray(value) && value.length === 0)
  );
}

function XFormProInner<ModelValue extends Record<string, any>>(
  props: XFormProProps<ModelValue>,
  ref: React.Ref<XFormProInst<ModelValue>>,
) {
  const {value, onUpdateValue, labelWidth, layout = 'vertical', formItemOptions, hiddenValues} = props;

  const [form] = XForm.useForm();
  /** 用户输入产生的值变化（外部 value 同步不回声） */
  const isInternalChange = useRef(false);

  // --- 构建表单元数据：补必填规则（老 FormPro 同款逻辑） ---
  const formMeta = useMemo(() => {
    if (!formItemOptions) return {} as XFormItemOptions<ModelValue>;
    const cloned = deepClone(formItemOptions) as XFormItemOptions<ModelValue>;
    for (const [key, raw] of Object.entries(cloned)) {
      const entry = raw as XFormProItemProps<ModelValue, any> & {path?: string};
      entry.path = key;
      if (entry.required && !entry.rules && !entry.rule) {
        entry.rules = [{required: true, message: `${entry.label ?? key}不能为空`}];
      }
    }
    return cloned;
  }, [formItemOptions]);

  // --- 用户输入：上报父级（含 hiddenValues，因为它们在 store 里） ---
  const handleValuesChange = useCallback(
    (_changed: any, allValues: any) => {
      isInternalChange.current = true;
      onUpdateValue?.(deepClone(allValues));
    },
    [onUpdateValue],
  );

  // --- 外部 value 变化 -> 回显（编辑回填/重置场景） ---
  useEffect(() => {
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    form.setFieldsValue(value as Record<string, any>);
  }, [value, form]);

  // --- hiddenValues：进 store 不渲染（编辑场景的 id 等字段原样带回） ---
  useEffect(() => {
    if (hiddenValues) {
      form.setFieldsValue(hiddenValues as Record<string, any>);
    }
  }, [hiddenValues, form]);

  // --- 实例方法（老 FormPro 同名同义） ---
  useImperativeHandle(
    ref,
    () => ({
      validate: () => form.validateFields() as Promise<ModelValue>,
      restoreValidation: () => {
        const names = Object.keys(formMeta);
        form.setFields(names.map(name => ({name, errors: []})));
      },
    }),
    [form, formMeta],
  );

  return (
    <XForm form={form} initialValues={value} onValuesChange={handleValuesChange} layout={layout} labelWidth={labelWidth}>
      {Object.entries(formMeta).map(([field, raw]) => {
        const entry = raw as XFormProItemProps<ModelValue, any> & {path?: string};
        if (entry.hide) return null;

        const rules = entry.rules ?? (entry.rule ? [entry.rule] : undefined);

        return (
          <XForm.Item
            key={field}
            name={field}
            label={entry.label}
            rules={rules}
            // XInput 走 RN 原生 onChangeText 值回调，其余控件都是 onChange
            trigger={entry.type === 'input' ? 'onChangeText' : 'onChange'}
          >
            {renderXFormField(entry, form)}
          </XForm.Item>
        );
      })}
    </XForm>
  );
}

/**
 * forwardRef + 泛型断言：让 <XFormPro<FieldType>> 正确推导 props 和 ref 类型
 * （与老 FormPro 相同的手法）。
 */
const XFormPro = forwardRef(XFormProInner) as <ModelValue extends Record<string, any>>(
  props: XFormProProps<ModelValue> & {ref?: React.Ref<XFormProInst<ModelValue>>},
) => React.ReactElement;

export default XFormPro;
