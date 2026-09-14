/**
 * ============================================================================
 * X-Components 共享设计 token（对标 antd v5 design token，取值做 RN 适配）
 * ============================================================================
 *
 * 【v2：暗黑模式】
 * - 本文件现在维护两套完整 token：lightTokens / darkTokens，键完全一致；
 * - 组件统一用 useXTheme() 取当前模式的 token（跟随系统 + 可强制覆盖），
 *   旧代码里的 `import {xTheme} from '../theme'` 仍然有效（xTheme === lightTokens），
 *   但只有走 useXTheme() 才能获得暗黑适配；
 * - 尺寸类 token（圆角/字号/高度/时长）两种模式共用一套值，只有颜色不同。
 *
 * 【切换模式】
 * - setXThemeMode('light' | 'dark' | 'system')，全局生效（zustand）；
 * - 默认 'system'：跟随系统外观（useColorScheme）。
 *
 * 色值来源约定：
 * - 主色沿用项目既有主色 #2080F0（原 DuxPopup 弹窗族、现 X 弹窗族同款）；
 * - 浅色语义色（成功/警告/错误/边框/文字灰阶）按 antd v5 默认 token 取值；
 * - 暗黑文字灰阶按 antd v5 dark 算法（白色低透明度阶梯），
 *   容器/布局底色对齐项目 App 级 Colors.dark（#000000 / #212225），保证组件
 *   贴合应用页面背景而不是自成一套。
 * ============================================================================
 */
export const lightTokens = {
  /** 品牌色（项目主色） */
  colorPrimary: '#2080F0',
  /** 主色按压反馈用的浅主色（对标 antd colorPrimaryActive/BorderHover 一档） */
  colorPrimaryActive: '#0E6FD8',
  /** 主色弱背景（对标 antd colorPrimaryBg） */
  colorPrimaryBg: '#E6F1FE',

  colorSuccess: '#52C41A',
  colorSuccessBg: '#F6FFED',

  colorWarning: '#FAAD14',
  colorWarningBg: '#FFFBE6',

  colorError: '#FF4D4F',
  colorErrorBg: '#FFF2F0',

  /** 主文字（对标 antd colorText：rgba(0,0,0,0.88)） */
  colorText: 'rgba(0, 0, 0, 0.88)',
  /** 次要文字（对标 antd colorTextSecondary） */
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',
  /** 实底主色上的文字 / 图标色（对标 antd colorTextLightSolid：primary 按钮、选中态文字用） */
  colorTextLightSolid: '#FFFFFF',

  /** 描边色（对标 antd colorBorder） */
  colorBorder: '#D9D9D9',
  /** 弱分割线（对标 antd colorSplit） */
  colorSplit: '#F0F0F0',
  /** 进度条轨道底色（比 colorSplit 深一档，白底卡片上肉眼可见） */
  colorProgressTrack: '#E5E7EB',
  colorBgContainer: '#FFFFFF',
  colorBgLayout: '#F5F5F5',
  /** 禁用态容器底色（对标 antd colorBgContainerDisabled） */
  colorBgContainerDisabled: 'rgba(0, 0, 0, 0.04)',
  /** 禁用态主色（浅一档的主色，用于主按钮禁用底色） */
  colorPrimaryDisabled: '#91C9FF',

  /** 小圆角：输入框 / 小按钮 / 标签（对标 antd borderRadiusSM） */
  borderRadiusSM: 4,
  borderRadius: 6,
  borderRadiusLG: 8,
  /** 卡片 / 大面板圆角（项目扩展：antd 只有 2/4/6/8 四档，此档对齐项目既有卡片视觉） */
  borderRadiusXL: 12,

  /** 文本字号（对标 antd v5 默认 fontSize 14） */
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,

  controlHeight: 36,
  controlHeightSM: 30,
  controlHeightLG: 44,

  /** 动效时长（对标 antd motionDurationMid） */
  motionDurationMid: 200,
} as const;

/** 两套 token 的统一形状（以浅色为基准；暗黑必须提供全部键）。
 * 注意：把 as const 的字面量类型拓宽为 string/number，否则 darkTokens 的
 * 任何色值都会因"字面量不相等"报类型错误。 */
type Widen<T> = {[K in keyof T]: T[K] extends string ? string : T[K] extends number ? number : never};
export type XTheme = Widen<typeof lightTokens>;

/**
 * 暗黑 token：
 * - 文字 = 白色透明度阶梯（antd v5 dark 算法）；
 * - colorBgLayout = #000000、colorBgContainer = #212225，对齐 App 级 Colors.dark，
 *   弹层面板压在页面上时与 backgroundElement 同色系；
 * - 语义色底（PrimaryBg/SuccessBg/...）改为对应主色的低透明度版本，暗底下不会刺眼；
 * - 分割线/边框用白色低透明度，避免死灰感。
 */
