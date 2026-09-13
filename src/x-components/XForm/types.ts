/**
 * XForm 类型定义 —— 对标 antd Form / rc-field-form 的类型子集
 */
import type React from 'react';

/** 字段路径：'a' | ['a', 'b'] | ['a', 0, 'b']（数组下标场景） */
export type XNamePath = string | number | Array<string | number>;

/** 校验触发时机 */
export type XValidateTrigger = 'onChange' | 'onBlur';

/**
 * 单条校验规则（对标 antd Rule，实现 async-validator 常用子集）
 */
export interface XRuleObject {
  /** 必填 */
  required?: boolean;
  /** 报错文案；未填时按规则类型给中文默认文案 */
  message?: React.ReactNode;
  /** 值类型校验：string | number | boolean | array | email | url */
  type?: 'string' | 'number' | 'boolean' | 'array' | 'email' | 'url';
  /** string：长度下限；number：数值下限；array：长度下限 */
  min?: number;
  /** 同上，上限 */
  max?: number;
  /** 长度/数值必须等于 */
  len?: number;
  /** 正则校验（对 string 值） */
  pattern?: RegExp;
  /** 值必须是枚举之一 */
  enum?: Array<string | number>;
  /** 空格字符串视为空（配合 required） */
  whitespace?: boolean;
  /**
   * 自定义校验器（对标 antd validator）：
   * - 返回 Promise，reject / throw 即失败；reject 的值（或 error.message）作为文案
   * - resolve（包括 reject() 空值 + rule.message 兜底）即通过
   */
  validator?: (rule: XRuleObject, value: any) => Promise<void | any>;
  /** 先转换再校验（不影响 store 里的值，只影响校验输入） */
  transform?: (value: any) => any;
}

export type XRule = XRuleObject;

/** validateFields 失败时 reject 的对象（对标 antd ValidateErrorEntity） */
export interface XValidateErrorEntity<Values = any> {
  values: Values;
  errorFields: XErrorEntity[];
  outOfDate: boolean;
}

/** 单个字段的错误信息 */
export interface XErrorEntity {
  name: XNamePath;
  errors: string[];
}

/** setFields 的入参（对标 antd） */
export interface XFieldData {
  name: XNamePath;
  value?: any;
  /** 传 [] 清除错误；传 ['xxx'] 设置错误 */
  errors?: string[];
  touched?: boolean;
}

/**
 * 表单实例（对标 antd FormInstance）
 * 所有方法与 antd 同名同义；__getStore 为内部实现细节，业务代码不要调用
 */
export interface XFormInstance<Values = any> {
  getFieldValue: (name: XNamePath) => any;
  /** nameList 传 true 返回全部（含未注册字段）；传数组只取指定字段；不传返回整个 values */
  getFieldsValue: (nameList?: XNamePath[] | true) => Values;
  setFieldValue: (name: XNamePath, value: any) => void;
  setFieldsValue: (values: Partial<Values>) => void;
  setFields: (fields: XFieldData[]) => void;
  resetFields: (nameList?: XNamePath[]) => void;
  getFieldError: (name: XNamePath) => string[];
  getFieldsError: (nameList?: XNamePath[]) => XErrorEntity[];
  /** 校验（不传 name 校验全部）；失败 reject {values, errorFields, outOfDate} */
  validateFields: (nameList?: XNamePath[]) => Promise<Values>;
  /** 触发 onFinish / onFinishFailed（对标 antd form.submit()） */
  submit: () => void;
  isFieldTouched: (name: XNamePath) => boolean;
  isFieldsTouched: (nameList?: XNamePath[], allFieldsTouched?: boolean) => boolean;
  /** 内部：拿到 FormStore（XForm 组件接线用） */
  __getStore: () => unknown;
}
