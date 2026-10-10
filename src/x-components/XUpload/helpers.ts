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
import {Alert, Linking} from 'react-native';
import type {XUploadAdapter, XUploadFile, XUploadResult} from './types';
import {getXUploadAdapter} from './provider';

/**
 * 取图/取视频失败时统一弹窗：把"看不见的异常"变成用户可读提示，
 * 并给一个「去设置」入口（权限被永久拒绝时的唯一出路）。
 */
export function showPickErrorAlert(message: string): void {
  Alert.alert('无法打开相机/相册', message, [
    {text: '取消', style: 'cancel'},
    {text: '去设置', onPress: () => void Linking.openSettings()},
  ]);
}

/** picker 资产 → XUploadFile */
function toUploadFile(asset: ImagePicker.ImagePickerAsset): XUploadFile {
  return {
    uri: asset.uri,
    name: asset.fileName ?? asset.uri.split('/').pop() ?? `file-${Date.now()}`,
    mimeType: asset.mimeType ?? 'application/octet-stream',
    size: asset.fileSize ?? undefined,
  };
}

/**
 * 申请相机权限；未授予时抛出「可读、可定位」的错误。
 *
 * 背景：expo-image-picker 的 launchCameraAsync 内部本身也会申请 CAMERA 并在被拒时抛
 * UserRejectedPermissionsException / MissingActivityToHandleIntent，但那两个错误对业务
 * 不可读，且很容易在业务侧的 async 流程里被吞掉（表现为"点了拍照没任何反应"）。
 * 这里提前申请并给出明确文案，配合组件侧 try/catch 弹 Alert，问题即可见。
 */
export async function ensureCameraPermission(): Promise<void> {
  const res = await ImagePicker.requestCameraPermissionsAsync();
  if (res.granted) return;
  throw new Error(
    res.canAskAgain
      ? '未获得相机权限。请在系统弹出的权限框中允许「相机」后重试。'
      : '相机权限已被拒绝。请到 系统设置 → 应用 → 权限 中手动开启「相机」权限后重试。',
  );
}

/** 拍照 */
export async function takePicture(options?: {quality?: number}): Promise<XUploadFile | null> {
  await ensureCameraPermission();
  try {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: options?.quality ?? 0.9,
    });
    if (res.canceled || !res.assets.length) return null;
    return toUploadFile(res.assets[0]);
  } catch (e) {
    throw new Error(`调起相机失败：${(e as Error)?.message ?? e}（请确认设备有可用相机应用，且已授予相机权限）`);
  }
}

/** 拍视频 */
export async function takeVideo(options?: {videoMaxDuration?: number}): Promise<XUploadFile | null> {
  await ensureCameraPermission();
  try {
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ['videos'],
      videoMaxDuration: options?.videoMaxDuration ?? 60,
    });
    if (res.canceled || !res.assets.length) return null;
    return toUploadFile(res.assets[0]);
  } catch (e) {
    throw new Error(`调起相机失败：${(e as Error)?.message ?? e}（请确认设备有可用相机应用，且已授予相机权限）`);
  }
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
