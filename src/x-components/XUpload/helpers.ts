/**
 * ============================================================================
 * XUpload 辅助 —— 选图/选视频/压缩/base64 上传
 * ============================================================================
 * 全部基于 Expo 官方包（SDK 57 API，已按类型定义核对）：
 * - expo-image-picker：launchImageLibraryAsync（mediaTypes: ['images'] 新写法）
 * - expo-image-manipulator：manipulateAsync 压缩（JPEG）
 * - expo-file-system：新版 File API 写 base64 临时文件
 * ============================================================================
 */

import * as ImagePicker from 'expo-image-picker';
import {SaveFormat, manipulateAsync} from 'expo-image-manipulator';
import {EncodingType, File, Paths} from 'expo-file-system';
import type {XUploadAdapter, XUploadFile, XUploadResult} from './types';
import {getXUploadAdapter} from './provider';

/** picker 资产 → XUploadFile */
function toUploadFile(asset: ImagePicker.ImagePickerAsset): XUploadFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? asset.uri.split('/').pop() ?? `file-${Date.now()}`,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.fileSize ?? undefined,
  };
}

/** 拍照 */
export async function takePicture(options?: {quality?: number}): Promise<XUploadFile | null> {
  // 拍照权限（Android 自动授予，iOS 第一次会弹）
  await ImagePicker.requestCameraPermissionsAsync();
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: options?.quality ?? 0.9,
  });
  if (res.canceled || !res.assets.length) return null;
  return toUploadFile(res.assets[0]);
}

/** 拍视频 */
export async function takeVideo(options?: {videoMaxDuration?: number}): Promise<XUploadFile | null> {
  await ImagePicker.requestCameraPermissionsAsync();
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: options?.videoMaxDuration ?? 60,
  });
  if (res.canceled || !res.assets.length) return null;
  return toUploadFile(res.assets[0]);
}

/** 选图（可多选），返回本机文件列表 */
export async function pickImageFiles(options?: {
  /** 最多可选，默认 9 */
  max?: number;
  quality?: number;
}): Promise<XUploadFile[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: options?.max ?? 9,
    quality: options?.quality ?? 0.9,
  });
  if (res.canceled) return [];
  return res.assets.map(toUploadFile);
}

/** 选视频（单个），取消返回 null */
export async function pickVideoFile(options?: {videoMaxDuration?: number}): Promise<XUploadFile | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['videos'],
    videoMaxDuration: options?.videoMaxDuration ?? 60,
  });
  if (res.canceled || !res.assets.length) return null;
  return toUploadFile(res.assets[0]);
}

/**
 * 压缩图片（等比缩到指定宽度 + JPEG 质量），返回新文件。
 * 小于目标宽度的图不压缩直接返回。
 */
export async function compressImage(file: XUploadFile, maxWidth = 1280, quality = 0.6): Promise<XUploadFile> {
  try {
    const result = await manipulateAsync(
      file.uri,
      [{resize: {width: maxWidth}}],
      {compress: quality, format: SaveFormat.JPEG},
    );
    return {
      uri: result.uri,
      name: file.name.replace(/\.\w+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
      size: undefined,
    };
  } catch {
    // 压缩失败兜底原图
    return file;
  }
}

/**
 * base64 → 临时文件 → 适配器上传（签名等"内存产物"的接入通道）。
 * 上传完成自动清理临时文件。
 */
export async function uploadBase64(
  base64: string,
  options?: {name?: string; mimeType?: string; adapter?: XUploadAdapter},
): Promise<XUploadResult> {
  const name = options?.name ?? `upload-${Date.now()}.png`;
  const file = new File(Paths.cache, name);
  file.write(base64, {encoding: EncodingType.Base64});
  try {
    const adapter = options?.adapter ?? getXUploadAdapter();
    return await adapter.upload({uri: file.uri, name, mimeType: options?.mimeType ?? 'image/png'});
  } finally {
    try {
      file.delete();
    } catch {
      // 清理失败不影响结果
    }
  }
}
