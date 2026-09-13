/**
 * ============================================================================
 * X-Components 统一出口（barrel）
 * ============================================================================
 *
 * 所有 X 打头组件从这里导入：
 * import {XButton, XForm, XRadio, XCheckbox, XProgress, XDivider} from '@/components/X-Components';
 * import {XActionSheet, XPicker, XPickerDate, XConfirmForm, confirm} from '@/components/X-Components';
 *
 * 也可以从子目录直接导入具体组件。
 *
 * 【弹窗族组件关系图】（原 DuxPopup 整体迁入，组件名加 X 前缀）
 *                          XPopupProvider（App 根部）
 *                           ├── XConfirmForm（命令式确认框实例）
 *                           └── XTopView（全局宿主：画所有弹层）
 *                                     │
 *                 useXTopViewStore（zustand：add/update/remove）
 *                                     │
 *                         ┌───────────┴───────────┐
 *                         │                       │
 *                     XPullView               XAnimatedView（通用动画引擎）
 *                  （通用弹出层，核心）         anim() 链式构建器
 *                         │
 *         ┌───────────────┼────────────────┐
 *         │               │                │
 *    XActionSheet      XPicker        XPickerDate
 *    （底部菜单）    （单列滚轮）   （日期时间滚轮，format 定列）
 *                         │                │
 *                         └───────┬────────┘
 *                                 │
 *                             XWheel（通用滚轮列）
 *         │
 *     XModalForm（居中弹层：确认/表单）
 *         │
 *     XConfirmForm（命令式封装：show() → Promise<boolean>）
 *
 * 【学习路径建议】
 * 1. 先读 XPullView —— 整套架构的核心（TopView 挂载 + 入场/离场动画）；
 * 2. 再读 XTopViewStore / XTopView —— 全局宿主的原理；
 * 3. 然后读 XActionSheet / XPicker / XModalForm —— 学会"组合复用"XPullView；
 * 4. 最后读 XConfirmForm —— 命令式 API（Promise）的实现套路。
 * ============================================================================
 */

// ---------------------------------------------------------------------------
// 基础组件（对标 antd）
// ---------------------------------------------------------------------------
export {default as XButton} from './XButton';
export type {XButtonProps, XButtonType, XButtonSize, XButtonShape} from './XButton';

export {default as XDivider} from './XDivider';
export type {XDividerProps} from './XDivider';

export {default as XInput, XTextArea} from './XInput';
export type {XInputProps} from './XInput';

export {XImage} from './XImage';
export type {ImageWithLoaderProps as XImageProps} from './XImage';

export {default as XRadio} from './XRadio';
export type {XRadioProps, XRadioGroupProps, XRadioButtonProps, XRadioChangeEvent} from './XRadio';

export {default as XCheckbox} from './XCheckbox';
export type {XCheckboxProps, XCheckboxGroupProps, XCheckboxChangeEvent} from './XCheckbox';

export {default as XProgress} from './XProgress';
export type {XProgressProps} from './XProgress';

export {default as XTag} from './XTag';
export type {XTagProps, XTagType, XTagSize, XTagVariant} from './XTag';

export {default as XForm, useForm as XFormUseForm} from './XForm';
export type {XFormProps, XFormItemProps, XRule, XRuleObject, XNamePath, XFormInstance, XErrorEntity, XFieldData, XValidateErrorEntity, XValidateTrigger} from './XForm';

export {default as XCascadeSelect} from './XCascadeSelect';
export type {XCascadeSelectProps, XCascadeOption} from './XCascadeSelect';

export {default as XMultiSelect} from './XMultiSelect';
export type {XMultiSelectProps} from './XMultiSelect';

export {default as XFormPro} from './XFormPro';
export {registerXFormProRenderer} from './XFormPro';
export type {
  XFormModelValue,
  XOptionItem,
  XFormProRule,
  XBaseFormItemProps,
  XFormProItemProps,
  XFormItemOptions,
  XFormProProps,
  XFormProInst,
  XFm,
  XFormProCustomRenderer,
} from './XFormPro';

// ---------------------------------------------------------------------------
// 复合组件（列表头折叠搜索面板，原 components/AnimatedSearchPanel 迁入）
// ---------------------------------------------------------------------------
export {default as XAnimatedSearchPanel} from './XAnimatedSearchPanel';
export type {XAnimatedSearchPanelProps} from './XAnimatedSearchPanel';

// ---------------------------------------------------------------------------
// 弹窗族（原 DuxPopup 迁入）
// ---------------------------------------------------------------------------
export * from './XAnimatedView';
export * from './XPullView';
export * from './XTopView';
export * from './XTopViewStore';
export * from './XActionSheet';
export * from './XWheel';
export * from './XPicker';
export * from './XPickerDate';
export * from './XModalForm';
export * from './XConfirmForm';
export * from './XPopupProvider';

