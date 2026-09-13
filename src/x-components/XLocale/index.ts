/**
 * ============================================================================
 * XLocale —— X-Components 内置轻量国际化（zh-CN / en-US）
 * ============================================================================
 *
 * 【设计取向】
 * 组件库只需要"组件内文案"的多语言（取消/确定/上传中…），为此引 i18next 这类
 * 大依赖不值当。这里用 zustand 全局单例 + 双语字典 + 模板插值，几十行搞定：
 *
 * - useXLocale()：React 组件内用，返回 {locale, setLocale, t}；
 * - xT()：命令式场景用（Toast、事件回调等非组件上下文）；
 * - setXLocale('en-US')：全局切换，所有组件即时更新；
 * - t('uploadingPercent', {n: 66}) → '上传中 66%' / 'Uploading 66%'。
 *
 * 【接入业务层 i18n】
 * 业务若已有自己的 i18n 体系，可通过 setXLocale 同步业务语言；本模块只负责
 * X 组件内部文案，不与应用页面文案耦合。
 * ============================================================================
 */
import {useCallback} from 'react';
import {create} from 'zustand';

/** 支持的语言 */
export type XLocale = 'zh-CN' | 'en-US';

/** 文案 key（字典的并集，TS 会约束组件里不许写错 key） */
export type XLocaleKey =
  // 通用
  | 'cancel'
  | 'confirm'
  | 'done'
  | 'close'
  | 'clear'
  | 'reset'
  | 'operationIrreversible'
  | 'expandSearch'
  | 'collapseSearch'
  | 'delete'
  | 'retry'
  | 'loading'
  | 'noData'
  | 'search'
  | 'pleaseInput'
  | 'pleaseInputLabel'
  | 'pleaseSelect'
  | 'pleaseSelectLabel'
  | 'cannotBeEmpty'
  // 日期/日历
  | 'selectDate'
  | 'selectTime'
  | 'selectDateTime'
  | 'today'
  | 'weekScopeTip'
  // 签名
  | 'rewrite'
  | 'saveChar'
  | 'savedChars'
  | 'signHint'
  | 'undo'
  // 录音
  | 'tapToRecord'
  | 'recording'
  | 'stopRecord'
  | 'play'
  | 'pause'
  | 'rerecord'
  | 'useRecording'
  | 'maxDurationTip'
  | 'micPermissionTip'
  // 上传
  | 'uploadingPercent'
  | 'uploadFailed'
  | 'maxCountTip'
  // 车牌
  | 'platePlaceholder'
  | 'newEnergyTip'
  // 主题/语言演示
  | 'themeMode'
  | 'language'
  | 'light'
  | 'dark'
  | 'followSystem';

/** zh-CN 字典 */
const zhCN: Record<XLocaleKey, string> = {
  cancel: '取消',
  confirm: '确定',
  done: '完成',
  close: '关闭',
  clear: '清空',
  reset: '重置',
  operationIrreversible: '此操作不可撤销',
  expandSearch: '展开搜索',
  collapseSearch: '收起搜索',
  delete: '删除',
  retry: '重试',
  loading: '加载中…',
  noData: '暂无数据',
  search: '搜索',
  pleaseInput: '请输入',
  pleaseInputLabel: '请输入{n}',
  pleaseSelect: '请选择',
  pleaseSelectLabel: '请选择{n}',
  cannotBeEmpty: '不能为空',
  selectDate: '请选择日期',
  selectTime: '请选择时间',
  selectDateTime: '请选择日期时间',
  today: '今天',
  weekScopeTip: '本周',
  rewrite: '重写',
  saveChar: '存字',
  savedChars: '已存 {n} 字',
  signHint: '请在格内签名',
  undo: '撤销',
  tapToRecord: '点击开始录音',
  recording: '录音中',
  stopRecord: '停止',
  play: '播放',
  pause: '暂停',
  rerecord: '重新录制',
  useRecording: '使用录音',
  maxDurationTip: '最长录制 {n} 秒',
  micPermissionTip: '需要麦克风权限才能录音',
  uploadingPercent: '上传中 {n}%',
  uploadFailed: '上传失败',
  maxCountTip: '最多选择 {n} 张',
  platePlaceholder: '点击输入车牌号',
  newEnergyTip: '新能源',
  themeMode: '主题模式',
  language: '语言',
  light: '浅色',
  dark: '深色',
  followSystem: '跟随系统',
};

