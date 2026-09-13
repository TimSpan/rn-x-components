/**
 * ============================================================================
 * XCalendar —— 日历（duxui Calendar 的 TS + XTheme 重写版）
 * ============================================================================
 *
 * 【与 duxui Calendar 的关系】
 * 逻辑照抄 duxui：纯 View 网格自绘（不依赖任何日历库）、单选/周选/范围
 * 三种模式统一按"范围"处理、min/max + disabledDate 拦截。
 * 重写点：JSX → TS、静态色值 → useXTheme() token、文案 → i18n（中英）、
 * 周起始默认周一（duxui 同款），多选支持 antd 式 multiple。
 *
 * 【模式与取值】
 *   mode='day'    value: 'YYYY-MM-DD'          （multiple 时: string[]）
 *   mode='week'   value: ['YYYY-MM-DD','YYYY-MM-DD']  所在周一起始
 *   mode='scope'  value: ['YYYY-MM-DD','YYYY-MM-DD']  任意范围
 *
 * 【弹窗用法】配合 XCalendarPopup（底部 XPullView + 取消/确定工具栏，
 * 样式对齐本项目 XPickerDate）。
 * ============================================================================
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import dayjs, {Dayjs} from 'dayjs';
import {useXTheme, XTheme} from '../theme';
import {useXLocale, XLocale, xMonthTitle, X_WEEKDAYS} from '../XLocale';

export type XCalendarMode = 'day' | 'week' | 'scope';
/** day 模式单选 = string；multiple/scope/week = string[]（scope/week 恒为 [start,end]） */
export type XCalendarValue = string | string[];

export interface XCalendarProps {
  /** day 单选 / week 整周 / scope 任意范围，默认 day */
  mode?: XCalendarMode;
  /** 受控值（建议传组件输出的同格式值） */
  value?: XCalendarValue;
  /** 默认值（非受控） */
  defaultValue?: XCalendarValue;
  /** day 模式多选 */
  multiple?: boolean;
  onChange?: (value: XCalendarValue) => void;
  /** 最小日期 'YYYY-MM-DD' */
  min?: string;
  /** 最大日期 'YYYY-MM-DD' */
  max?: string;
  /** 禁用判断（返回 true 禁点） */
  disabledDate?: (date: Dayjs) => boolean;
  /** 周起始：0 周日 / 1 周一，默认 1 */
  weekStartsOn?: 0 | 1;
  /** 月份切换回调（year, month 1~12） */
  onMonthChange?: (year: number, month: number) => void;
  style?: StyleProp<ViewStyle>;
}

/** 值 → 有序范围 [start, end]（day 取自身；数组取 [0]/[1]） */
function valueToScope(value: XCalendarValue | undefined, mode: XCalendarMode): [Dayjs | null, Dayjs | null] {
  if (!value) return [null, null];
  if (mode === 'day' && !Array.isArray(value)) {
    const d = dayjs(value);
    return [d.isValid() ? d : null, d.isValid() ? d : null];
  }
  if (Array.isArray(value) && value.length >= 2) {
    const s = dayjs(value[0]);
    const e = dayjs(value[1]);
    if (s.isValid() && e.isValid()) return s.isAfter(e) ? [e, s] : [s, e];
  }
  return [null, null];
}

/** day 多选集合 */
function valueToSet(value: XCalendarValue | undefined, multiple: boolean): Set<string> {
  if (!multiple) return new Set();
  if (Array.isArray(value)) return new Set(value);
  if (typeof value === 'string' && value) return new Set([value]);
  return new Set();
}

