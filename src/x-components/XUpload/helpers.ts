/**
 * ============================================================================
 * XUpload 辅助 —— 拍照/选图/选视频/压缩/base64 上传
 * ============================================================================
 * 取图统一走 **react-native-image-picker**（RN 生态最通用的一套，直接调系统相机/相册）：
 * - 拍照/录像：launchCamera（走系统相机 Intent，不需要额外 Activity 配置）
 * - 相册：launchImageLibrary（支持多选、限制数量）
 *
 * 不用 expo-image-picker：在裸 RN 工程里它的 launchCameraAsync 经常起不来相机
 * （点了"拍照"什么也不发生），且错误对业务不可读。
 *
 * 压缩仍用 expo-image-manipulator，base64 落盘仍用 expo-file-system。
 * ============================================================================
 */

import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import type {Asset, ImageLibraryOptions} from 'react-native-image-picker';
import {SaveFormat, manipulateAsync} from 'expo-image-manipulator';
import {EncodingType, File, Paths} from 'expo-file-system';
import {Alert, Linking, PermissionsAndroid, Platform} from 'react-native';
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
function toUploadFile(asset?: Asset): XUploadFile | null {
  if (!asset?.uri) return null;
  const mime = String(asset.type ?? 'image/jpeg');
  return {
    uri: asset.uri,
    name: asset.fileName ?? asset.uri.split('/').pop() ?? `file-${Date.now()}`,
    mimeType: mime,
    size: asset.fileSize,
  };
}

/** picker 的错误统一转成可读文案 */
function pickError(res: {errorCode?: string; errorMessage?: string}): never {
  throw new Error(`调起相机/相册失败：${res.errorMessage ?? res.errorCode ?? '未知错误'}（请确认设备有可用相机应用，且已授予相机权限）`);
}

/**
 * 申请相机权限；未授予时抛出「可读、可定位」的错误。
 *
 * Android 必须先拿到 CAMERA 运行时权限（清单里已声明），否则系统相机 Intent 可能静默失败；
 * iOS 由系统在首次调用相机时弹窗，这里直接放行。
 */
export async function ensureCameraPermission(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
    title: '相机权限申请',
    message: '需要使用相机来拍摄照片以及录制视频',
    buttonNegative: '取消',
    buttonPositive: '同意',
  });
  if (result === PermissionsAndroid.RESULTS.GRANTED) return;
  throw new Error('相机权限已被拒绝。请到 系统设置 → 应用 → 权限 中手动开启「相机」权限后重试。');
}

/** 拍照；用户取消返回 null */
export async function takePicture(options?: {quality?: number}): Promise<XUploadFile | null> {
  await ensureCameraPermission();
  const res = await launchCamera({
    mediaType: 'photo',
    saveToPhotos: false,
    quality: (options?.quality ?? 0.9) as 0.9,
  });
  if (res.didCancel) return null;
  if (res.errorCode) pickError(res);
  return toUploadFile(res.assets?.[0]);
}

/** 录像；用户取消返回 null */
export async function takeVideo(options?: {videoMaxDuration?: number}): Promise<XUploadFile | null> {
  await ensureCameraPermission();
  const res = await launchCamera({
    mediaType: 'video',
    videoQuality: 'high',
    durationLimit: options?.videoMaxDuration ?? 60,
    saveToPhotos: false,
  });
  if (res.didCancel) return null;
  if (res.errorCode) pickError(res);
  return toUploadFile(res.assets?.[0]);
}

/** 相册选图（可多选），返回本机文件列表 */
export async function pickImageFiles(options?: {max?: number; quality?: number}): Promise<XUploadFile[]> {
  const libraryOptions: ImageLibraryOptions = {
    mediaType: 'photo',
    selectionLimit: options?.max ?? 9,
    quality: (options?.quality ?? 0.9) as 0.9,
  };
  const res = await launchImageLibrary(libraryOptions);
  if (res.didCancel) return [];
  if (res.errorCode) pickError(res);
  return (res.assets ?? []).map(toUploadFile).filter((f): f is XUploadFile => !!f);
}

/** 相册选视频（单个），取消返回 null */
export async function pickVideoFile(_options?: {videoMaxDuration?: number}): Promise<XUploadFile | null> {
  const res = await launchImageLibrary({mediaType: 'video'});
  if (res.didCancel) return null;
  if (res.errorCode) pickError(res);
  return toUploadFile(res.assets?.[0]);
}

/**
 * 压缩图片（等比缩到指定宽度 + JPEG 质量），返回新文件。
 * 小于目标宽度的图不压缩直接返回。
 */
export async function compressImage(file: XUploadFile, maxWidth = 1280, quality = 0.6): Promise<XUploadFile> {
  try {
    const result = await manipulateAsync(file.uri, [{resize: {width: maxWidth}}], {compress: quality, format: SaveFormat.JPEG});
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
