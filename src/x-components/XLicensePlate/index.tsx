/**
 * ============================================================================
 * XLicensePlate —— 车牌号输入（duxui LicensePlate 的 XTheme 重写版）
 * ============================================================================
 *
 * 【与 duxui LicensePlate 的关系】
 * 保留 duxui 的核心交互：按输入进度切换三套键盘布局
 *   省份（第 1 位）→ 城市字母（第 2 位）→ 字母+数字（第 3 位起）；
 * 末位可输入特殊字符（港澳学领警挂）；新能源（8 位）末位仅 D/F。
 * 差异：duxui 用 PullView + Context 三组件分发，这里整合为两组件：
 *   - XLicensePlateKeyboard：纯键盘（phase/onInput/onBackspace 受控）；
 *   - XLicensePlate：输入格 + XPullView 弹出整合体（开箱即用）。
 * ============================================================================
 */

import React, {useCallback, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {XPullView} from '../XPullView';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';

/** 键盘阶段：省份 → 城市字母 → 字母数字 */
export type XLicensePlatePhase = 'province' | 'city' | 'alnum';

/** 省份简称 + 使领（duxui carCity.json 同款数据） */
const PROVINCE_ROWS: string[][] = [
  ['京', '津', '冀', '晋', '蒙', '辽', '吉'],
  ['黑', '沪', '苏', '浙', '皖', '闽', '赣'],
  ['鲁', '豫', '鄂', '湘', '粤', '桂', '琼'],
  ['川', '贵', '云', '藏', '陕', '甘', '青'],
  ['宁', '新', '渝', '使', '领'],
];

/** 字母表（车牌不含 I / O） */
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');

/** 末位特殊字符（普通牌） */
const TAIL_SPECIAL = ['港', '澳', '学', '领', '警', '挂'];

export interface XLicensePlateKeyboardProps {
  phase: XLicensePlatePhase;
  onInput: (key: string) => void;
  onBackspace: () => void;
  /** 限制可选键（新能源末位仅 D/F）；null = 不限制 */
  allowedKeys?: string[] | null;
  /** 是否处于末位（普通牌显示特殊字符行） */
  isLast?: boolean;
}

export function XLicensePlateKeyboard({phase, onInput, onBackspace, allowedKeys, isLast}: XLicensePlateKeyboardProps) {
  const t = useXTheme();

  /** 单键 */
  const renderKey = useCallback(
    (label: string, flex: number = 1) => {
      const disabled = allowedKeys != null && !allowedKeys.includes(label);
      return (
        <Pressable
          key={label}
          disabled={disabled}
          onPress={() => !disabled && onInput(label)}
          style={({pressed}) => [
            styles.key,
            {flex, borderRadius: t.borderRadius},
            {backgroundColor: disabled ? t.colorBgContainerDisabled : pressed ? t.colorBgLayout : t.colorBgContainer},
          ]}
        >
          <Text
            style={[styles.keyText, {color: disabled ? t.colorTextQuaternary : t.colorText}]}
            allowFontScaling={false}
          >
            {label}
          </Text>
        </Pressable>
      );
    },
    [allowedKeys, onInput, t],
  );

  /** 退格键 */
  const backspaceKey = useCallback(
    (flex = 1) => (
      <Pressable
        key='__backspace'
        onPress={onBackspace}
        style={({pressed}) => [
          styles.key,
          {flex, backgroundColor: pressed ? t.colorBgLayout : t.colorBgContainerDisabled, borderRadius: t.borderRadius},
        ]}
      >
        <Text style={[styles.keyText, {color: t.colorText}]} allowFontScaling={false}>
          ⌫
        </Text>
      </Pressable>
    ),
    [onBackspace, t],
  );

  /** 布局：行数组（每行 = [label, flex][]） */
  const rows = useMemo(() => {
    if (allowedKeys != null) {
      // 受限模式（新能源末位 D/F）：单行受限键 + 退格
      return [allowedKeys.map(k => [k, 1] as [string, number]).concat([['__bs', 1] as [string, number]])];
    }
    if (phase === 'province') {
      return PROVINCE_ROWS.map(row => row.map(k => [k, 1] as [string, number]));
    }
    if (phase === 'city') {
      return [
        LETTERS.slice(0, 7),
        LETTERS.slice(7, 14),
        LETTERS.slice(14, 21),
        LETTERS.slice(21),
      ].map(row => row.map(k => [k, 1] as [string, number]));
    }
    // alnum：字母 3 行 + XYZ0123 + 456789 + 退格；（普通牌末位追加特殊字符行）
    const rows: [string, number][][] = [
      LETTERS.slice(0, 7).map(k => [k, 1] as [string, number]),
      LETTERS.slice(7, 14).map(k => [k, 1] as [string, number]),
      LETTERS.slice(14, 21).map(k => [k, 1] as [string, number]),
      [...LETTERS.slice(21), '0', '1', '2', '3'].map(k => [k, 1] as [string, number]),
      [...'456789'.split(''), '__bs'].map(k => [k, 1] as [string, number]),
    ];
    if (isLast) {
      rows.unshift([...TAIL_SPECIAL, '__bs'].map(k => [k, 1] as [string, number]));
    }
    return rows;
  }, [phase, allowedKeys, isLast]);

  return (
    <View style={[styles.keyboard, {backgroundColor: t.colorBgLayout}]}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(([label, flex]) =>
            label === '__bs' ? backspaceKey(flex) : renderKey(label, flex),
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// 输入格 + 弹出整合体
// ---------------------------------------------------------------------------

export interface XLicensePlateProps {
  /** 受控值（如 '京A12345'） */
  value?: string;
  onChange?: (value: string) => void;
  /** 车牌位数：7 普通 / 8 新能源，默认 7 */
  length?: 7 | 8;
  disabled?: boolean;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function XLicensePlate({value = '', onChange, length = 7, disabled = false, placeholder, style}: XLicensePlateProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);

  /** 当前键盘阶段 */
  const phase: XLicensePlatePhase = value.length === 0 ? 'province' : value.length === 1 ? 'city' : 'alnum';
  /** 是否在末位 */
  const isLast = value.length === length - 1;
  /** 新能源末位仅 D/F */
  const allowedKeys = isLast && length === 8 ? ['D', 'F'] : null;

  const handleInput = useCallback(
    (key: string) => {
      if (value.length >= length) return;
      const next = value + key;
      onChange?.(next);
      // 输满自动收起
      if (next.length >= length) setVisible(false);
    },
    [value, length, onChange],
  );

  const handleBackspace = useCallback(() => {
    onChange?.(value.slice(0, -1));
  }, [value, onChange]);

  /** 输入格渲染 */
  const cells = Array.from({length}, (_, i) => {
    const filled = i < value.length;
    const active = i === value.length;
    const isNewEnergyTail = length === 8 && i === 7;
    return (
      <View
        key={i}
        style={[
          styles.cell,
          {backgroundColor: t.colorBgContainer, borderColor: t.colorBorder},
          active && {borderColor: t.colorPrimary, borderWidth: 1.5},
          isNewEnergyTail && {borderColor: t.colorSuccess, borderWidth: 1.5},
        ]}
      >
        {filled && (
          <Text style={[styles.cellText, {color: t.colorText}]} allowFontScaling={false}>
            {value[i]}
          </Text>
        )}
      </View>
    );
  });

  return (
    <>
      {/* 输入格：点击弹起键盘 */}
      <Pressable
        onPress={() => !disabled && setVisible(true)}
        style={[styles.cellRow, style]}
        disabled={disabled}
      >
        {cells}
      </Pressable>

      <XPullView visible={visible} onClose={() => setVisible(false)} side='bottom' overlayOpacity={0.4}>
        <View style={[styles.panel, {backgroundColor: t.colorBgContainer, paddingBottom: Math.max(insets.bottom, 10)}]}>
          {/* 头部：提示 + 完成 */}
          <View style={[styles.header, {borderBottomColor: t.colorSplit}]}>
            <Text style={[styles.headerTitle, {color: t.colorTextSecondary}]} allowFontScaling={false}>
              {length === 8 ? i18n('newEnergyTip') : i18n('platePlaceholder')}
            </Text>
            <Pressable onPress={() => setVisible(false)} hitSlop={8}>
              <Text style={[styles.doneBtn, {color: t.colorPrimary}]}>{i18n('done')}</Text>
            </Pressable>
          </View>
          <XLicensePlateKeyboard
            phase={phase}
            onInput={handleInput}
            onBackspace={handleBackspace}
            allowedKeys={allowedKeys}
            isLast={isLast && length === 7}
          />
        </View>
      </XPullView>
    </>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    padding: 6,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  key: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 16,
    fontWeight: '500',
  },
  cellRow: {
    flexDirection: 'row',
    gap: 6,
  },
  cell: {
    flex: 1,
    height: 52,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellText: {
    fontSize: 18,
    fontWeight: '600',
  },
  panel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 44,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 13,
  },
  doneBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default XLicensePlate;
