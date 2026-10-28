/**
 * XUpload 类型定义 —— 上传文件 / 上传结果 / 适配器协议
 */

/** 待上传文件（本机） */
export interface XUploadFile {
  /** 本地地址 file://... */
  uri: string;
  /** 文件名（含扩展名） */
  name: string;
  /** MIME 类型 */
  mimeType: string;
  /** 字节数（可选） */
  size?: number;
}

/** 上传结果：MinIO/OSS 模式带 objectKey；直传模式带 url */
export interface XUploadResult {
  /** 可预览的地址（直链/预签名回显/本机地址） */
  url?: string;
  /** 对象 key（预签名模式核心字段，回显时再换预签名 URL） */
  objectKey?: string;
  /** 透传后端返回的其余字段 */
  [key: string]: any;
}

/**
 * 上传适配器协议 —— UI 与上传逻辑的唯一边界。
 * 业务实现一个 upload 即可接入任意后端（MinIO 预签名 / 直传 / 七牛...）。
 */
export interface XUploadAdapter {
  /** 上传一个文件；onProgress 回传 0~100 */
  upload: (file: XUploadFile, onProgress?: (percent: number) => void) => Promise<XUploadResult>;
}

/**
 * 取图能力注入（宿主可换成自己的 picker 实现）。
 *
 * 库内置用 react-native-image-picker；宿主也可以换成自己的实现
 * （典型症状：点"拍照"什么也不发生）。宿主可以注入自己那套
 * （例如 react-native-image-picker），XUploadImage / XUploadVideo 会优先用它。
 *
 * 约定：用户取消 / 无权限时返回 null（不要抛错），
 * 抛错会被组件当成"取图失败"弹提示。
 */
export interface XUploadPicker {
  /** 拍照，返回本地文件；取消返回 null */
  takePicture?: (options?: {quality?: number}) => Promise<XUploadFile | null>;
  /** 录像，返回本地文件；取消返回 null */
  takeVideo?: (options?: {videoMaxDuration?: number}) => Promise<XUploadFile | null>;
  /** 相册多选图片 */
  pickImages?: (options?: {max?: number; quality?: number}) => Promise<XUploadFile[]>;
  /** 相册选视频 */
  pickVideo?: (options?: {videoMaxDuration?: number}) => Promise<XUploadFile | null>;
}
