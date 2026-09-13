/**
 * ============================================================================
 * XUpload 内置适配器
 * ============================================================================
 * - createMinioPresignedAdapter：MinIO 预签名直传（changhu 同款后端约定，
 *   两步：换预签名 URL → XHR PUT 直传，可选 objectKey 换预览 URL）；
 * - createFormDataUploadAdapter：普通 multipart 直传；
 * - createMockUploadAdapter：演示/开发用假上传。
 *
 * 所有适配器的进度都通过 XHR upload.onprogress 上报（RN 原生支持）。
 * ============================================================================
 */

import type {XUploadAdapter, XUploadFile, XUploadResult} from './types';

/** XHR 上传（带进度） */
function xhrUpload(
  url: string,
  method: 'PUT' | 'POST',
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  headers: Record<string, string> | undefined,
  onProgress?: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [k, v] of Object.entries(headers ?? {})) {
      xhr.setRequestHeader(k, v);
    }
    if (onProgress) {
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.min(100, Math.round((e.loaded / e.total) * 100)));
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`upload failed: HTTP ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('network error'));
    xhr.send(body);
  });
}

/** 本地文件 → Blob（RN 中 fetch file:// 协议可用） */
async function fileToBlob(file: XUploadFile): Promise<Blob> {
  const res = await fetch(file.uri);
  return res.blob();
}

// ---------------------------------------------------------------------------
// MinIO 预签名直传适配器
// ---------------------------------------------------------------------------

export interface MinioPresignedAdapterOptions {
  /**
   * 换预签名 URL。changhu 后端约定示例：
   *   GET /file/getUploadUrl?fileName=xx&contentType=image/png
   *   → {objectKey, preSignedUrl}
   */
  getUploadUrl: (file: {name: string; mimeType: string}) => Promise<{objectKey: string; preSignedUrl: string}>;
  /** 可选：objectKey → 预览地址（changhu: GET /file/getPreviewUrl） */
  getPreviewUrl?: (objectKey: string) => Promise<string | undefined> | string | undefined;
  /** PUT 请求头（预签名一般无需额外鉴权头） */
  headers?: Record<string, string>;
}

/**
 * MinIO 预签名适配器。
 * 返回值：{objectKey, url}——url 优先用 getPreviewUrl 的回显地址，
 * 否则取预签名 URL 去掉 query 的裸直链。
 */
export function createMinioPresignedAdapter(options: MinioPresignedAdapterOptions): XUploadAdapter {
  return {
    async upload(file, onProgress) {
      const {objectKey, preSignedUrl} = await options.getUploadUrl({name: file.name, mimeType: file.mimeType});
      const blob = await fileToBlob(file);
      await xhrUpload(preSignedUrl, 'PUT', blob, options.headers, onProgress);
      let previewUrl: string | undefined;
      if (options.getPreviewUrl) {
        previewUrl = await options.getPreviewUrl(objectKey);
      }
      return {objectKey, url: previewUrl ?? preSignedUrl.split('?')[0]};
    },
  };
}

// ---------------------------------------------------------------------------
// 普通 multipart 直传适配器
// ---------------------------------------------------------------------------

export interface FormDataAdapterOptions {
  /** 上传接口地址（POST multipart/form-data） */
  url: string;
  /** 文件字段名，默认 'file' */
  fieldName?: string;
  headers?: Record<string, string>;
  /** 附加表单字段 */
  fields?: Record<string, string>;
  /** 从响应中解析结果，默认取 JSON 的 {url | data.url} */
  parseResponse?: (responseText: string) => XUploadResult;
}

export function createFormDataUploadAdapter(options: FormDataAdapterOptions): XUploadAdapter {
  const parse = options.parseResponse ?? (text => {
    try {
      const json = JSON.parse(text);
      return json?.data ?? json;
    } catch {
      return {};
    }
  });
  return {
    async upload(file, onProgress) {
      const formData = new FormData();
      // RN 的 FormData 文件项格式
      formData.append(options.fieldName ?? 'file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      for (const [k, v] of Object.entries(options.fields ?? {})) {
        formData.append(k, v);
      }
      await xhrUpload(options.url, 'POST', formData, options.headers, onProgress);
      return {};
    },
  };
}

// ---------------------------------------------------------------------------
// Mock 适配器（演示用）
// ---------------------------------------------------------------------------

export function createMockUploadAdapter(durationMs = 1200): XUploadAdapter {
  return {
    async upload(file, onProgress) {
      const start = Date.now();
      return new Promise<XUploadResult>(resolve => {
        const timer = setInterval(() => {
          const ratio = Math.min(1, (Date.now() - start) / durationMs);
          onProgress?.(Math.round(ratio * 100));
          if (ratio >= 1) {
            clearInterval(timer);
            resolve({url: file.uri});
          }
        }, 100);
      });
    },
  };
}
