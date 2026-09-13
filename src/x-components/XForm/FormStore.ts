/**
 * ============================================================================
 * FormStore —— XForm 的数据中枢（对标 rc-field-form 的 FormStore 思路）
 * ============================================================================
 *
 * 职责：
 * 1. 集中保存所有字段值（store）与错误（errorsMap）
 * 2. Form.Item 挂载时注册字段实体（rules / validateTrigger / initialValue），
 *    卸载时注销（值保留，对标 antd preserve 默认行为）
 * 3. 值变化 -> 通知所有字段实体重渲染 + onValuesChange 回调 + 按触发时机校验
 *    本字段和 dependencies 依赖它的字段
 * 4. validateFields / submit 的聚合校验
 *
 * 注册条目（entry）设计说明：
 * Item 传进来的 entity 是"稳定对象 + 每轮渲染原地更新字段"，name 变化时
 * entry.key 在注册那一刻被捕获，注销时按捕获值清理 —— 避免 name 原地更新后
 * 清错 key 的竞态。
 *
 * 不做的事（刻意保持小）：
 * - 不做 Form.List（antd 的动态列表字段）
 * - 不做精确依赖调度：所有值变化通知全部实体，由 Item 自行读值，
 *   表单规模下性能足够，换来实现简单可靠
 */
import type {XErrorEntity, XFieldData, XFormInstance, XNamePath, XRule, XValidateErrorEntity, XValidateTrigger} from './types';
import {deepClone, getValueByPath, isSameNamePath, matchDependency, namePathKey, setValueByPath} from './utils';
import {validateValue} from './validate';

export interface XFieldEntity {
  name: XNamePath;
  rules?: XRule[];
  validateTrigger?: XValidateTrigger | XValidateTrigger[];
  dependencies?: XNamePath[];
  initialValue?: any;
  /** 触发该 Form.Item 重渲染（读取最新 value/errors） */
  reRender: () => void;
}

interface XFormCallbacks {
  onFinish?: (values: any) => void;
  onFinishFailed?: (error: XValidateErrorEntity) => void;
  onValuesChange?: (changedValues: any, allValues: any) => void;
}

interface XFieldEntry {
  entity: XFieldEntity;
  /** 注册时捕获的 key（注销清理用，name 之后被原地更新也不受影响） */
  key: string;
}

export class FormStore {
  private store: Record<string, any> = {};
  /** initialValues（Form 级）：resetFields 的还原基准 */
  private initialValues: Record<string, any> = {};
  private fieldEntries: XFieldEntry[] = [];
  /** 无 name 的 Item（函数式 children / shouldUpdate 联动渲染）的通用订阅者 */
  private listeners: Set<() => void> = new Set();
  private errorsMap: Map<string, string[]> = new Map();
  private touchedKeys: Set<string> = new Set();
  private callbacks: XFormCallbacks = {};
  /** 字段级校验 token：同一字段并发校验时只保留最后一次的结果（打字快时的竞态） */
  private validateTokens: Map<string, number> = new Map();
  private validateSeq = 0;

  // ------------------------------------------------------------------
  // 字段实体注册
  // ------------------------------------------------------------------
  registerField = (entity: XFieldEntity) => {
    const key = namePathKey(entity.name);
    // 同 key 重复注册（StrictMode 双挂载等场景）：先清旧条目
    this.fieldEntries = this.fieldEntries.filter(entry => entry.key !== key);
    this.fieldEntries.push({entity, key});

    // Item 的 initialValue：仅当 store 里还没有值时生效（对标 antd initialValue 语义）
    if (entity.initialValue !== undefined && getValueByPath(this.store, entity.name) === undefined) {
      this.store = setValueByPath(this.store, entity.name, entity.initialValue) as any;
      entity.reRender();
    }
  };

  unregisterField = (entity: XFieldEntity) => {
    const entry = this.fieldEntries.find(e => e.entity === entity);
    if (entry) {
      this.fieldEntries = this.fieldEntries.filter(e => e !== entry);
      this.errorsMap.delete(entry.key);
      this.touchedKeys.delete(entry.key);
    }
  };

  /**
   * 通用订阅：无 name 的 Form.Item（shouldUpdate + 函数式 children）注册，
   * store 任何变化时被通知。返回退订函数。
   */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  // ------------------------------------------------------------------
  // callbacks（Form 组件每轮渲染注入最新闭包）
  // ------------------------------------------------------------------
  setCallbacks = (callbacks: XFormCallbacks) => {
    this.callbacks = callbacks;
  };

