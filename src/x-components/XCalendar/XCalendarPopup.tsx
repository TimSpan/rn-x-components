/**
 * ============================================================================
 * XCalendarPopup —— 弹窗日历（XCalendar + XPullView 组合）
 * ============================================================================
 *
 * 【定位】duxui 官方没有独立弹窗日历（把 Calendar 塞 PullView 用），
 * 这里做成正式组件：
 * - 底部弹出（XPullView，与项目弹窗族同款动画/遮罩）；
 * - 顶部工具栏「取消 | 标题 | 确定」与本项目 XPickerDate 完全同款布局，
 *   颜色全部走 useXTheme（暗黑自适应）；
 * - 打开瞬间把外部 value 复制进草稿（XPickerDate 的 prevVisibleRef 套路），
 *   点确定才 onConfirm，点取消/遮罩丢弃草稿，符合选择器交互惯例。
 * ============================================================================
 */

import React, {useCallback, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {XPullView} from '../XPullView';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {XCalendar, XCalendarMode, XCalendarValue} from './index';

export interface XCalendarPopupProps {
  visible: boolean;
  onClose: () => void;
  /** 点确定：回传草稿值 */
  onConfirm?: (value: XCalendarValue) => void;
  /** 当前值（每次打开同步进草稿） */
  value?: XCalendarValue;
  /** 传给 XCalendar 的模式 */
  mode?: XCalendarMode;
  /** day 模式多选 */
  multiple?: boolean;
  /** 面板标题，默认"请选择日期" */
  title?: string;
  min?: string;
  max?: string;
  disabledDate?: (date: import('dayjs').Dayjs) => boolean;
  weekStartsOn?: 0 | 1;
  onMonthChange?: (year: number, month: number) => void;
  duration?: number;
}

export function XCalendarPopup({
  visible,
  onClose,
  onConfirm,
  value,
  mode = 'day',
  multiple = false,
  title,
  min,
  max,
  disabledDate,
  weekStartsOn = 1,
  onMonthChange,
  duration = 200,
}: XCalendarPopupProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const insets = useSafeAreaInsets();

  /** 草稿：点确定前的一切选择都在这里，取消即丢弃 */
  const [draft, setDraft] = useState<XCalendarValue | undefined>(value);
  const prevVisibleRef = useRef(visible);

  /** 打开瞬间同步草稿（渲染期修正，与 XPickerDate 同套路） */
  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (visible) setDraft(value);
  }

  /** 确定：回传草稿并关闭 */
  const handleConfirm = useCallback(() => {
    onConfirm?.(draft ?? (multiple ? [] : mode === 'day' ? '' : ['', '']));
    onClose();
  }, [draft, multiple, mode, onConfirm, onClose]);

  return (
    <XPullView visible={visible} onClose={onClose} side='bottom' duration={duration} overlayOpacity={0.4}>
      <View style={[styles.panel, {backgroundColor: t.colorBgContainer, paddingBottom: Math.max(insets.bottom, 10)}]}>
        {/* 工具栏：取消 | 标题 | 确定（与 XPickerDate 同款） */}
        <View style={[styles.toolbar, {borderBottomColor: t.colorSplit}]}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancelBtn, {color: t.colorTextSecondary}]}>{i18n('cancel')}</Text>
          </Pressable>
          <Text style={[styles.title, {color: t.colorText}]} numberOfLines={1}>
            {title ?? i18n('selectDate')}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={8}>
            <Text style={[styles.confirmBtn, {color: t.colorPrimary}]}>{i18n('confirm')}</Text>
          </Pressable>
        </View>
        {/* 日历本体 */}
        <View style={styles.calendarWrap}>
          <XCalendar
            mode={mode}
            multiple={multiple}
            value={draft}
            onChange={setDraft}
            min={min}
            max={max}
            disabledDate={disabledDate}
            weekStartsOn={weekStartsOn}
            onMonthChange={onMonthChange}
          />
        </View>
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
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
  calendarWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
});

export default XCalendarPopup;
