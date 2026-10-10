/**
 * ============================================================================
 * XUpload Provider —— 上传适配器的注入/获取
 * ============================================================================
 *
 * 【两级注入】
 * 1. 全局默认：setXUploadAdapter(adapter)（App 启动时注入 MinIO/业务适配器）；
 * 2. 局部覆盖：<XUploadProvider adapter={...}>（子树内所有上传组件生效），
 *    没有时回退全局默认；连全局也没注入时兜底 Mock 并 warn 一次。
 * ============================================================================
 */

import React, {createContext, useContext, useMemo} from 'react';
import {createMinioPresignedAdapter, createMockUploadAdapter} from './adapters';
import type {XUploadAdapter} from './types';

/**
 * Mock 兜底实例：作为「未注入真实适配器」的哨兵。
 * 用引用比较即可判断用户是否调用过 setXUploadAdapter / 传过 XUploadProvider.adapter，
 * 从而避免"只要走全局注入就误报未注入"的老问题。
 */
const MOCK_FALLBACK: XUploadAdapter = createMockUploadAdapter();

/** 全局默认适配器（初始为 Mock 兜底，避免演示页崩溃） */
let globalAdapter: XUploadAdapter = MOCK_FALLBACK;
let warnedNoAdapter = false;

/** 注入全局默认适配器（App 启动时调用一次） */
export function setXUploadAdapter(adapter: XUploadAdapter) {
  globalAdapter = adapter;
}

/** 获取全局默认适配器 */
export function getXUploadAdapter(): XUploadAdapter {
  return globalAdapter;
}

/** 是否已注入真实适配器（仍为 Mock 兜底时返回 false） */
export function isXUploadAdapterInjected(): boolean {
  return globalAdapter !== MOCK_FALLBACK;
}

const XUploadContext = createContext<XUploadAdapter | null>(null);

export function XUploadProvider({adapter, children}: {adapter: XUploadAdapter; children: React.ReactNode}) {
  const value = useMemo(() => adapter, [adapter]);
  return <XUploadContext.Provider value={value}>{children}</XUploadContext.Provider>;
}

/**
 * 「未注入」警告只在一处触发，且延后一个宏任务再判定：
 * App 常见做法是在 useEffect 里调用 setXUploadAdapter，首帧渲染时全局还是 Mock，
 * 立即警告会误报；延后到被动副作用执行完之后再判定，才能反映真实状态。
 */
function scheduleMissingAdapterWarning() {
  if (warnedNoAdapter) return;
  warnedNoAdapter = true;
  setTimeout(() => {
    if (globalAdapter === MOCK_FALLBACK) {
      console.warn(
        '[XUpload] 未注入上传适配器，当前使用 Mock 上传（结果不会真正上传）。' +
          '请在 App 入口调用 setXUploadAdapter(createMinioPresignedAdapter({...})) 或使用 <XUploadProvider>。',
      );
    }
  }, 0);
}

/** 上传组件内部取适配器：局部 > 全局 > Mock(仅首次 warn) */
export function useXUploadAdapter(localAdapter?: XUploadAdapter): XUploadAdapter {
  const contextAdapter = useContext(XUploadContext);
  const resolved = localAdapter ?? contextAdapter ?? globalAdapter;
  // 只有「局部/Context 都没给，且全局仍是 Mock 兜底」才算真正没注入
  if (!localAdapter && !contextAdapter && globalAdapter === MOCK_FALLBACK) {
    scheduleMissingAdapterWarning();
  }
  return resolved;
}

/** 便捷构造：MinIO 预签名适配器（re-export） */
export const createMinioAdapter = createMinioPresignedAdapter;
