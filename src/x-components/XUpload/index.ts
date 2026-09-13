/**
 * XUpload 统一出口
 */
export type {XUploadAdapter, XUploadFile, XUploadResult} from './types';
export {createMinioPresignedAdapter, createFormDataUploadAdapter, createMockUploadAdapter} from './adapters';
export type {MinioPresignedAdapterOptions, FormDataAdapterOptions} from './adapters';
export {XUploadProvider, setXUploadAdapter, getXUploadAdapter, useXUploadAdapter, createMinioAdapter} from './provider';
export {pickImageFiles, pickVideoFile, compressImage, uploadBase64, takePicture, takeVideo} from './helpers';
export {XUploadImage} from './XUploadImage';
export type {XUploadImageProps} from './XUploadImage';
export {XUploadVideo} from './XUploadVideo';
export type {XUploadVideoProps} from './XUploadVideo';
