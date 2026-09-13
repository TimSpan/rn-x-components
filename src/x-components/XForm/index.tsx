/**
 * ============================================================================
 * XForm / XForm.Item —— 对标 antd Form（RN 自实现版）
 * ============================================================================
 *
 * 用法（和 antd 一致）：
 * ```tsx
 * const [form] = XForm.useForm();
 *
 * <XForm
 *   form={form}
 *   initialValues={{name: '张三'}}
 *   onFinish={values => console.log('提交', values)}
 *   onFinishFailed={({errorFields}) => console.log('失败', errorFields)}
 * >
 *   <XForm.Item label='姓名' name='name' rules={[{required: true, message: '请输入姓名'}]}>
 *     <TextInput placeholder='请输入姓名' />
 *   </XForm.Item>
 *
 *   <XForm.Item label='性别' name='sex' rules={[{required: true, message: '请选择性别'}]}>
 *     <XRadio.Group options={[{label: '男', value: 1}, {label: '女', value: 0}]} />
 *   </XForm.Item>
 *
 *   <XButton type='primary' onPress={() => form.submit()}>提交</XButton>
 * </XForm>
 * ```
 *
 * Form.Item 支持的 antd API：
 * - name / label / rules / initialValue
 * - validateTrigger: 'onChange' | 'onBlur' | 两者数组（默认 onChange）
 * - valuePropName: 默认 'value'（Checkbox 这类受控属性叫 checked 时改成 'checked'）
 * - trigger: 值变化回调的 prop 名（默认 'onChange'）
 * - getValueFromEvent: 自定义从回调参数里取值
 * - dependencies: 这些字段的值变化会触发本字段重新校验（如二次输入密码）
 * - help / validateStatus: 手动控制提示文案与状态色（设置后优先生效，help 默认按 error 色显示）
 * - required: 只控制 * 号显示（校验语义请写在 rules 里，同 antd）
 * - noStyle: 不渲染 label/错误文案/外层间距，只注入 value/onChange
 * - shouldUpdate + 函数 children: 渲染函数拿到 form 实例，做联动 UI
 *
 * 与 antd 的差异：
 * - 无 Form.List / Form.Provider（动态列表后续有需要再加）
 * - store 任何变化会通知所有 Item 重渲染（antd 是精确调度；表单规模下性能足够）
 * - label 布局提供 vertical（默认）/ horizontal 两种
 */
import React, {createContext, useContext, useEffect, useMemo, useReducer, useRef} from 'react';
import {StyleSheet, View, StyleProp, ViewStyle, TextStyle, Text} from 'react-native';

import {xTheme} from '../theme';
import {FormStore, XFieldEntity} from './FormStore';
import {useForm} from './useForm';
import {defaultGetValueFromEvent} from './utils';
import {hasRequiredRule} from './validate';
import type {XFormInstance, XNamePath, XRule, XValidateTrigger} from './types';

export type {XRule, XRuleObject, XNamePath, XFormInstance, XErrorEntity, XFieldData, XValidateErrorEntity, XValidateTrigger} from './types';
export {useForm} from './useForm';

// ============================================================================
// Context
// ============================================================================
interface XFormContextValue {
  store: FormStore;
  formInstance: XFormInstance<any>;
  layout: 'vertical' | 'horizontal';
  labelWidth?: number;
  labelStyle?: StyleProp<TextStyle>;
  /** 全局关闭必填 * 号（对标 antd requiredMark=false） */
  requiredMark: boolean;
}

const XFormContext = createContext<XFormContextValue | null>(null);

// ============================================================================
// XForm
// ============================================================================
export interface XFormProps {
  /** useForm 创建的实例（不传时内部自建，外部拿不到实例方法） */
  form?: XFormInstance<any>;
  /** 初始值（只做初始化与 resetFields 还原基准，运行中修改不生效） */
  initialValues?: Record<string, any>;
  onFinish?: (values: any) => void;
  onFinishFailed?: (errorInfo: {values: any; errorFields: {name: XNamePath; errors: string[]}[]; outOfDate: boolean}) => void;
  onValuesChange?: (changedValues: any, allValues: any) => void;
  layout?: 'vertical' | 'horizontal';
  /** horizontal 布局的 label 宽度 */
  labelWidth?: number;
  labelStyle?: StyleProp<TextStyle>;
  requiredMark?: boolean;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  testID?: string;
}

function XForm(props: XFormProps) {
  const {
    form,
    initialValues,
    onFinish,
    onFinishFailed,
    onValuesChange,
    layout = 'vertical',
    labelWidth,
    labelStyle,
    requiredMark = true,
    style,
    children,
    testID,
  } = props;

  const [internalForm] = useForm();
  const formInstance = form ?? internalForm;
  const store = formInstance.__getStore() as FormStore;

  // 每轮渲染都刷新 callbacks 闭包，保证 onFinish 等拿到父组件最新的 state
  useEffect(() => {
    store.setCallbacks({onFinish, onFinishFailed, onValuesChange});
  });

  // initialValues 只在 Form 首次挂载时应用一次（antd 同款约定）
  const initialized = useRef(false);
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    store.initValues(initialValues);
  }, [store, initialValues]);

  const ctx = useMemo<XFormContextValue>(
    () => ({store, formInstance, layout, labelWidth, labelStyle, requiredMark}),
    [store, formInstance, layout, labelWidth, labelStyle, requiredMark],
  );

  return (
    <XFormContext.Provider value={ctx}>
      <View testID={testID} style={[styles.form, style]}>
        {children}
      </View>
    </XFormContext.Provider>
  );
}

