/**
 * ============================================================================
 * XPickerDate -- 日期时间滚轮选择器（antd-mobile DatePicker 架构移植）
 * ============================================================================
 *
 * 【format 决定列】出现哪些单位 token 就显示哪些列，顺序固定为
 *   年 → 月 → 日 → 时 → 分 → 秒
 * （与 antd-mobile precision 模型一致：antd 用 precision 指定末列，
 *  format 是它的超集 -- antd 只能选"到某单位为止的前缀"，format 可以
 *  任意组合，如 'YYYY-MM' 或 'HH:mm'）。
 *
 *   format='YYYY-MM-DD'          年 | 月 | 日（默认）
 *   format='YYYY-MM-DD HH:mm:ss' 年 | 月 | 日 | 时 | 分 | 秒
 *   format='HH:mm:ss'            时 | 分 | 秒
 *   format='YYYY-MM'             年 | 月
 *
 * 输入解析与输出格式化都使用同一个 format：
 *   value 传入组件输出过的同格式字符串可精确回读（dayjs customParseFormat），
 *   传 Date 直接取各字段，解析失败取当前时间。
 *
 * 【对标 antd-mobile DatePicker 的逐条核对结论】
 * 1. 列顺序/子集模型（precision）          -> format 超集实现        ✅
 * 2. 时/分/秒两位补零，年/月/日不补
 *    （antd 默认 renderLabel: ('0'+n).slice(-2)）                    ✅
 * 3. 日列随年月联动（antd getMonthDays）    -> dayjs daysInMonth      ✅
 * 4. 滚轮手势/弹簧/橡皮筋/松手立即上报
 *    （antd picker-view wheel.tsx）        -> 通用 XWheel 组件         ✅
 * 5. min/max 逐列收窄（antd 全量支持）      -> 仅 minYear/maxYear     ⚠️ 差异，
 *    维持现状：本项目只需要年份范围，无整段 Date 边界需求。
 *
 * 滚轮本体见 ./XWheel.tsx（与 XPicker 单列选择器共用）。
 * ============================================================================
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, View, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import {XPullView} from '../XPullView';
import {XWheel, XWheelHandle, XWheelOption} from '../XWheel';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';

// 按格式解析字符串值需要 customParseFormat 插件（antd 同款方案）
dayjs.extend(customParseFormat);

/** 默认 format：年月日 */
const DEFAULT_FORMAT = 'YYYY-MM-DD';

/** 六个单位（antd DatePrecision 的六个取值），也是列的固定顺序 */
export type DateUnit = 'year' | 'month' | 'day' | 'hour' | 'minute' | 'second';

const UNIT_ORDER: DateUnit[] = ['year', 'month', 'day', 'hour', 'minute', 'second'];

/** 生成 [start, end] 的整数数组 */
const range = (start: number, end: number) => {
  const list: number[] = [];
  for (let i = start; i <= end; i++) {
    list.push(i);
  }
  return list;
};

/** 两位补零（时/分/秒的展示，与 antd 默认 renderLabel 一致） */
const pad2 = (n: number) => String(n).padStart(2, '0');

/** 数值 → 滚轮选项（时分秒补零，年月日不补） */
const toOption = (v: number, pad: boolean): XWheelOption<number> => ({label: pad ? pad2(v) : String(v), value: v});

/** 静态列（无联动，模块级只生成一次） */
const MONTH_OPTIONS = range(1, 12).map(v => toOption(v, false));
const HOUR_OPTIONS = range(0, 23).map(v => toOption(v, true));
const MINUTE_OPTIONS = range(0, 59).map(v => toOption(v, true));
const SECOND_OPTIONS = range(0, 59).map(v => toOption(v, true));

/**
 * 解析 format：出现哪些单位 token 就有哪些列（顺序固定为 UNIT_ORDER 的子序列）。
 * 支持的 token：YYYY / MM / DD / HH / mm / ss（dayjs 标准写法，大小写敏感）。
 * 一个单位都没有（传了不认识的格式）时退回默认年月日。
 */
const parseUnits = (format: string): DateUnit[] => {
  const tokens: Record<DateUnit, boolean> = {
    year: format.includes('YYYY'),
    month: format.includes('MM'),
    day: format.includes('DD'),
    hour: format.includes('HH'),
    minute: format.includes('mm'),
    second: format.includes('ss'),
  };
  const units = UNIT_ORDER.filter(unit => tokens[unit]);
  return units.length ? units : ['year', 'month', 'day'];
};