/** en-US 字典 */
const enUS: Record<XLocaleKey, string> = {
  cancel: 'Cancel',
  confirm: 'OK',
  done: 'Done',
  close: 'Close',
  clear: 'Clear',
  reset: 'Reset',
  operationIrreversible: 'This action cannot be undone',
  expandSearch: 'Expand',
  collapseSearch: 'Collapse',
  delete: 'Delete',
  retry: 'Retry',
  loading: 'Loading…',
  noData: 'No data',
  search: 'Search',
  pleaseInput: 'Please input',
  pleaseInputLabel: 'Please input {n}',
  pleaseSelect: 'Please select',
  pleaseSelectLabel: 'Please select {n}',
  cannotBeEmpty: 'cannot be empty',
  selectDate: 'Select date',
  selectTime: 'Select time',
  selectDateTime: 'Select date & time',
  today: 'Today',
  weekScopeTip: 'This week',
  rewrite: 'Redo',
  saveChar: 'Save',
  savedChars: '{n} chars saved',
  signHint: 'Sign inside the box',
  undo: 'Undo',
  tapToRecord: 'Tap to record',
  recording: 'Recording',
  stopRecord: 'Stop',
  play: 'Play',
  pause: 'Pause',
  rerecord: 'Re-record',
  useRecording: 'Use',
  maxDurationTip: 'Max {n}s',
  micPermissionTip: 'Microphone permission is required',
  uploadingPercent: 'Uploading {n}%',
  uploadFailed: 'Upload failed',
  maxCountTip: 'Up to {n} items',
  platePlaceholder: 'Tap to enter plate no.',
  newEnergyTip: 'New Energy',
  themeMode: 'Theme mode',
  language: 'Language',
  light: 'Light',
  dark: 'Dark',
  followSystem: 'System',
};

const DICTIONARIES: Record<XLocale, Record<XLocaleKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

/** 星期短标签（周一开始，与 XCalendar 默认 weekStartsOn=1 对齐） */
export const X_WEEKDAYS: Record<XLocale, string[]> = {
  'zh-CN': ['一', '二', '三', '四', '五', '六', '日'],
  'en-US': ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
};

/** 英文月份全名（en 标题用；zh 用数字月份拼接） */
const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "YYYY年M月" / "September 2026" 的本地化月标题 */
export function xMonthTitle(locale: XLocale, year: number, month1based: number): string {
  return locale === 'zh-CN' ? `${year}年${month1based}月` : `${EN_MONTHS[month1based - 1]} ${year}`;
}

// ---------------------------------------------------------------------------
// 全局语言状态（单例）
// ---------------------------------------------------------------------------
interface XLocaleState {
  locale: XLocale;
  setLocale: (locale: XLocale) => void;
}

const useXLocaleStore = create<XLocaleState>(set => ({
  locale: 'zh-CN',
  setLocale: locale => set({locale}),
}));

/** 全局切换语言（命令式） */
export function setXLocale(locale: XLocale) {
  useXLocaleStore.getState().setLocale(locale);
}

/** 读取当前语言（非组件上下文） */
export function getXLocale(): XLocale {
  return useXLocaleStore.getState().locale;
}

/** 插值：'{n} 张' + {n:3} → '3 张' */
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    params[name] !== undefined ? String(params[name]) : `{${name}}`,
  );
}

/**
 * 组件内使用的翻译 Hook。
 * t 引用随 locale 变化而更新（useCallback 依赖 locale），组件自然重渲染。
 */
export function useXLocale() {
  const locale = useXLocaleStore(s => s.locale);
  const setLocale = useXLocaleStore(s => s.setLocale);
  const t = useCallback(
    (key: XLocaleKey, params?: Record<string, string | number>): string =>
      interpolate(DICTIONARIES[locale][key], params),
    [locale],
  );
  return {locale, setLocale, t};
}

/** 命令式翻译：Toast / 事件回调等非组件上下文里用（取当前语言一次性求值） */
export function xT(key: XLocaleKey, params?: Record<string, string | number>): string {
  const locale = useXLocaleStore.getState().locale;
  return interpolate(DICTIONARIES[locale][key], params);
}