// ============================================================================
// XForm.Item
// ============================================================================
export interface XFormItemProps {
  /** 字段名（不传则纯布局：不注入 value/onChange，也不校验） */
  name?: XNamePath;
  label?: React.ReactNode;
  rules?: XRule[];
  initialValue?: any;
  validateTrigger?: XValidateTrigger | XValidateTrigger[];
  /** 受控值的 prop 名，默认 'value'；Checkbox 场景传 'checked' */
  valuePropName?: string;
  /** 值变化的 prop 名，默认 'onChange' */
  trigger?: string;
  /** 自定义从回调参数里取值（默认自动识别：直传值 / 合成事件 / RN 原生事件） */
  getValueFromEvent?: (...args: any[]) => any;
  /** 这些字段的值变化会触发本字段重新校验 */
  dependencies?: XNamePath[];
  /** 手动提示文案（设置后优先生效，默认按 error 色显示；配 validateStatus 可换色） */
  help?: React.ReactNode;
  /** 手动校验状态：'error' | 'warning' | 'success' | 'validating' */
  validateStatus?: 'error' | 'warning' | 'success' | 'validating';
  /** 兼容 antd 的占位 prop（RN 无反馈图标，恒为无操作） */
  hasFeedback?: boolean;
  /** 只显示 * 号，不产生校验规则（同 antd：校验语义放 rules） */
  required?: boolean;
  /** 不渲染任何包裹：只注入 value/onChange */
  noStyle?: boolean;
  /** 函数式 children 联动渲染（配 shouldUpdate 使用；实现上 store 变化即重渲染） */
  shouldUpdate?: boolean | ((prevValues: any, curValues: any) => boolean);
  labelWidth?: number;
  labelStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  /** 普通节点，或 shouldUpdate 场景下的渲染函数（拿到 form 实例） */
  children?: React.ReactNode | ((form: XFormInstance<any>) => React.ReactNode);
  testID?: string;
}

function XFormItem(props: XFormItemProps) {
  const ctx = useContext(XFormContext);

  // 脱离 <XForm> 使用：按纯布局渲染（hooks 必须无条件调用，所以早退分支放 Inner 外）
  if (!ctx) {
    return (
      <View testID={props.testID} style={[styles.item, props.style]}>
        {props.label != null && <Text style={styles.label}>{props.label}</Text>}
        {/* 无 ctx 的降级分支不处理函数式 children（联动依赖 store） */}
        {typeof props.children === 'function' ? null : props.children}
      </View>
    );
  }

  return <XFormItemInner {...props} ctx={ctx} />;
}

/**
 * 真正的实现拆到 Inner：上面的"无 ctx 早退分支"return 之后不能再有 hooks。
 */
