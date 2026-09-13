/**
 * ============================================================================
 * XTopView —— 全局弹窗宿主渲染器
 * ============================================================================
 *
 * 【它是谁？】
 * 由 <XPopupProvider /> 挂在应用根部（App.tsx 里），读取 XTopViewStore 中的
 * items，把每个弹窗渲染成一层"全屏透明的 View"。
 *
 * 【层级结构】
 *   XPopupProvider
 *   ├── children（整个 App：NavigationContainer 等）
 *   ├── <XConfirmForm />   （命令式确认框的常驻实例，它内部也是走 XPullView→XTopView）
 *   └── <XTopView />       ← 所有弹窗最终都画到这里，天然在所有页面之上
 *
 * 【关键细节】
 * 1. StyleSheet.absoluteFill：撑满整个屏幕，配合 box-none 不拦截触摸，
 *    触摸由弹层内部自己的遮罩/面板处理；
 * 2. 每个弹窗包一层 View 是为了隔离——后挂载的弹窗盖住先挂载的；
 * 3. key 用 item.key 而不是 index，保证 update 时 React 能正确复用
 *    同一个组件实例（否则动画状态会被重置）。
 * ============================================================================
 */

import React from 'react';
import {StyleSheet, View} from 'react-native';
import {useXTopViewStore} from '../XTopViewStore';

export const XTopView = () => {
  // 订阅 items：store 里 add/update/remove 都会触发这里重渲染
  const items = useXTopViewStore(state => state.items);

  return (
    <>
      {items.map(item => (
        // 每层都是全屏 View，pointerEvents='box-none' 表示"自己不拦截触摸，
        // 但允许子元素（遮罩/面板）接收触摸"
        <View key={item.key} style={StyleSheet.absoluteFill} pointerEvents='box-none'>
          {item.element}
        </View>
      ))}
    </>
  );
};