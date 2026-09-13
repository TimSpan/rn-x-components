/**
 * ============================================================================
 * XBrand —— 运行时主题色切换
 * ============================================================================
 * 一组预设品牌色 + zustand 全局 store。setXBrand(name) 立即生效：
 * 浅/深两套 token 里的 colorPrimary / colorPrimaryActive / colorPrimaryBg
 * 被覆盖。组件统一 useXTheme() 取色，不需要额外订阅。
 * ============================================================================
 */
import {create} from 'zustand';

export interface XBrandPreset {
  name: string;
  /** 浅色主色 */
  primary: string;
  /** 暗黑主色 */
  primaryDark: string;
  /** 弱背景色（antd colorPrimaryBg） */
  primaryBg: string;
}

export const X_BRAND_PRESETS: XBrandPreset[] = [
  {name: '海洋蓝', primary: '#2080F0', primaryDark: '#3C93F5', primaryBg: 'rgba(32,128,240,0.18)'},
  {name: '薰衣紫', primary: '#7C3AED', primaryDark: '#A78BFA', primaryBg: 'rgba(124,58,237,0.18)'},
  {name: '翡翠绿', primary: '#16A34A', primaryDark: '#4ADE80', primaryBg: 'rgba(22,163,74,0.18)'},
  {name: '暖阳橙', primary: '#F97316', primaryDark: '#FB923C', primaryBg: 'rgba(249,115,22,0.18)'},
];

const DEFAULT_BRAND = X_BRAND_PRESETS[0];

interface XBrandState {
  brand: XBrandPreset;
  setXBrand: (brand: XBrandPreset) => void;
  setXBrandByName: (name: string) => void;
}

export const useXBrandStore = create<XBrandState>(set => ({
  brand: DEFAULT_BRAND,
  setXBrand: brand => set({brand}),
  setXBrandByName: name => {
    const found = X_BRAND_PRESETS.find(p => p.name === name);
    if (found) set({brand: found});
  },
}));

/** 命令式：切换品牌色 */
export function setXBrand(brand: XBrandPreset) {
  useXBrandStore.getState().setXBrand(brand);
}

export function setXBrandByName(name: string) {
  useXBrandStore.getState().setXBrandByName(name);
}