function XFormItemInner(props: XFormItemProps & {ctx: XFormContextValue}) {
  const {
    name,
    label,
    rules,
    initialValue,
    validateTrigger = 'onChange',
    valuePropName = 'value',
    trigger = 'onChange',
    getValueFromEvent,
    dependencies,
    help,
    validateStatus,
    required,
    noStyle,
    labelWidth,
    labelStyle,
    style,
    children,
    testID,
    ctx,
  } = props;
  const {store, formInstance, layout, labelWidth: formLabelWidth, labelStyle: formLabelStyle, requiredMark} = ctx;

  // 订阅 store：任何值/错误变化 bump 一次，本 Item 读自己的最新值
  const [, forceUpdate] = useReducer(c => c + 1, 0);

  const nameDefined = name !== undefined && name !== null;
  const nameKey = nameDefined ? (Array.isArray(name) ? name.map(String).join('.') : String(name)) : '';

  /**
   * 字段实体只创建一次；rules/validateTrigger 等每轮渲染原地更新。
   * 不能按 rules 依赖重建实体 —— 调用方常写内联 rules 数组（每轮新引用），
   * 重建会导致 register/unregister 反复横跳，错误信息被 unregister 清掉。
   */
  const entityRef = useRef<XFieldEntity | null>(null);
  if (!entityRef.current) {
    entityRef.current = {name: name as XNamePath, rules, validateTrigger, dependencies, initialValue, reRender: forceUpdate};
  } else {
    entityRef.current.name = name as XNamePath;
    entityRef.current.rules = rules;
    entityRef.current.validateTrigger = validateTrigger;
    entityRef.current.dependencies = dependencies;
    entityRef.current.initialValue = initialValue;
  }

  // 注册/注销只跟随 name 变化（name 变了视为换了字段）
  useEffect(() => {
    if (!nameDefined) return;
    store.registerField(entityRef.current!);
    return () => store.unregisterField(entityRef.current!);
  }, [store, nameKey, nameDefined]);

  // 无 name 的 Item（shouldUpdate + 函数式 children）：走通用订阅，store 变化即重渲染
  useEffect(() => {
    if (nameDefined || typeof children !== 'function') return;
    return store.subscribe(forceUpdate);
  }, [store, nameDefined, typeof children === 'function']);

  const value = nameDefined ? store.getFieldValue(name as XNamePath) : undefined;
  const autoErrors = nameDefined ? store.getFieldError(name as XNamePath) : [];

  // ---- help / validateStatus 手动态优先（antd：设置 help 且未设状态时按 error 展示） ----
  const manualActive = help !== undefined || validateStatus !== undefined;
  const effectiveStatus = validateStatus ?? (help !== undefined ? 'error' : undefined);
  const helpText: React.ReactNode = manualActive ? help : autoErrors.length ? autoErrors.join('，') : null;
  const helpColorStyle = manualActive
    ? effectiveStatus === 'warning'
      ? styles.helpWarning
      : effectiveStatus === 'error' || effectiveStatus === undefined
      ? styles.helpError
      : styles.help
    : styles.helpError;

  // ---- children 处理：函数式 or 注入 value/onChange ----
  let childNode: React.ReactNode = typeof children === 'function' ? null : children;

  if (typeof children === 'function') {
    // shouldUpdate + 函数 children：把 form 实例交给业务自己渲染（联动场景）
    childNode = (children as (form: XFormInstance<any>) => React.ReactNode)(formInstance);
  } else if (nameDefined && React.isValidElement(children)) {
    const child = children as React.ReactElement<any>;
    const childProps: Record<string, any> = {
      [valuePropName]: value,
    };

    // 合并子组件自己的 trigger 回调（不能吞掉别人的 onChange）
    const childTrigger = child.props?.[trigger];
    childProps[trigger] = (...args: any[]) => {
      childTrigger?.(...args);
      const nextValue = getValueFromEvent ? getValueFromEvent(...args) : defaultGetValueFromEvent(valuePropName, args[0]);
      store.updateValue(name as XNamePath, nextValue, 'onChange');
    };

    // validateTrigger 含 onBlur 时注入 onBlur 校验（同样合并子组件自己的 onBlur）
    const triggers = Array.isArray(validateTrigger) ? validateTrigger : [validateTrigger];
    if (triggers.includes('onBlur')) {
      const childBlur = child.props?.onBlur;
      childProps.onBlur = (...args: any[]) => {
        childBlur?.(...args);
        store.validateOnBlur(name as XNamePath);
      };
    }

    childNode = React.cloneElement(child, childProps);
  }

  // ---- 渲染 ----
  if (noStyle) {
    return <>{childNode}</>;
  }

  const showRequiredMark = requiredMark && (required || hasRequiredRule(rules));
  const isHorizontal = layout === 'horizontal';
  const effectiveLabelWidth = labelWidth ?? formLabelWidth;

  return (
    <View testID={testID} style={[styles.item, isHorizontal && styles.itemHorizontal, style]}>
      {label != null && (
        <View style={[styles.labelRow, isHorizontal && {width: effectiveLabelWidth, marginBottom: 0, marginRight: 12}]}>
          {showRequiredMark && <Text style={styles.requiredStar}>*</Text>}
          <Text style={[styles.label, formLabelStyle, labelStyle]} allowFontScaling={false}>
            {label}
          </Text>
        </View>
      )}
      <View style={isHorizontal ? styles.controlHorizontal : styles.control}>
        {childNode}
        {helpText != null && <Text style={[styles.help, helpColorStyle]}>{helpText}</Text>}
      </View>
    </View>
  );
}

// ============================================================================
// 组装（XForm.Item / XForm.useForm 静态挂载，对标 antd Form.Item / Form.useForm）
// ============================================================================
type XFormWithStatics = typeof XForm & {
  Item: typeof XFormItem;
  useForm: typeof useForm;
};

const XFormExported = XForm as XFormWithStatics;
XFormExported.Item = XFormItem;
XFormExported.useForm = useForm;

const styles = StyleSheet.create({
  form: {
    width: '100%',
  },
  item: {
    marginBottom: 18,
  },
  itemHorizontal: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: xTheme.fontSize,
    color: xTheme.colorText,
  },
  requiredStar: {
    color: xTheme.colorError,
    marginRight: 4,
    fontSize: xTheme.fontSize,
  },
  control: {
    width: '100%',
  },
  controlHorizontal: {
    flex: 1,
  },
  help: {
    fontSize: xTheme.fontSizeSM,
    color: xTheme.colorTextTertiary,
    marginTop: 6,
    lineHeight: 18,
  },
  helpError: {
    color: xTheme.colorError,
  },
  helpWarning: {
    color: xTheme.colorWarning,
  },
});

export default XFormExported;
