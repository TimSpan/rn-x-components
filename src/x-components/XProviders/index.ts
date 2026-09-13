/**
 * ============================================================================
 * XProviders —— X 系列命令式全局组件（Provider 类）统一出口
 * ============================================================================
 *
 * 这个目录专门存放"Provider 类型"的 X 组件：需要在 App 根部挂载一次 Provider，
 * 之后通过 Service 在任意位置（含非组件环境，如 axios 拦截器）命令式调用。
 *
 * 目前三件套：
 * - XLoadingModal   全局 Loading（show/hide，引用计数，支持并发）
 * - XImagePreview   全屏图片预览（缩放/翻页手势，微信相册同款交互）
 * - XToast          全局轻提示（success/error/info/warning/loading，三位置）
 *
 * 统一挂载（App 根部，放 GestureHandlerRootView 内、SafeAreaProvider 内）：
 *
 *   <XLoadingModalProvider>
 *     <XImagePreviewProvider>
 *       <XToastProvider>
 *         {children}
 *       </XToastProvider>
 *     </XImagePreviewProvider>
 *   </XLoadingModalProvider>
 *
 * 完整可运行示例见同目录 usageExample.tsx。
 */
export {XLoadingModal, XLoadingModalProvider, XLoadingModalService} from './XLoadingModal';
export type {XLoadingModalProps, XLoadingModalConfig} from './XLoadingModal';

export {XImagePreview, XImagePreviewProvider, XImagePreviewService} from './XImagePreview';
export type {XImagePreviewParams} from './XImagePreview';

export {XToastProvider, XToastService, useXToast} from './XToast';
export type {XToastOptions, XToastType, XToastPosition} from './XToast';
