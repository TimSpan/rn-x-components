/**
 * ============================================================================
 * XConfirmForm —— 命令式确认框（duxui XConfirmForm 移植）
 * ============================================================================
 *
 * 【声明式 vs 命令式】
 * XActionSheet/XPicker 是"声明式"：页面里写 <xxx visible={...} />。
 * XConfirmForm 是"命令式"：不用管 visible，直接调
 *   const ok = await XConfirmForm.show({...})
 *   const ok = await confirm({...})        // 别名，等价
 * 返回 Promise<boolean>：true=点了确定，false=取消/点遮罩。
 *
 * 【如何做到"不用挂载就能调"？】
 * 1. XPopupProvider 在应用根部常驻渲染 <XConfirmForm />（一个实例）；
 * 2. 这个实例挂载时通过 XConfirmFormService._setHost({show, hide})
 *    把自己"注册"到模块级变量 host；
 * 3. XConfirmForm.show 内部实际调用 host.show —— 无论从哪个页面调用，
 *    最终都落到根部那个常驻实例上。
 * （LoadingModalProvider 用的就是同款套路，RN 没有原生 Portal，
 *   这就是最常用的"伪 Portal"方案。）
 *
 * 【Promise 如何落地？】
 * resolver 保存 Promise 的 resolve 函数：
 * - show() 里 new Promise(resolve => resolver.current = resolve)；
 * - 用户点确定 → hide(true) → resolver(true) → Promise 兑现为 true；
 * - 点取消/遮罩 → hide(false) → Promise 兑现为 false。
 * 注意：同一时间只允许一个确认框（后开的会覆盖前一个）。
 * ============================================================================
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, View, Text} from 'react-native';
import {XModalForm} from '../XModalForm';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';

/** show 时的配置 */
export interface XConfirmFormOptions {
  title?: string;
  /** 提示内容：字符串或任意 ReactNode（可以放表单组件） */
  content?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** 危险操作：内容下方显示红色警示文案 */
  danger?: boolean;
}

/** 宿主实例暴露给 Service 的接口 */
interface ConfirmFormHandle {
  show: (options: XConfirmFormOptions) => Promise<boolean>;
  hide: (result?: boolean) => void;
}

/**
 * XConfirmFormComponent —— 常驻的确认框实例
 * 本身也是一个"受控的 XModalForm"：visible 由内部状态控制。
 */
export const XConfirmFormComponent = () => {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  /** 是否显示（由 show/hide 控制，页面无需感知） */
  const [visible, setVisible] = useState(false);
  /** 本次显示的配置 */
  const [options, setOptions] = useState<XConfirmFormOptions>({});
  /** 保存当前 Promise 的 resolve，点按钮时兑现它 */
  const resolver = useRef<((result: boolean) => void) | null>(null);

  /** 显示确认框，返回 Promise：确定→true，取消/遮罩→false */
  const show = useCallback((opts: XConfirmFormOptions) => {
    setOptions(opts);
    setVisible(true);
    return new Promise<boolean>(resolve => {
      resolver.current = resolve;
    });
  }, []);

  /** 关闭并按结果兑现 Promise（默认 false） */
  const hide = useCallback((result?: boolean) => {
    resolver.current?.(result ?? false);
    resolver.current = null;
    setVisible(false);
  }, []);

  /** 挂载时把自己注册进 Service，卸载时反注册 */
  useEffect(() => {
    XConfirmFormService._setHost({show, hide});
    return () => XConfirmFormService._setHost(null);
  }, [show, hide]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          fontSize: 14,
          lineHeight: 22,
          textAlign: 'center',
        },
        dangerWrap: {
          marginTop: 12,
        },
        dangerHint: {
          fontSize: 12,
          textAlign: 'center',
        },
      }),
    [],
  );

  return (
    <XModalForm
      visible={visible}
      onClose={() => hide(false)}
      title={options.title}
      confirmText={options.confirmText}
      cancelText={options.cancelText}
      onSubmit={() => {
        // 点确定：兑现 true 并关闭
        hide(true);
        return true;
      }}
    >
      {/* content 是字符串就按普通文案居中显示，否则直接渲染 ReactNode */}
      {typeof options.content === 'string' ? <Text style={[styles.content, {color: t.colorTextSecondary}]}>{options.content}</Text> : options.content}
      {/* 危险操作警示 */}
      {options.danger && (
        <View style={styles.dangerWrap}>
          <Text style={[styles.dangerHint, {color: t.colorError}]}>{i18n('operationIrreversible')}</Text>
        </View>
      )}
    </XModalForm>
  );
};

/**
 * XConfirmFormService —— 模块级全局服务
 * host 是常驻实例注册进来的引用；模块加载时 host 为 null，
 * 此时调用 show 会直接 resolve(false)（兜底，不会报错）。
 */
let host: ConfirmFormHandle | null = null;
export const XConfirmFormService = {
  /** 由 XConfirmFormComponent 挂载/卸载时调用 */
  _setHost: (h: ConfirmFormHandle | null) => {
    host = h;
  },
  show: (options: XConfirmFormOptions) => host?.show(options) ?? Promise.resolve(false),
  hide: () => host?.hide(false),
};

/**
 * 对外导出的"组件 + 静态方法"：
 * - <XConfirmForm />（XPopupProvider 里用的就是它）
 * - XConfirmForm.show({...}) / XConfirmForm.hide()
 * Object.assign 把静态方法挂到函数组件上。
 */
export const XConfirmForm = Object.assign(XConfirmFormComponent, {
  show: XConfirmFormService.show,
  hide: XConfirmFormService.hide,
});

/** 保留 duxui 的 confirm 命名风格：confirm({...}) 等价 XConfirmForm.show({...}) */
export const confirm = XConfirmFormService.show;