export const darkTokens: XTheme = {
  colorPrimary: '#2080F0',
  colorPrimaryActive: '#3C93F5',
  colorPrimaryBg: 'rgba(32, 128, 240, 0.18)',

  colorSuccess: '#6BD643',
  colorSuccessBg: 'rgba(82, 196, 26, 0.16)',

  colorWarning: '#FFC53D',
  colorWarningBg: 'rgba(250, 173, 20, 0.16)',

  colorError: '#FF7875',
  colorErrorBg: 'rgba(255, 77, 79, 0.16)',

  colorText: 'rgba(255, 255, 255, 0.88)',
  colorTextSecondary: 'rgba(255, 255, 255, 0.65)',
  colorTextTertiary: 'rgba(255, 255, 255, 0.45)',
  colorTextQuaternary: 'rgba(255, 255, 255, 0.25)',
  colorTextLightSolid: '#FFFFFF',

  colorBorder: 'rgba(255, 255, 255, 0.22)',
  colorSplit: 'rgba(255, 255, 255, 0.15)',
  colorProgressTrack: 'rgba(255, 255, 255, 0.12)',
  colorBgContainer: '#212225',
  colorBgLayout: '#000000',
  colorBgContainerDisabled: 'rgba(255, 255, 255, 0.08)',
  colorPrimaryDisabled: 'rgba(32, 128, 240, 0.38)',

  borderRadiusSM: 4,
  borderRadius: 6,
  borderRadiusLG: 8,
  borderRadiusXL: 12,

  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,

  controlHeight: 36,
  controlHeightSM: 30,
  controlHeightLG: 44,

  motionDurationMid: 200,
};

/**
 * 【向后兼容】旧代码里的 xTheme 就是浅色 token。
 * 新组件请改用 useXTheme()（见下方），静态导入只允许用于"与模式无关"的取值。
 */
export const xTheme = lightTokens;

// ---------------------------------------------------------------------------
// 模式状态（zustand 全局单例：任何组件 setXThemeMode('dark') 全库即时换肤）
// ---------------------------------------------------------------------------
import {create} from 'zustand';
import {useColorScheme} from 'react-native';

/** 主题模式：light 强制浅色 / dark 强制暗黑 / system 跟随系统（默认） */
export type XThemeMode = 'light' | 'dark' | 'system';
/** 实际生效的明暗方案 */
export type XThemeScheme = 'light' | 'dark';

interface XThemeModeState {
  mode: XThemeMode;
  setMode: (mode: XThemeMode) => void;
}

const useXThemeModeStore = create<XThemeModeState>(set => ({
  mode: 'system',
  setMode: mode => set({mode}),
}));

/** 全局切换主题模式（命令式，任何地方可调用） */
export function setXThemeMode(mode: XThemeMode) {
  useXThemeModeStore.getState().setMode(mode);
}

/** 读取当前模式（非 React 环境 / 事件回调里用） */
export function getXThemeMode(): XThemeMode {
  return useXThemeModeStore.getState().mode;
}

/** 订阅当前模式（React 组件里用） */
export function useXThemeMode(): XThemeMode {
  return useXThemeModeStore(s => s.mode);
}

/**
 * 【核心 Hook】当前模式下的完整 token 集。
 *
 * - 返回值按 (scheme × 品牌色) 缓存，**引用稳定**：同组合永远返回同一对象，
 *   避免每次渲染新对象导致订阅组件级联重渲染（曾引发日历连点卡顿）；
 * - mode==='system' 时跟随 useColorScheme()，否则用强制值；
 * - 注入运行时品牌色（zustand XBrand）覆盖 colorPrimary 等键。
 */
import {useXBrandStore} from './XTheme/BrandColor';

const themeCache = new Map<string, XTheme>();

export function useXTheme(): XTheme {
  const mode = useXThemeModeStore(s => s.mode);
  const systemScheme = useColorScheme();
  const scheme: XThemeScheme = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const brand = useXBrandStore(s => s.brand);
  const key = `${scheme}:${brand.name}`;
  let cached = themeCache.get(key);
  if (!cached) {
    const base = scheme === 'dark' ? darkTokens : lightTokens;
    cached = {
      ...base,
      colorPrimary: scheme === 'dark' ? brand.primaryDark : brand.primary,
      colorPrimaryActive: scheme === 'dark' ? brand.primaryDark : brand.primary,
      colorPrimaryBg: brand.primaryBg,
      colorPrimaryDisabled:
        scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(32,128,240,0.28)',
    };
    themeCache.set(key, cached);
  }
  return cached;
}

/** 当前实际生效的明暗方案（isDark 便捷判断用） */
export function useXThemeScheme(): XThemeScheme {
  const mode = useXThemeModeStore(s => s.mode);
  const systemScheme = useColorScheme();
  return mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
}