  initValues = (initialValues?: Record<string, any>) => {
    if (initialValues) {
      this.initialValues = deepClone(initialValues);
      this.store = {...this.store, ...deepClone(initialValues)};
      this.notifyAll();
    }
  };

  // ------------------------------------------------------------------
  // 取值
  // ------------------------------------------------------------------
  getFieldValue = (name: XNamePath): any => getValueByPath(this.store, name);

  getFieldsValue = (nameList?: XNamePath[] | true): any => {
    if (nameList === true) return deepClone(this.store);
    if (!nameList) return deepClone(this.store);
    const out: Record<string, any> = {};
    for (const name of nameList) {
      const key = namePathKey(name);
      out[key] = deepClone(getValueByPath(this.store, name));
    }
    return out;
  };

  // ------------------------------------------------------------------
  // 设值（外部 API：setFieldValue / setFieldsValue / setFields）
  // ------------------------------------------------------------------
  setFieldValue = (name: XNamePath, value: any) => {
    this.store = setValueByPath(this.store, name, value) as any;
    // 程序化设值只重渲染，不触发 onValuesChange（antd 同款语义：
    // 外部回显/回填不属于"用户输入"，避免受控回声）
    this.notifyAll();
  };

  setFieldsValue = (values: Record<string, any>) => {
    Object.keys(values).forEach(key => {
      this.store = setValueByPath(this.store, key, values[key]) as any;
    });
    this.notifyAll();
  };

  setFields = (fields: XFieldData[]) => {
    for (const field of fields) {
      if ('value' in field) {
        this.store = setValueByPath(this.store, field.name, field.value) as any;
      }
      if (field.errors) {
        this.errorsMap.set(namePathKey(field.name), field.errors);
      }
    }
    this.notifyAll();
  };

  // ------------------------------------------------------------------
  // 重置
  // ------------------------------------------------------------------
  resetFields = (nameList?: XNamePath[]) => {
    const targets = nameList ?? this.fieldEntries.map(entry => entry.entity.name);
    for (const name of targets) {
      const key = namePathKey(name);
      const fromInitial = getValueByPath(this.initialValues, name);
      const entry = this.fieldEntries.find(e => e.key === key);
      const nextValue =
        fromInitial !== undefined ? fromInitial : entry?.entity.initialValue !== undefined ? entry.entity.initialValue : undefined;
      this.store = setValueByPath(this.store, name, nextValue) as any;
      this.errorsMap.delete(key);
      this.touchedKeys.delete(key);
    }
    this.notifyAll();
  };

  // ------------------------------------------------------------------
  // 错误读取
  // ------------------------------------------------------------------
  getFieldError = (name: XNamePath): string[] => this.errorsMap.get(namePathKey(name)) ?? [];

  getFieldsError = (nameList?: XNamePath[]): XErrorEntity[] => {
    const targets = nameList ?? this.fieldEntries.map(entry => entry.entity.name);
    return targets.map(name => ({name, errors: this.getFieldError(name)}));
  };

  // ------------------------------------------------------------------
  // touched
  // ------------------------------------------------------------------
  isFieldTouched = (name: XNamePath): boolean => this.touchedKeys.has(namePathKey(name));

  isFieldsTouched = (nameList?: XNamePath[], allFieldsTouched = false): boolean => {
    const keys = (nameList ?? [...this.touchedKeys]).map(namePathKey);
    if (!keys.length) return false;
    return allFieldsTouched ? keys.every(k => this.touchedKeys.has(k)) : keys.some(k => this.touchedKeys.has(k));
  };

  // ------------------------------------------------------------------
  // 值更新（Form.Item 注入的 onChange 走这里）
  // ------------------------------------------------------------------
  updateValue = (name: XNamePath, value: any, trigger: XValidateTrigger = 'onChange') => {
    const key = namePathKey(name);
    const prev = getValueByPath(this.store, name);
    const unchanged = Object.is(prev, value);
    this.store = setValueByPath(this.store, name, value) as any;
    this.touchedKeys.add(key);
    /**
     * 同值守卫（关键）：Android 受控 TextInput 在 IME 合成期间会把 React 提交的
     * value 原样回抛 onChangeText；若值没变仍通知重渲染，会形成
     * "commit -> 回抛 -> commit" 的同步递归，直接 Maximum call stack size exceeded。
     * 值不变时只记 touched，不触发重渲染/回调/校验。
     */
    if (unchanged) {
      return;
    }
    this.notifyAll();
    this.emitValuesChange(name, value);

    // 本字段按触发时机校验
    const entry = this.fieldEntries.find(e => e.key === key);
    if (entry) {
      const triggers = normalizeTriggers(entry.entity.validateTrigger);
      if (triggers.includes(trigger)) {
        this.validateEntries([entry]);
      }
      // dependencies：依赖本字段的其他字段重新校验（经典场景：二次输入密码）
      const dependents = this.fieldEntries.filter(e => e !== entry && matchDependency(e.entity.dependencies, name));
      if (dependents.length) {
        this.validateEntries(dependents);
      }
    }
  };

