/**
 * XActionSheet 全局命令式 API：
 *   XActionSheet.show({title, options}) → Promise<value|null>
 *
 * 在 App 根部的 XPopupProvider 下挂载一次 XActionSheetGlobalOverlay 即可。
 */
import React, {useCallback, useEffect, useState} from 'react';
import {create} from 'zustand';
import {XActionSheet, XActionSheetOption} from './index';

interface ActionSheetState {
  visible: boolean;
  title?: string;
  options: XActionSheetOption[];
  resolve?: (v: any | null) => void;
  show: (opts: {title?: string; options: XActionSheetOption[]}) => Promise<any | null>;
  close: (value: any | null) => void;
}

const useStore = create<ActionSheetState>(set => ({
  visible: false,
  options: [],
  show: (opts: {title?: string; options: XActionSheetOption[]}) => {
    return new Promise<any | null>(resolve => {
      set({visible: true, title: opts.title, options: opts.options, resolve});
    });
  },
  close: (value: any | null) => {
    set(state => {
      state.resolve?.(value);
      return {visible: false, options: [], resolve: undefined};
    });
  },
}));

/** 命令式调用入口 */
export async function showXActionSheet(opts: {
  title?: string;
  options: XActionSheetOption[];
}): Promise<any | null> {
  return useStore.getState().show(opts);
}

/** 全局覆盖层：挂一次到 XPopupProvider 内即可 */
export function XActionSheetGlobalOverlay() {
  const visible = useStore(s => s.visible);
  const title = useStore(s => s.title);
  const options = useStore(s => s.options);
  const close = useStore(s => s.close);

  if (!visible) return null;
  return (
    <XActionSheet
      visible={visible}
      onClose={() => close(null)}
      options={options}
      title={title}
      onSelect={opt => close(opt.value)}
    />
  );
}