/** 草稿：六个单位齐全（format 未包含的单位也保留在草稿里，输出时自然丢弃） */
type Draft = Record<DateUnit, number>;

/** dayjs 对象 → 六单位草稿（dayjs.month() 是 0~11，所以要 +1） */
const splitDraft = (d: dayjs.Dayjs): Draft => ({
  year: d.year(),
  month: d.month() + 1,
  day: d.date(),
  hour: d.hour(),
  minute: d.minute(),
  second: d.second(),
});

/**
 * 外部 value → 草稿。
 * 字符串先按 format 解析（组件输出值的回读路径，精确匹配），
 * 失败再宽松兜底（如值 '2026-08-19' 配 format 'YYYY-MM-DD HH:mm:ss'，
 * 日期部分正确、时间归零），仍失败取当前时间；Date 直接取各字段。
 */
const parseValue = (format: string, value?: string | Date): Draft => {
  let d: dayjs.Dayjs | null = null;
  if (value instanceof Date) {
    d = dayjs(value);
  } else if (typeof value === 'string' && value.trim()) {
    d = dayjs(value, format);
    if (!d.isValid()) {
      d = dayjs(value);
    }
  }
  return splitDraft(d && d.isValid() ? d : dayjs());
};

/** 旧版两档模式（向后兼容，format 未传时生效） */
export type XPickerDateMode = 'date' | 'time';

export interface XPickerDateProps {
  visible: boolean;
  onClose: () => void;
  /** 当前值：与 format 同格式的字符串（也接受 Date） */
  value?: string | Date;
  /** 确定回调：按 format 格式化后的字符串（如 'YYYY-MM-DD HH:mm:ss'） */
  onChange?: (value: string) => void;
  title?: string;
  duration?: number;
  /**
   * 列配置：出现哪些单位 token（YYYY/MM/DD/HH/mm/ss）就显示哪些列，
   * 顺序固定 年→月→日→时→分→秒。输入解析与输出格式化均使用它。
   */
  format?: string;
  /** @deprecated 旧两档模式：date 等价 format='YYYY-MM-DD'，time 等价 format='HH:mm:ss'。与 format 同时传时以 format 为准 */
  mode?: XPickerDateMode;
  minYear?: number;
  maxYear?: number;
}