  /** 某字段的 onBlur 触发的校验入口 */
  validateOnBlur = (name: XNamePath) => {
    const key = namePathKey(name);
    const entry = this.fieldEntries.find(e => e.key === key);
    if (!entry) return;
    const triggers = normalizeTriggers(entry.entity.validateTrigger);
    if (triggers.includes('onBlur')) {
      this.validateEntries([entry]);
    }
  };

  private emitValuesChange = (name: XNamePath | null, value: any) => {
    if (!this.callbacks.onValuesChange) return;
    const all = deepClone(this.store);
    if (name === null) {
      this.callbacks.onValuesChange(value, all);
    } else {
      this.callbacks.onValuesChange(setValueByPath({}, name, value), all);
    }
  };

  // ------------------------------------------------------------------
  // 校验
  // ------------------------------------------------------------------
  validateFields = async (nameList?: XNamePath[]): Promise<any> => {
    const entries = nameList
      ? this.fieldEntries.filter(entry => nameList.some(n => isSameNamePath(n, entry.entity.name)))
      : [...this.fieldEntries];

    await this.validateEntries(entries);

    const failed = entries.filter(entry => (this.errorsMap.get(entry.key) ?? []).length > 0);
    const values = nameList ? this.getFieldsValue(nameList) : this.getFieldsValue();

    if (failed.length) {
      const errorEntity: XValidateErrorEntity = {
        values,
        errorFields: failed.map(entry => ({name: entry.entity.name, errors: this.errorsMap.get(entry.key) ?? []})),
        outOfDate: false,
      };
      throw errorEntity;
    }
    return values;
  };

  /** 校验一组注册条目：并发执行，写回 errorsMap，通知重渲染 */
  private validateEntries = async (entries: XFieldEntry[]) => {
    if (!entries.length) return;
    // 每个字段领一个新 token；await 期间同字段又触发了新一轮校验的话，本轮结果作废
    const myTokens = new Map<string, number>();
    for (const entry of entries) {
      const token = ++this.validateSeq;
      this.validateTokens.set(entry.key, token);
      myTokens.set(entry.key, token);
    }

    const results = await Promise.all(
      entries.map(async entry => {
        const {name, rules} = entry.entity;
        const value = getValueByPath(this.store, name);
        const errors = await validateValue(value, rules, name);
        return {entry, errors};
      }),
    );

    for (const {entry, errors} of results) {
      if (this.validateTokens.get(entry.key) !== myTokens.get(entry.key)) continue; // 过期结果，丢弃
      if (errors.length) {
        this.errorsMap.set(entry.key, errors);
      } else {
        this.errorsMap.delete(entry.key);
      }
    }
    this.notifyAll();
  };

  // ------------------------------------------------------------------
  // 提交
  // ------------------------------------------------------------------
  submit = async () => {
    try {
      const values = await this.validateFields();
      this.callbacks.onFinish?.(values);
    } catch (error) {
      this.callbacks.onFinishFailed?.(error as XValidateErrorEntity);
    }
  };

  // ------------------------------------------------------------------
  // 通知 & 实例
  // ------------------------------------------------------------------
  private notifyAll = () => {
    this.fieldEntries.forEach(entry => entry.entity.reRender());
    this.listeners.forEach(listener => listener());
  };

  getForm = (): XFormInstance<any> => ({
    getFieldValue: this.getFieldValue,
    getFieldsValue: this.getFieldsValue,
    setFieldValue: this.setFieldValue,
    setFieldsValue: this.setFieldsValue,
    setFields: this.setFields,
    resetFields: this.resetFields,
    getFieldError: this.getFieldError,
    getFieldsError: this.getFieldsError,
    validateFields: this.validateFields,
    submit: this.submit,
    isFieldTouched: this.isFieldTouched,
    isFieldsTouched: this.isFieldsTouched,
    __getStore: () => this,
  });
}

function normalizeTriggers(trigger?: XValidateTrigger | XValidateTrigger[]): XValidateTrigger[] {
  if (!trigger) return ['onChange'];
  return Array.isArray(trigger) ? trigger : [trigger];
}
