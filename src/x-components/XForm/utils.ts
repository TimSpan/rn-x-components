/**
 * XForm 工具函数：路径读写 / 事件取值 / 空值判断
 */
import type {XNamePath} from './types';

/** namePath 序列化成 map key（['a', 0] -> 'a.0'；'a' -> 'a'） */
export function namePathKey(name: XNamePath): string {
  if (typeof name === 'string' || typeof name === 'number') return String(name);
  return name.map(String).join('.');
}

/** 判断两个 namePath 是否同一个字段 */
export function isSameNamePath(a: XNamePath | undefined, b: XNamePath | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return namePathKey(a) === namePathKey(b);
}

/** 判断 namePath 是否在依赖列表里（依赖支持单路径或路径数组） */
export function matchDependency(dependencies: XNamePath[] | undefined, name: XNamePath): boolean {
  if (!dependencies?.length) return false;
  const key = namePathKey(name);
  return dependencies.some(dep => namePathKey(dep) === key);
}

/** 空值：null/undefined/空串/纯空格串/空数组 */
export function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * 按路径读值（只读，不创建中间对象）
 * get({a: {b: 1}}, ['a','b']) -> 1
 */
export function getValueByPath(store: any, name: XNamePath): any {
  const path = Array.isArray(name) ? name : [name];
  let current = store;
  for (const key of path) {
    if (current === null || current === undefined) return undefined;
    current = current[key as any];
  }
  return current;
}

/**
 * 按路径写值（浅拷贝路径上的对象，不 mutate 原 store —— 保证 React 数据流可预测）
 * set({}, ['a','b'], 1) -> {a: {b: 1}}
 */
export function setValueByPath<T>(store: T, name: XNamePath, value: any): T {
  const path = Array.isArray(name) ? name : [name];
  if (path.length === 0) return value;

  function cloneLevel(node: any, level: number): any {
    const key = path[level];
    if (level === path.length - 1) {
      // 叶子：数组下标保持数组类型
      if (Array.isArray(node)) {
        const copy = [...node];
        copy[key as number] = value;
        return copy;
      }
      return {...node, [key]: value};
    }
    const nextNode = node?.[key] ?? (typeof path[level + 1] === 'number' ? [] : {});
    const clonedNext = cloneLevel(nextNode, level + 1);
    if (Array.isArray(node)) {
      const copy = [...node];
      copy[key as number] = clonedNext;
      return copy;
    }
    return {...node, [key]: clonedNext};
  }

  return cloneLevel(store, 0) as T;
}

/**
 * 深拷贝（Form values 里可能有 Date 等复杂对象，用 JSON 会丢内容，沿用 lodash cloneDeep 的场景）
 *
 * 环安全：一旦值被污染成循环引用（比如事件对象被误存进 store），
 * 在 revisit 处返回原引用打断递归 —— 宁可数据带环也不能让 App 爆栈崩溃。
 */
export function deepClone<T>(value: T): T {
  return cloneWithCycleGuard(value, new WeakSet<object>());
}

function cloneWithCycleGuard(value: any, seen: Set<object> | WeakSet<object>): any {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return value; // 循环引用：返回原引用打断
  seen.add(value);
  if (Array.isArray(value)) return value.map(item => cloneWithCycleGuard(item, seen));
  if (value instanceof Date) return new Date(value.getTime());
  const out: Record<string, any> = {};
  for (const key of Object.keys(value)) {
    out[key] = cloneWithCycleGuard(value[key], seen);
  }
  return out;
}


/**
 * 从事件参数里提取表单值（对标 rc-field-form 的 defaultGetValueFromEvent，做 RN 适配）
 *
 * 覆盖四种调用形态：
 * 1. 直传值：TextInput onChangeText(text) —— text 直接是字符串
 * 2. RN 原生事件对象：onChange({nativeEvent: {text}}) —— 必须先判这种，
 *    否则事件对象会被整个存进 store：事件内部（_targetInst.viewConfig 等）全是
 *    循环引用，后续 deepClone 直接 Maximum call stack size exceeded
 * 3. 合成事件：XRadio/XCheckbox 的 onChange({value, checked, target})
 * 4. 兜底：看起来像事件对象（有 nativeEvent/_targetInst/stopPropagation）的一律
 *    返回 undefined，绝不把事件本身当值存
 */
export function defaultGetValueFromEvent(valuePropName: string, arg: any): any {
  // RN 原生事件（TextInput 的 onChange/onBlur 等）：值在 nativeEvent.text
  if (arg && typeof arg === 'object' && arg.nativeEvent != null) {
    return typeof arg.nativeEvent.text === 'string' ? arg.nativeEvent.text : undefined;
  }
  // 自定义合成事件对象（有对象形态的 target）：优先按 valuePropName 取，其次 value
  if (arg && typeof arg === 'object' && arg.target && typeof arg.target === 'object') {
    if (valuePropName in arg.target) return arg.target[valuePropName];
    if ('value' in arg.target) return arg.target.value;
    return arg.value ?? arg;
  }
  // 防御：事件样子的对象（React 合成事件带 _targetInst/stopPropagation）不当值
  if (arg && typeof arg === 'object' && (arg._targetInst !== undefined || typeof arg.stopPropagation === 'function')) {
    return undefined;
  }
  return arg;
}
