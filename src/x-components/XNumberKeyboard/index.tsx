/**
 * ============================================================================
 * XNumberKeyboard —— 数字键盘（duxui NumberKeyboard 的 XTheme 重写版）
 * ============================================================================
 *
 * 【与 duxui NumberKeyboard 的关系】
 * duxui 的 NumberKeyboard 是"纯静态键盘"（弹出靠业务配 PullView），
 * 这里完全保留该分层：
 *   - XNumberKeyboard：纯键盘 UI（3×4 布局、乱序 random、退格、小数点）；
 *   - XNumberKeyboardPopup：弹出模式（XPullView 底部拉起 + 取消/确定工具栏
 *     + 草稿管理），与 XCalendarPopup/XPickerDate 交互一致，开箱即用。
 *
 * 【键盘布局】
 *   1 2 3        1 2 3
 *   4 5 6        4 5 6
 *   7 8 9        7 8 9
 *   . 0 ⌫   或   0(占两格)  ⌫     ← extraKey={null} 收起小数点
 * random 打乱 1~9（duxui 同款防窥）。
 * ============================================================================
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {XPullView} from '../XPullView';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';

// ---------------------------------------------------------------------------
// 纯键盘
// ---------------------------------------------------------------------------

export interface XNumberKeyboardProps {
  /** 按下数字/小数点/自定义键 */
  onKeyPress?: (key: string) => void;
  /** 按下退格 */
  onBackspace?: () => void;
  /** 乱序键盘（防窥），默认 false */
  random?: boolean;
  /**
   * 左下角附加键：默认 '.'（小数点）；传 null 收起（0 占两格）；
   * 传自定义字符串（如 '-'）即渲染自定义键。
   */
  extraKey?: string | null;
  style?: StyleProp<ViewStyle>;
}

/** Fisher–Yates 洗牌 */
function shuffle<T>(list: T[]): T[] {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function XNumberKeyboard({onKeyPress, onBackspace, random = false, extraKey = '.', style}: XNumberKeyboardProps) {
  const t = useXTheme();
  /** 数字键序（random 时打乱一次，组件实例内稳定） */
  const digits = useMemo(() => {
    const base = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
    return random ? shuffle(base) : base;
  }, [random]);

  /** 单个键渲染 */
  const renderKey = (label: string, onPress: () => void, flex: number = 1) => (
    <Pressable
      key={label}
      onPress={onPress}
      style={({pressed}) => [
        styles.key,
        {flex, backgroundColor: pressed ? t.colorBgLayout : t.colorBgContainer, borderRadius: t.borderRadius},
      ]}
    >
      <Text style={[styles.keyText, {color: t.colorText}]} allowFontScaling={false}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.keyboard, {backgroundColor: t.colorBgLayout}, style]}>
      {[0, 1, 2].map(row => (
        <View key={row} style={styles.row}>
          {digits.slice(row * 3, row * 3 + 3).map(d => renderKey(d, () => onKeyPress?.(d)))}
        </View>
      ))}
      <View style={styles.row}>
        {extraKey != null
          ? renderKey(extraKey, () => onKeyPress?.(extraKey))
          : renderKey('0', () => onKeyPress?.('0'), 2.15)}
        {extraKey != null && renderKey('0', () => onKeyPress?.('0'))}
        {renderKey('⌫', () => onBackspace?.())}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// 弹出模式
// ---------------------------------------------------------------------------

export interface XNumberKeyboardPopupProps {
  visible: boolean;
  onClose: () => void;
  /** 点确定：回传草稿值 */
  onConfirm?: (value: string) => void;
  /** 受控值（每次打开同步进草稿） */
  value?: string;
  /** 草稿变化（可选，实时上抛） */
  onChange?: (value: string) => void;
  /** 最大长度，默认不限制 */
  maxLength?: number;
  /** 面板标题 */
  title?: string;
  /** 透传键盘 props */
  random?: boolean;
  extraKey?: string | null;
  duration?: number;
}

export function XNumberKeyboardPopup({
  visible,
  onClose,
  onConfirm,
  value,
  onChange,
  maxLength,
  title,
  random,
  extraKey = '.',
  duration = 200,
}: XNumberKeyboardPopupProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const [draft, setDraft] = useState('');
  const prevVisibleRef = useRef(visible);

  /** 打开瞬间同步草稿（XPickerDate/XCalendarPopup 同套路） */
  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (visible) setDraft(value ?? '');
  }

  /** 按键 → 追加（小数点只允许一次；maxLength 截断） */
  const handleKey = useCallback(
    (key: string) => {
      setDraft(prev => {
        let next = prev;
        if (key === '.') {
          if (prev.includes('.') || prev.length === 0) return prev; // 空串不允许以 . 开头
          next = prev + '.';
        } else {
          if (maxLength && prev.length >= maxLength) return prev;
          next = prev + key;
        }
        onChange?.(next);
        return next;
      });
    },
    [maxLength, onChange],
  );

  /** 退格 */
  const handleBackspace = useCallback(() => {
    setDraft(prev => {
      const next = prev.slice(0, -1);
      onChange?.(next);
      return next;
    });
  }, [onChange]);

  /** 确定 */
  const handleConfirm = useCallback(() => {
    onConfirm?.(draft);
    onClose();
  }, [draft, onConfirm, onClose]);

  return (
    <XPullView visible={visible} onClose={onClose} side='bottom' duration={duration} overlayOpacity={0.4}>
      <View style={[styles.panel, {backgroundColor: t.colorBgContainer, paddingBottom: 10}]}>
        {/* 工具栏：取消 | 标题(草稿值) | 确定 */}
        <View style={[styles.toolbar, {borderBottomColor: t.colorSplit}]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancelBtn, {color: t.colorTextSecondary}]}>{i18n('cancel')}</Text>
          </Pressable>
          <Text style={[styles.title, {color: t.colorText}]} numberOfLines={1} allowFontScaling={false}>
            {title ?? draft}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={8}>
            <Text style={[styles.confirmBtn, {color: t.colorPrimary}]}>{i18n('confirm')}</Text>
          </Pressable>
        </View>
        <XNumberKeyboard onKeyPress={handleKey} onBackspace={handleBackspace} random={random} extraKey={extraKey} />
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
  keyboard: {
    padding: 8,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  key: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    fontSize: 20,
    fontWeight: '500',
  },
  panel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    fontSize: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  confirmBtn: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default XNumberKeyboard;
