/**
 * XFormPro 类型定义 —— 低代码表单（基于 XForm，对标老 FormPro 的配置式 API）
 */
import type {ReactNode} from 'react';
import type {XInputProps} from '../XInput';
import type {XRadioGroupProps} from '../XRadio';
import type {XCheckboxGroupProps} from '../XCheckbox';
import type {XCascadeSelectProps} from '../XCascadeSelect';
import type {XMultiSelectProps} from '../XMultiSelect';
import type {XPickerProps} from '../XPicker';
import type {XPickerDateProps} from '../XPickerDate';
import type {XFormInstance} from '../XForm';

/** 表单数据对象 */
export type XFormModelValue = {[k: string]: any};

/** 平铺选项数据（radioGroup / checkboxGroup / select / multiSelect 用） */
export type XOptionItem = {label: string; value: any; disabled?: boolean};

/**
 * 支持的表单控件类型映射（componentsProps 的类型按 type 收窄）
 *
 * 与老 FormPro 的差异：
 * - input      -> XInput（multiline 即多行文本，textarea 取消）
 * - inputItem / inputNumber / textarea -> 移除
 * - radioGroup -> XRadio.Group
 * - checkboxGroup -> XCheckbox.Group
 * - select     -> XPicker（XSelectField 触发器包装）
 * - cascadeSelect -> XCascadeSelect（自研级联，antd Cascader 数据结构）
 * - multiSelect -> XMultiSelect（XPullView + XCheckbox 重制）
 * - datePicker  -> XPickerDate（时间模式通过 componentsProps.format 传 'HH:mm:ss' 等，timePicker 类型取消）
 * - skiaSignature -> SkiaSignature
 * - imageUpload / videoUpload -> 后续再加
 */
export type XFm = {
  custom: {props: Record<string, any>};
  input: {props: Partial<Omit<XInputProps, 'value' | 'onChangeText'>>};
  radioGroup: {props: Partial<Omit<XRadioGroupProps, 'value' | 'onChange' | 'options'>>};
  checkboxGroup: {props: Partial<Omit<XCheckboxGroupProps, 'value' | 'onChange' | 'options'>>};
  select: {props: Partial<Omit<XPickerProps, 'visible' | 'value' | 'onChange' | 'options' | 'onClose'>> & {placeholder?: string}};
  cascadeSelect: {props: Partial<Omit<XCascadeSelectProps, 'value' | 'onChange' | 'options'>>};
  multiSelect: {props: Partial<Omit<XMultiSelectProps, 'value' | 'onChange' | 'options'>>};
  datePicker: {props: Partial<Omit<XPickerDateProps, 'visible' | 'value' | 'onChange' | 'onClose'>> & {placeholder?: string}};
  skiaSignature: {props: Partial<Record<string, any>>};
};

/** 单条校验规则（对应 XForm 的 XRule 子集） */
export type XFormProRule = {
  required?: boolean;
  message?: string;
  pattern?: RegExp;
  min?: number;
  max?: number;
  validator?: (_rule: any, value: any) => Promise<void>;
};

/** 表单项基础配置 */
export type XBaseFormItemProps<ModelValue = Record<string, any>> = {
  /** 标签文本 */
  label?: string;
  /** 是否必填（为 true 且未配置 rules 时自动生成必填校验） */
  required?: boolean;
  /** 校验规则（单条），不传则 required 为 true 时自动生成 */
  rule?: XFormProRule;
  /** 校验规则（多条），优先级高于 rule */
  rules?: XFormProRule[];
  /** 是否隐藏（编辑场景按状态隐藏字段） */
  hide?: boolean;
  /** 输入框宽度（input 类型），默认 100% */
  inputWidth?: number | string;
  /** 自定义渲染函数，仅 type 为 custom 时生效 */
  customRender?: (modelValue: ModelValue, form: XFormInstance<any>) => ReactNode;
  /** 选项数据（radioGroup / checkboxGroup / select / multiSelect 用） */
  options?: XOptionItem[];
  /** 级联数据（cascadeSelect 用，antd Cascader 同款树结构） */
  cascadeOptions?: XCascadeSelectProps['options'];
};

/** 表单项完整配置（判别联合：componentsProps 类型随 type 收窄） */
export type XFormProItemProps<ModelValue, TK extends keyof XFm = keyof XFm> = XBaseFormItemProps<ModelValue> & {
  /** 控件类型 */
  type: TK;
  /** 控件 props（透传给具体组件，value/onChange 由表单注入） */
  componentsProps?: XFm[TK]['props'];
};

/**
 * 表单配置对象：key 对应 model 字段名，value 为表单项配置。
 * 键可选：hiddenValues 托管的字段（如 id）无需配置表单项。
 */
export type XFormItemOptions<ModelValue> = {
  [K in keyof ModelValue]?: {
    [T in keyof XFm]: XFormProItemProps<ModelValue, T>;
  }[keyof XFm];
};

/** XFormPro 组件 Props */
export interface XFormProProps<ModelValue = Record<string, any>> {
  /** 表单数据（受控；编辑回显/重置场景改这个值即可） */
  value: ModelValue;
  /** 值变化回调（用户输入触发，含 hiddenValues） */
  onUpdateValue?: (value: ModelValue) => void;
  /** 标签宽度（horizontal 布局用） */
  labelWidth?: number;
  /** 标签位置，默认 vertical */
  layout?: 'vertical' | 'horizontal';
  /** 表单配置 */
  formItemOptions?: XFormItemOptions<ModelValue>;
  /**
   * 隐藏字段（编辑场景的关键）：不渲染表单项，但值会进 store，
   * validate/提交/onUpdateValue 的结果里都带（如 id、createBy 原样带回）；
   * 不受 resetFields 影响。
   */
  hiddenValues?: Partial<ModelValue>;
}

/** XFormPro 暴露的实例方法（老 FormPro 同名同义） */
export interface XFormProInst<ModelValue = Record<string, any>> {
  /** 校验表单，成功 resolve 全量值（含 hiddenValues），失败 reject {values, errorFields} */
  validate: () => Promise<ModelValue>;
  /** 清除全部校验错误 */
  restoreValidation: () => void;
}