export function XCalendar({
  mode = 'day',
  value,
  defaultValue,
  multiple = false,
  onChange,
  min,
  max,
  disabledDate,
  weekStartsOn = 1,
  onMonthChange,
  style,
}: XCalendarProps) {
  const t = useXTheme();
  const {locale} = useXLocale();

  /** 非受控内部值 */
  const [innerValue, setInnerValue] = useState<XCalendarValue | undefined>(defaultValue);
  const currentValue = value !== undefined ? value : innerValue;

  /** 当前展示月份（日历允许翻月，与选中值解耦） */
  const [viewMonth, setViewMonth] = useState<Dayjs>(() => {
    const scope = valueToScope(value ?? defaultValue, mode);
    return (scope[0] ?? dayjs()).startOf('month');
  });

  /** scope 模式的"待第二次点击"暂存起点 */
  const [pendingStart, setPendingStart] = useState<Dayjs | null>(null);

  /** 受控值变化 → 展示月份跟随（弹窗每次打开重置场景） */
  useEffect(() => {
    if (value !== undefined) {
      const scope = valueToScope(value, mode);
      if (scope[0]) {
        setViewMonth(prev => (prev.isSame(scope[0]!, 'month') ? prev : scope[0]!.startOf('month')));
      }
    }
  }, [value, mode]);

  /** 是否禁用：min/max/disabledDate 三重拦截 */
  const isDisabled = useCallback(
    (d: Dayjs) => {
      if (min && d.isBefore(dayjs(min).startOf('day'))) return true;
      if (max && d.isAfter(dayjs(max).endOf('day'))) return true;
      return disabledDate ? disabledDate(d) : false;
    },
    [min, max, disabledDate],
  );

  /** 上/下月（越 min/max 月份边界时按钮禁用） */
  const shiftMonth = useCallback(
    (delta: 1 | -1) => {
      const next = viewMonth.add(delta, 'month');
      if (min && next.endOf('month').isBefore(dayjs(min).startOf('day'))) return;
      if (max && next.startOf('month').isAfter(dayjs(max).endOf('day'))) return;
      setViewMonth(next);
      onMonthChange?.(next.year(), next.month() + 1);
    },
    [viewMonth, min, max, onMonthChange],
  );

  /** 42 格数据：6 行 × 7 列，非当月补位 */
  const cells = useMemo(() => {
    const first = viewMonth.startOf('month');
    // 当月 1 号距离周起始的偏移（0~6）
    const offset = (first.day() - weekStartsOn + 7) % 7;
    const gridStart = first.subtract(offset, 'day');
    return Array.from({length: 42}, (_, i) => gridStart.add(i, 'day'));
  }, [viewMonth, weekStartsOn]);

  /** 星期表头（本地化 + 周起始对齐） */
  const weekHeaders = useMemo(() => {
    const all = X_WEEKDAYS[locale as XLocale] ?? X_WEEKDAYS['zh-CN'];
    return weekStartsOn === 1 ? all : [all[6], ...all.slice(0, 6)];
  }, [locale, weekStartsOn]);

  /** 选中范围（渲染用） */
  const [selStart, selEnd] = useMemo(() => valueToScope(currentValue, mode), [currentValue, mode]);
  /** 多选集合 */
  const selectedSet = useMemo(() => valueToSet(currentValue, multiple && mode === 'day'), [currentValue, multiple, mode]);

  /** 点击一天 */
  const handleDayPress = useCallback(
    (d: Dayjs) => {
      if (isDisabled(d)) return;
      const key = d.format('YYYY-MM-DD');

      if (mode === 'day') {
        if (multiple) {
          const base = valueToSet(currentValue, true);
          base.has(key) ? base.delete(key) : base.add(key);
          const next = Array.from(base);
          setInnerValue(next);
          onChange?.(next);
        } else {
          setInnerValue(key);
          onChange?.(key);
        }
        return;
      }

      if (mode === 'week') {
        // 整周范围：按周起始推导
        const offset = (d.day() - weekStartsOn + 7) % 7;
        const start = d.subtract(offset, 'day');
        const end = start.add(6, 'day');
        const next = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
        setInnerValue(next);
        onChange?.(next);
        return;
      }

      // scope：两段式选择
      if (!pendingStart) {
        setPendingStart(d);
        return;
      }
      const [start, end] = pendingStart.isAfter(d) ? [d, pendingStart] : [pendingStart, d];
      const next = [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
      setPendingStart(null);
      setInnerValue(next);
      onChange?.(next);
    },
    [mode, multiple, currentValue, onChange, weekStartsOn, pendingStart, isDisabled],
  );

  /** 单元格样式计算
   * 【scope 重新选择规则】已选完一个范围后再点击：pendingStart 存在时
   * 优先渲染"新一轮起点"，忽略旧范围（否则样式纹丝不动，像卡死）。
   * 渲染优先级：pendingStart（scope 新起点）> 旧范围 > day 选中 */
  const cellState = useCallback(
    (d: Dayjs): {selected: boolean; inRange: boolean; disabled: boolean; isToday: boolean} => {
      const key = d.format('YYYY-MM-DD');
      const disabled = isDisabled(d);
      const isToday = d.isSame(dayjs(), 'day');
      let selected = false;
      let inRange = false;

      if (mode === 'scope' && pendingStart) {
        // 新一轮选择中：只高亮起点，旧范围不再显示
        selected = key === pendingStart.format('YYYY-MM-DD');
      } else if (mode === 'day') {
        selected = multiple ? selectedSet.has(key) : key === selStart?.format('YYYY-MM-DD');
      } else if (selStart && selEnd) {
        // week/scope：起止实心、中间浅底
        selected = key === selStart.format('YYYY-MM-DD') || key === selEnd.format('YYYY-MM-DD');
        inRange = d.isAfter(selStart, 'day') && d.isBefore(selEnd, 'day');
      }
      return {selected, inRange, disabled, isToday};
    },
    [mode, multiple, selectedSet, selStart, selEnd, pendingStart, isDisabled],
  );

  const renderCell = (d: Dayjs, index: number) => {
    const inMonth = d.isSame(viewMonth, 'month');
    const {selected, inRange, disabled, isToday} = cellState(d);
    const textColor = disabled
      ? t.colorTextQuaternary
      : selected
        ? t.colorTextLightSolid
        : inRange
          ? t.colorPrimary
          : t.colorText;

    return (
      <Pressable
        key={index}
        onPress={() => handleDayPress(d)}
        disabled={disabled}
        style={[styles.cell, (inRange || selected) && {backgroundColor: inRange ? t.colorPrimaryBg : 'transparent'}]}
      >
        <View
          style={[
            styles.cellInner,
            selected && {backgroundColor: t.colorPrimary, borderRadius: t.borderRadius},
            !selected && isToday && {borderWidth: StyleSheet.hairlineWidth, borderColor: t.colorPrimary, borderRadius: t.borderRadius},
          ]}
        >
          <Text style={[styles.dayText, {color: textColor}, !inMonth && styles.dim]} allowFontScaling={false}>
            {d.date()}
          </Text>
        </View>
      </Pressable>
    );
  };

  /** 月份切换按钮通用样式 */
  const arrowColor = t.colorTextSecondary;
  const canPrev = !(min && viewMonth.subtract(1, 'month').endOf('month').isBefore(dayjs(min).startOf('day')));
  const canNext = !(max && viewMonth.add(1, 'month').startOf('month').isAfter(dayjs(max).endOf('day')));

  return (
    <View style={style}>
      {/* 头部：‹ 月份 › */}
      <View style={styles.header}>
        <Pressable onPress={() => shiftMonth(-1)} disabled={!canPrev} hitSlop={8} style={styles.arrowBtn}>
          <Text style={[styles.arrow, {color: canPrev ? arrowColor : t.colorTextQuaternary}]} allowFontScaling={false}>
            ‹
          </Text>
        </Pressable>
        <Text style={[styles.monthTitle, {color: t.colorText}]} allowFontScaling={false}>
          {xMonthTitle(locale as XLocale, viewMonth.year(), viewMonth.month() + 1)}
        </Text>
        <Pressable onPress={() => shiftMonth(1)} disabled={!canNext} hitSlop={8} style={styles.arrowBtn}>
          <Text style={[styles.arrow, {color: canNext ? arrowColor : t.colorTextQuaternary}]} allowFontScaling={false}>
            ›
          </Text>
        </Pressable>
      </View>

      {/* 星期表头 */}
      <View style={styles.weekRow}>
        {weekHeaders.map((label, i) => (
          <View key={i} style={styles.cell}>
            <Text style={[styles.weekText, {color: t.colorTextTertiary}]} allowFontScaling={false}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* 日期网格 6 行 */}
      {[0, 1, 2, 3, 4, 5].map(row => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map(renderCell)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 22,
    lineHeight: 26,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekText: {
    fontSize: 12,
    textAlign: 'center',
  },
  cell: {
    flex: 1,
    aspectRatio: 1.15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellInner: {
    minWidth: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  dayText: {
    fontSize: 15,
    textAlign: 'center',
  },
  dim: {
    opacity: 0.35,
  },
});

export default XCalendar;
