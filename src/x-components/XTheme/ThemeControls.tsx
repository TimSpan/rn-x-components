/**
 * ============================================================================
 * ThemeControls —— 暗黑/主题色/语言 三个切换按钮组
 * ============================================================================
 * 在 3 个位置使用：
 *   1. 介绍页（app/index.tsx）顶部
 *   2. 组件页（app/components/index.tsx）Stack headerRight
 *   3. 我的/关于页（app/mine.tsx）顶部
 *
 * props:
 *   compact?: boolean   true 时紧凑（用于 headerRight 单行）
 *   inline?: boolean    true 时背景透明、无边框（用于页面顶部）
 * ============================================================================
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useXTheme, useXThemeMode, setXThemeMode, XThemeMode} from '../theme';
import {useXBrandStore, setXBrandByName, X_BRAND_PRESETS} from './BrandColor';
import {showXActionSheet} from '../XActionSheet/global';
import {useXLocale, setXLocale, XLocale} from '../XLocale';

export interface ThemeControlsProps {
  compact?: boolean;
  style?: any;
}

/**
 * 暗黑切换：三态循环 📱跟随系统 → 🌙暗 → ☀️亮 → 📱。
 * 用户点过两态按钮会永久脱离系统跟随（bug 根因），三态保证能回到"自动"。
 */
function ThemeModeButton({compact}: {compact?: boolean}) {
  const t = useXTheme();
  const mode = useXThemeMode();
  const next: XThemeMode = mode === 'system' ? 'dark' : mode === 'dark' ? 'light' : 'system';
  return (
    <Pressable
      onPress={() => setXThemeMode(next)}
      hitSlop={8}
      style={({pressed}) => [
        compact ? styles.btnCompact : styles.btn,
        {borderColor: t.colorBorder, backgroundColor: pressed ? t.colorBgLayout : 'transparent'},
      ]}
    >
      <Text style={[compact ? styles.icon : styles.iconBig, {color: t.colorText}]}>
        {mode === 'system' ? '📱' : mode === 'dark' ? '🌙' : '☀️'}
      </Text>
    </Pressable>
  );
}

/** 主题色选择：点击弹 ActionSheet（当前色打勾），选中即时生效 */
function BrandColorButton({compact}: {compact?: boolean}) {
  const t = useXTheme();
  const brand = useXBrandStore(s => s.brand);
  return (
    <Pressable
      onPress={async () => {
        const picked = await showXActionSheet({
          title: '选择主题色',
          options: X_BRAND_PRESETS.map(p => ({label: `⬤  ${p.name}`, value: p.name})),
        });
        if (picked) setXBrandByName(picked);
      }}
      hitSlop={8}
      style={({pressed}) => [
        compact ? styles.btnCompact : styles.btn,
        {borderColor: t.colorBorder, backgroundColor: pressed ? t.colorBgLayout : 'transparent'},
      ]}
    >
      <View
        style={{
          width: compact ? 14 : 18,
          height: compact ? 14 : 18,
          borderRadius: compact ? 7 : 9,
          backgroundColor: brand.primary,
        }}
      />
    </Pressable>
  );
}

/** 语言切换：中 ↔ 英 */
function LocaleButton({compact}: {compact?: boolean}) {
  const t = useXTheme();
  const {locale} = useXLocale();
  const next: XLocale = locale === 'zh-CN' ? 'en-US' : 'zh-CN';
  return (
    <Pressable
      onPress={() => setXLocale(next)}
      hitSlop={8}
      style={({pressed}) => [
        compact ? styles.btnCompact : styles.btn,
        {borderColor: t.colorBorder, backgroundColor: pressed ? t.colorBgLayout : 'transparent'},
      ]}
    >
      <Text style={[compact ? styles.icon : styles.iconBig, {color: t.colorText, fontWeight: '600'}]}>
        {locale === 'zh-CN' ? 'EN' : '中'}
      </Text>
    </Pressable>
  );
}

/** 三个按钮组合 */
export function ThemeControls({compact, style}: ThemeControlsProps) {
  return (
    <View style={[compact ? styles.rowCompact : styles.row, compact && styles.rowFlex]}>
      <ThemeModeButton compact={compact} />
      <BrandColorButton compact={compact} />
      <LocaleButton compact={compact} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  rowCompact: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  rowFlex: {
    flex: 1,
  },
  btn: {
    width: 44,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCompact: {
    width: 32,
    height: 32,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 14,
  },
  iconBig: {
    fontSize: 16,
  },
});

export default ThemeControls;