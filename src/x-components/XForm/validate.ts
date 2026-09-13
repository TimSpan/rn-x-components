/**
 * ============================================================================
 * XForm 校验引擎 —— 对标 async-validator 的常用子集
 * ============================================================================
 *
 * 支持的规则：required / type / min / max / len / pattern / enum / whitespace /
 * validator（自定义）/ transform
 *
 * 与 async-validator 的差异（有意为之）：
 * - type='number' 放宽：字符串 '12' 也按数字校验（RN TextInput 只产字符串，
 *   实际项目里输入框数字校验基本都是字符串形态，严格类型反而难用）
 * - 未实现的规则字段直接忽略，不报错
 */
import type {XRule, XNamePath} from './types';
import {isEmptyValue} from './utils';

/** 文案模板里的 ${label} 占位符替换 */
function fillTemplate(template: string, label: string): string {
  return template.replace(/\$\{label\}/g, label);
}

interface ValidateContext {
  /** 字段显示名（label 或 name），用于默认文案 */
  label: string;
  /** 该字段是否必填（有 required 规则时 mark 用） */
  required: boolean;
}

/** 规则里声明了 required 吗（Form.Item 的 * 号判断也用它） */
export function hasRequiredRule(rules?: XRule[]): boolean {
  return !!rules?.some(rule => rule.required);
}

function typeOfValue(value: any): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  if (value instanceof Date) return 'date';
  return typeof value;
}

/** 单条规则单值校验：返回错误文案数组（空数组 = 通过） */
async function validateRule(rule: XRule, rawValue: any, ctx: ValidateContext): Promise<string[]> {
  const {label} = ctx;
  const message = rule.message !== undefined ? String(rule.message) : undefined;
  const value = rule.transform ? rule.transform(rawValue) : rawValue;
  const empty = isEmptyValue(value);
  const errors: string[] = [];

  // ---- required：空值直接失败（whitespace=true 时纯空格串也算空，isEmptyValue 已覆盖）----
  if (rule.required && empty) {
    return [message ?? fillTemplate('${label}是必填字段', label)];
  }

  // 非必填且值为空：跳过其余检查（async-validator 同款行为）
  if (empty) return [];

  // ---- 自定义 validator：reject/throw 即失败 ----
  if (rule.validator) {
    try {
      await rule.validator(rule, value);
    } catch (err: any) {
      // reject() 空值 → 用 rule.message；reject('文案') / throw Error → 用其内容
      const text = err?.message ?? (typeof err === 'string' ? err : undefined);
      return [text || message || fillTemplate('${label}校验失败', label)];
    }
    return [];
  }

  // ---- type ----
  if (rule.type) {
    const actual = typeOfValue(value);
    let typeOk = true;
    switch (rule.type) {
      case 'string':
        typeOk = actual === 'string';
        break;
      case 'number':
        // 放宽：数字字符串也算 number（RN 适配，见文件头注释）
        typeOk = actual === 'number' || (actual === 'string' && value.trim() !== '' && !isNaN(Number(value)));
        break;
      case 'boolean':
        typeOk = actual === 'boolean';
        break;
      case 'array':
        typeOk = actual === 'array';
        break;
      case 'email':
        typeOk = actual === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        break;
      case 'url':
        typeOk = actual === 'string' && /^https?:\/\/\S+$/.test(value);
        break;
    }
    if (!typeOk) {
      return [message ?? `${label}的类型应为 ${rule.type}`];
    }
  }

  // ---- min / max / len：按实际值类型分派 ----
  const actual = typeOfValue(value);
  const asNumber = actual === 'number' ? value : actual === 'string' && !isNaN(Number(value)) ? Number(value) : null;

  if (rule.len != null) {
    const lenOk = actual === 'string' || actual === 'array' ? value.length === rule.len : asNumber != null ? asNumber === rule.len : true;
    if (!lenOk) return [message ?? `${label}应为 ${rule.len} 个字符/项`];
  }
  if (rule.min != null) {
    const minOk = actual === 'string' || actual === 'array' ? value.length >= rule.min : asNumber != null ? asNumber >= rule.min : true;
    if (!minOk) return [message ?? `${label}不能少于 ${rule.min}${actual === 'string' ? ' 个字符' : actual === 'array' ? ' 项' : ''}`];
  }
  if (rule.max != null) {
    const maxOk = actual === 'string' || actual === 'array' ? value.length <= rule.max : asNumber != null ? asNumber <= rule.max : true;
    if (!maxOk) return [message ?? `${label}不能超过 ${rule.max}${actual === 'string' ? ' 个字符' : actual === 'array' ? ' 项' : ''}`];
  }

  // ---- pattern ----
  if (rule.pattern && !(actual === 'string' && rule.pattern.test(value))) {
    return [message ?? fillTemplate('${label}格式不正确', label)];
  }

  // ---- enum ----
  if (rule.enum && !rule.enum.includes(value)) {
    return [message ?? `${label}必须是 [${rule.enum.join(' / ')}] 中的一个`];
  }

  return errors;
}

/**
 * 校验一个字段：按规则顺序执行，收集全部错误（antd 展示所有错误文案，这里保持一致）
 */
export async function validateValue(value: any, rules: XRule[] | undefined, name: XNamePath, label?: string): Promise<string[]> {
  if (!rules?.length) return [];
  const displayName = label ?? (typeof name === 'string' || typeof name === 'number' ? String(name) : namePathLabel(name));
  const allErrors: string[] = [];
  for (const rule of rules) {
    const errs = await validateRule(rule, value, {label: displayName, required: !!rule.required});
    allErrors.push(...errs);
  }
  return allErrors;
}

function namePathLabel(name: XNamePath): string {
  return Array.isArray(name) ? name.map(String).join('.') : String(name);
}
