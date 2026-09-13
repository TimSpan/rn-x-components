/**
 * ============================================================================
 * XTopViewStore —— 全局弹窗宿主的状态仓库（zustand）
 * ============================================================================
 *
 * 【为什么需要它？】
 * 弹窗如果渲染在页面内部（比如 ScrollView 里），会遇到两个问题：
 *   1. 遮罩的 absoluteFill 只相对最近的定位父级生效，页面后面的兄弟节点
 *      （比如 Button）会画在遮罩上面 → 遮不住；
 *   2. 弹窗会跟着页面滚动，也无法覆盖到导航头/TabBar 等页面之外的区域。
 *
 * 解决方案（也是 duxui XTopView 的原理）：把弹窗"托管"到一个全局 store，
 * 再由挂在应用根部的 <XTopView /> 渲染出来。这样弹窗永远在最顶层，
 * 遮罩天然覆盖整个屏幕，与它在哪个页面里调用无关。
 *
 * 【三个 API 的含义】
 *   add(element)    -> 挂载一个弹窗，返回唯一 key（之后用 key 来操作它）
 *   update(key, el) -> 替换指定 key 的弹窗元素（用于"关闭时切换成离场态"）
 *   remove(key)     -> 从宿主中移除（离场动画播完后再调用）
 *
 * 【zustand 用法速记】
 *   create<T>()(set => ({...})) 返回一个 hook：useXTopViewStore(s => s.xxx)
 *   - 选择器 s => s.add 只在 add 引用变化时才触发组件重渲染；
 *   - 组件内也能用 useXTopViewStore.getState().add(...) 直接调（不用 hook）。
 * ============================================================================
 */

import React from 'react';
import {create} from 'zustand';

/** 宿主中的一个弹窗条目：key 唯一标识，element 是要渲染的内容 */
export interface XTopViewItem {
  key: number;
  element: React.ReactNode;
}

/** store 的完整状态 + 操作方法定义 */
interface XTopViewState {
  /** 当前所有挂载中的弹窗（按挂载顺序排列，后面的绘制在上层） */
  items: XTopViewItem[];
  /** 挂载一个弹窗，返回唯一 key */
  add: (element: React.ReactNode) => number;
  /** 替换指定 key 的弹窗内容（不改变层级顺序） */
  update: (key: number, element: React.ReactNode) => void;
  /** 移除指定 key 的弹窗 */
  remove: (key: number) => void;
}

/** 自增 key 计数器：保证每次 add 的 key 全局唯一 */
let keyValue = 0;

export const useXTopViewStore = create<XTopViewState>()(set => ({
  /** 初始状态：没有任何弹窗 */
  items: [],

  /** 挂载：追加到 items 末尾（数组尾部 = 绘制在最上层），返回 key */
  add: element => {
    const key = ++keyValue;
    set(state => ({items: [...state.items, {key, element}]}));
    return key;
  },

  /**
   * 更新：用 map 把 key 匹配的那一项替换成新元素。
   * 注意是替换整个元素对象（新的 React 元素），React 会按 key 复用组件实例，
   * 只更新 props —— XPullView 正是靠这个把 visible=false 传给已挂载的弹层。
   */
  update: (key, element) =>
    set(state => ({
      items: state.items.map(item => (item.key === key ? {...item, element} : item)),
    })),

  /** 移除：用 filter 过滤掉目标 key，触发 <XTopView /> 重渲染 */
  remove: key => set(state => ({items: state.items.filter(item => item.key !== key)})),
}));