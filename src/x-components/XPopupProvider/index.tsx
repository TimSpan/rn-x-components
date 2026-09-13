/**
 * ============================================================================
 * XPopupProvider —— 弹窗体系的"根部挂载点"
 * ============================================================================
 *
 * 【为什么需要它？】
 * 命令式弹窗（XConfirmForm/confirm）和 XTopView 宿主都需要一个"永远在场"
 * 的渲染位置。RN 没有 React 官方的 Portal，所以用 Provider 组件把这两样
 * 东西常驻挂载在应用根部（App.tsx 里已经接好）。
 *
 * 【渲染顺序 = 层级顺序】
 *   {children}     ← 整个 App
 *   <XConfirmForm/> ← 命令式确认框实例（内部弹层会进 XTopView）
 *   <XTopView />    ← 所有 XPullView 弹层的最终渲染层（最后渲染 = 最上层）
 *
 * 注意必须放在 GestureHandlerRootView 之内（App.tsx 里就是这样），
 * 否则手势库的触摸拦截会影响弹层内部的手势。
 * ============================================================================
 */

import React from 'react';
import {XConfirmForm} from '../XConfirmForm';
import {XTopView} from '../XTopView';

export const XPopupProvider = ({children}: {children: React.ReactNode}) => {
  return (
    <>
      {/* 整个应用 */}
      {children}
      {/* 命令式确认框的常驻实例（内部走 XPullView → XTopView） */}
      <XConfirmForm />
      {/* 全局弹窗宿主：所有弹层最终都画在这里，天然在最上层 */}
      <XTopView />
    </>
  );
};