export function XPickerDate({
  visible,
  onClose,
  value,
  onChange,
  title,
  duration = 200,
  format,
  mode = 'date',
  minYear = 1970,
  maxYear = 2100,
}: XPickerDateProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        panel: {
          backgroundColor: t.colorBgContainer,
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
          borderBottomColor: t.colorSplit,
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
        /** 各列平分（antd: column flex:1） */
        columns: {
          flexDirection: 'row',
        },
      }),
    [t],
  );
  /** format 优先；未传时按旧 mode 兜底，保持向后兼容 */
  const resolvedFormat = format ?? (mode === 'time' ? 'HH:mm:ss' : DEFAULT_FORMAT);
  /** format 决定的列集合（固定顺序） */
  const units = useMemo(() => parseUnits(resolvedFormat), [resolvedFormat]);
  const hasDate = units.some(unit => unit === 'year' || unit === 'month' || unit === 'day');
  const hasTime = units.some(unit => unit === 'hour' || unit === 'minute' || unit === 'second');

  const [draft, setDraft] = useState<Draft>(() => parseValue(resolvedFormat, value));
  /** 上一次的 visible，用于识别"本次渲染刚被打开" */
  const prevVisibleRef = useRef(visible);
  /** 各列滚轮的 flush 句柄：确定时强制按当前视觉位置结算 */
  const wheelRefs = useRef<Partial<Record<DateUnit, XWheelHandle | null>>>({});

  /**
   * 打开瞬间同步重置草稿为当前 value（渲染期修正派生状态）。
   * 不用 useEffect：effect 要等这一帧提交后才跑，弹层会先以上次的旧值挂载。
   */
  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (visible) {
      setDraft(parseValue(resolvedFormat, value));
    }
  }

  /** 年列数据源（useMemo 缓存，避免每次渲染重新生成数组） */
  const yearOptions = useMemo(() => range(minYear, maxYear).map(v => toOption(v, false)), [minYear, maxYear]);

  /** 打开期间外部 value / format 变化（比如上层异步回填）也跟着同步 */
  useEffect(() => {
    if (visible) {
      setDraft(parseValue(resolvedFormat, value));
    }
  }, [visible, value, resolvedFormat]);

  /** 当月实际天数（2月28/29、小月30）。antd: getMonthDays(selectedYear, selectedMonth) */
  const daysInMonth = useMemo(() => dayjs(`${draft.year}-${draft.month}-01`).daysInMonth(), [draft.year, draft.month]);
  /** 日列数据源：跟随当月天数变化 */
  const dayOptions = useMemo(() => range(1, daysInMonth).map(v => toOption(v, false)), [daysInMonth]);

  /** 各列的选项表与显示值（静态列用模块级常量，引用稳定不触发滚轮重建手势） */
  const columns = useMemo(
    () =>
      units.map(unit => ({
        unit,
        options:
          unit === 'year'
            ? yearOptions
            : unit === 'day'
            ? dayOptions
            : unit === 'month'
            ? MONTH_OPTIONS
            : unit === 'hour'
            ? HOUR_OPTIONS
            : unit === 'minute'
            ? MINUTE_OPTIONS
            : SECOND_OPTIONS,
        /** 日列：草稿天数可能超过当月天数（如切到2月还停着31），夹回来 */
        value: unit === 'day' ? Math.min(draft.day, daysInMonth) : draft[unit],
      })),
    [units, yearOptions, dayOptions, draft, daysInMonth],
  );

  /** 某列选中：更新草稿单位。年/月变化可能改变当月天数，顺手把日夹回来（antd 日列 upper 联动） */
  const handleChange = useCallback(
    (unit: DateUnit, v: number) => {
      setDraft(prev => {
        if (prev[unit] === v) {
          return prev;
        }
        const next = {...prev, [unit]: v};
        if ((unit === 'year' || unit === 'month') && units.includes('day')) {
          next.day = Math.min(prev.day, dayjs(`${next.year}-${next.month}-01`).daysInMonth());
        }
        return next;
      });
    },
    [units],
  );

  /**
   * 确定：先逐列 flush（拖拽/spring 进行中也按当前视觉位置结算），
   * 再按 format 格式化输出。
   */
  const handleConfirm = useCallback(() => {
    const final = {...draft};
    for (const unit of units) {
      const flushed = wheelRefs.current[unit]?.flush();
      if (flushed !== undefined) {
        final[unit] = flushed.value;
      }
    }
    // 日再按当月天数保险收窄：防 2月31日 被 Date 构造器滚动成 3月3日
    const safeDay = Math.min(final.day, dayjs(`${final.year}-${final.month}-01`).daysInMonth());
    const result = dayjs(new Date(final.year, final.month - 1, safeDay, final.hour, final.minute, final.second)).format(resolvedFormat);
    onChange?.(result);
    onClose();
  }, [units, draft, resolvedFormat, onChange, onClose]);

  return (
    <XPullView visible={visible} onClose={onClose} side='bottom' duration={duration} overlayOpacity={0.4}>
      <View style={[styles.panel, {paddingBottom: Math.max(insets.bottom, 10)}]}>
        {/* 工具栏（与 XPicker 一致） */}
        <View style={styles.toolbar}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={[styles.cancelBtn, {color: t.colorTextSecondary}]}>{i18n('cancel')}</Text>
          </Pressable>
          <Text style={[styles.title, {color: t.colorText}]} numberOfLines={1}>
            {title ?? (hasDate && hasTime ? i18n('selectDateTime') : hasTime ? i18n('selectTime') : i18n('selectDate'))}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={8}>
            <Text style={[styles.confirmBtn, {color: t.colorPrimary}]}>{i18n('confirm')}</Text>
          </Pressable>
        </View>
        {/* 滚轮列：format 里有哪些单位就有哪些列 */}
        <View style={styles.columns}>
          {columns.map(({unit, options, value: columnValue}) => (
            <XWheel
              key={unit}
              ref={el => {
                wheelRefs.current[unit] = el;
              }}
              items={options}
              value={columnValue}
              onSelect={v => handleChange(unit, v)}
            />
          ))}
        </View>
      </View>
    </XPullView>
  );
}
