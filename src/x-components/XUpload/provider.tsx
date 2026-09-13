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

/** 全局默认适配器（初始为 Mock，避免演示页崩溃） */
let globalAdapter: XUploadAdapter = createMockUploadAdapter();
let warnedNoAdapter = false;

/** 注入全局默认适配器（App 启动时调用一次） */
export function setXUploadAdapter(adapter: XUploadAdapter) {
  globalAdapter = adapter;
}

/** 获取全局默认适配器 */
export function getXUploadAdapter(): XUploadAdapter {
  return globalAdapter;
}

const XUploadContext = createContext<XUploadAdapter | null>(null);

export function XUploadProvider({adapter, children}: {adapter: XUploadAdapter; children: React.ReactNode}) {
  const value = useMemo(() => adapter, [adapter]);
  return <XUploadContext.Provider value={value}>{children}</XUploadContext.Provider>;
}

/** 上传组件内部取适配器：局部 > 全局 > Mock(仅首次 warn) */
export function useXUploadAdapter(localAdapter?: XUploadAdapter): XUploadAdapter {
  const contextAdapter = useContext(XUploadContext);
  const resolved = localAdapter ?? contextAdapter ?? globalAdapter;
  if (!localAdapter && !contextAdapter && !warnedNoAdapter) {
    warnedNoAdapter = true;
    console.warn(
      '[XUpload] 未注入上传适配器，当前使用 Mock 上传（结果不会真正上传）。' +
        '请在 App 入口调用 setXUploadAdapter(createMinioPresignedAdapter({...})) 或使用 <XUploadProvider>。',
    );
  }
  return resolved;
}

/** 便捷构造：MinIO 预签名适配器（re-export） */
export const createMinioAdapter = createMinioPresignedAdapter;
