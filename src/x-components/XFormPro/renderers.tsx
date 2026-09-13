/**
 * XFormPro 的控件渲染分发：type -> 具体组件
 *
 * 自定义类型（如 skiaSignature 等需额外依赖的组件）通过 registerXFormProRenderer
 * 注册，避免组件库硬依赖重型第三方包。未注册的类型返回 null。
 */
import React from 'react';
import {XInput} from '../XInput';
import {XRadio} from '../XRadio';
import {XCheckbox} from '../XCheckbox';
import {XCascadeSelect} from '../XCascadeSelect';
import {XMultiSelect} from '../XMultiSelect';
import {XSelectField} from './components/XSelectField';
import {XDateField} from './components/XDateField';
import type {XFormInstance} from '../XForm';
import type {XFormProItemProps} from './types';
import type {XLocaleKey} from '../XLocale';

// ---------------------------------------------------------------------------
// 自定义渲染器注册（将需要额外依赖的组件从核心库剥离）
// ---------------------------------------------------------------------------
export type XFormProCustomRenderer = (
  props: Record<string, any> | undefined,
  form: XFormInstance<any>,
) => React.ReactNode;

const customRenderers: Record<string, XFormProCustomRenderer> = {};

/**
 * 注册自定义控件渲染器（按 type 名匹配）。
 *
 * 例如注册签名组件：
 * ```ts
 * registerXFormProRenderer('skiaSignature', (props) => <SkiaSignature {...props} />);
 * ```
 */
export function registerXFormProRenderer(type: string, renderer: XFormProCustomRenderer) {
  customRenderers[type] = renderer;
}

/**
 * 渲染单个表单项的输入控件（value/onChange 由 XForm.Item 注入，这里只管组件形态）
 */
export function renderXFormField(
  item: XFormProItemProps<any, any>,
  form: XFormInstance<any>,
  t: (key: XLocaleKey, params?: Record<string, string | number>) => string,
) {
  const placeholder =
    item.componentsProps?.placeholder ??
    (item.type === 'input' ? t('pleaseInputLabel', {n: item.label ?? ''}) : t('pleaseSelectLabel', {n: item.label ?? ''}));

  switch (item.type) {
    case 'custom':
      return item.customRender ? item.customRender(form.getFieldsValue(), form) : null;

    case 'input':
      return <XInput placeholder={placeholder} style={{width: item.inputWidth ?? '100%'}} {...item.componentsProps} />;

    case 'radioGroup':
      return <XRadio.Group options={item.options ?? []} {...item.componentsProps} />;

    case 'checkboxGroup':
      return <XCheckbox.Group options={item.options ?? []} {...item.componentsProps} />;

    case 'select':
      return <XSelectField options={item.options ?? []} placeholder={placeholder} {...item.componentsProps} />;

    case 'cascadeSelect':
      return <XCascadeSelect options={item.cascadeOptions ?? []} placeholder={placeholder} {...item.componentsProps} />;

    case 'multiSelect':
      return <XMultiSelect options={item.options ?? []} placeholder={placeholder} {...item.componentsProps} />;

    case 'datePicker':
      return <XDateField placeholder={placeholder} {...item.componentsProps} />;

    default: {
      // 自定义类型（如 skiaSignature）：通过 registerXFormProRenderer 注册
      const customRenderer = customRenderers[item.type];
      if (customRenderer) {
        return customRenderer(item.componentsProps, form);
      }
      return <XInput placeholder={placeholder} {...(item as any).componentsProps} />;
    }
  }
}