// ---------------------------------------------------------------------------
// 命令式全局组件（Provider 类：Loading / 图片预览 / Toast，见 XProviders/usageExample.tsx）
// ---------------------------------------------------------------------------
export {
  XLoadingModal,
  XLoadingModalProvider,
  XLoadingModalService,
  XImagePreview,
  XImagePreviewProvider,
  XImagePreviewService,
  XToastProvider,
  XToastService,
  useXToast,
} from './XProviders';
export type {XLoadingModalProps, XLoadingModalConfig, XImagePreviewParams, XToastOptions, XToastType, XToastPosition} from './XProviders';

export {xTheme} from './theme';
export {lightTokens, darkTokens, setXThemeMode, getXThemeMode, useXThemeMode, useXTheme, useXThemeScheme} from './theme';
export type {XTheme, XThemeMode, XThemeScheme} from './theme';

// ---------------------------------------------------------------------------
// 国际化（中英）
// ---------------------------------------------------------------------------
export {useXLocale, setXLocale, getXLocale, xT, xMonthTitle, X_WEEKDAYS} from './XLocale';
export type {XLocale, XLocaleKey} from './XLocale';

// ---------------------------------------------------------------------------
// 轮播图 / 选项卡 / 电梯楼层
// ---------------------------------------------------------------------------
export {XCarousel} from './XCarousel';
export type {XCarouselProps, XCarouselItem} from './XCarousel';

export {XTabs, XTabPane} from './XTabs';
export type {XTabsProps, XTabPaneProps} from './XTabs';
// XElevator 已废弃（实现质量不达标，代码保留在 src/_deprecated/），不再导出/发布

// ---------------------------------------------------------------------------
// 下拉菜单
// ---------------------------------------------------------------------------
export {default as XDropdownMenu, XDropdownMenuItem} from './XDropdownMenu';
export type {XDropdownMenuProps, XDropdownMenuItemProps, XMenuOption} from './XDropdownMenu';

// ---------------------------------------------------------------------------
// 日历 / 弹窗日历
// ---------------------------------------------------------------------------
export {XCalendar} from './XCalendar';
export type {XCalendarProps, XCalendarMode, XCalendarValue} from './XCalendar';
export {XCalendarPopup} from './XCalendar/XCalendarPopup';
export type {XCalendarPopupProps} from './XCalendar/XCalendarPopup';

// ---------------------------------------------------------------------------
// 录音
// ---------------------------------------------------------------------------
export {XRecord} from './XRecord';
export type {XRecordProps, XRecordValue} from './XRecord';

// ---------------------------------------------------------------------------
// 数字键盘（含弹出模式）
// ---------------------------------------------------------------------------
export {XNumberKeyboard, XNumberKeyboardPopup} from './XNumberKeyboard';
export type {XNumberKeyboardProps, XNumberKeyboardPopupProps} from './XNumberKeyboard';

// ---------------------------------------------------------------------------
// 车牌号输入
// ---------------------------------------------------------------------------
export {default as XLicensePlate, XLicensePlateKeyboard} from './XLicensePlate';
export type {XLicensePlateProps, XLicensePlateKeyboardProps, XLicensePlatePhase} from './XLicensePlate';

// ---------------------------------------------------------------------------
// 图表（SVG 轻量三件套）
// ---------------------------------------------------------------------------
export {XLineChart, XBarChart, XPieChart} from './XChart';
export type {XLineChartProps, XBarChartProps, XBarChartItem, XPieChartProps, XPieChartItem} from './XChart';

// ---------------------------------------------------------------------------
// 签名（普通 + Skia 逐字）
// ---------------------------------------------------------------------------
export {XSignature} from './XSignature';
export type {XSignatureProps} from './XSignature';
export {XSignatureSkia} from './XSignature/XSignatureSkia';
export type {
  XSignatureSkiaProps,
  XSignatureSkiaValue,
  XSignatureCharacter,
  XSignatureStroke,
} from './XSignature/XSignatureSkia';

// ---------------------------------------------------------------------------
// 上传（适配器模式：普通 multipart + MinIO 预签名直传）
// ---------------------------------------------------------------------------
export * from './XUpload';

// ---------------------------------------------------------------------------
// 主题色 + 全局主题控件
// ---------------------------------------------------------------------------
export {ThemeControls} from './XTheme/ThemeControls';
export {useXBrandStore, setXBrand, setXBrandByName, X_BRAND_PRESETS} from './XTheme/BrandColor';
export type {XBrandPreset} from './XTheme/BrandColor';

// ---------------------------------------------------------------------------
// 视频预览
// ---------------------------------------------------------------------------
export {XVideoPreview} from './XVideoPreview';
export type {XVideoPreviewProps} from './XVideoPreview';

