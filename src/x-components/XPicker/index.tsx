/**
 * ============================================================================
 * XPicker —— 底部单列滚轮选择器（与 XPickerDate 同一滚轮形式与交互）
 * ============================================================================
 *
 * 【交互逻辑与 XPickerDate 完全一致】
 *   1. 打开时把当前 value 复制到 draft（草稿）；
 *   2. 拖拽滚轮/点某一行只改 draft，不立即生效；
 *   3. 点"确定"先 flush 滚轮（按当前视觉位置结算），回传 onChange 后关闭。
 * 取消时不会误改数据。区别仅在数据形态：单列任意选项（label/value），
 * 没有年月日联动，直接使用通用 XWheel 组件。
 *
 * 【结构】
 *   XPullView（底部滑入 200ms）
 *   └── 面板：工具栏（取消 | 标题 | 确定）+ 单列滚轮（240 高，antd 同款遮罩）
 * ============================================================================
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Pressable, StyleSheet, View, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {XPullView} from '../XPullView';
import {XWheel, XWheelHandle} from '../XWheel';

/** 主题色（antd primary） */
const PRIMARY = '#2080F0';
/** 面板背景色（antd --adm-color-background） */
const BG_COLOR = '#fff';

/** 选项：label 显示文本，value 回传值 */
export interface XPickerOption<T = any> {
  label: string;
  value: T;
}

export interface XPickerProps<T = any> {
  visible: boolean;
  onClose: () => void;
  options: XPickerOption<T>[];
  /** 当前选中值（受控） */
  value?: T;
  /** 点确定回调：value 为选中的值，option 为对应的选项对象 */
  onChange?: (value: T, option?: XPickerOption<T>) => void;
  title?: string;
  duration?: number;
}

export function XPicker<T = any>({visible, onClose, options, value, onChange, title = '请选择', duration = 200}: XPickerProps<T>) {
  const insets = useSafeAreaInsets();
  /** draft：弹窗内的临时选中值，确定时才回传 */
  const [draft, setDraft] = useState<T | undefined>(value);
  /** 上一次的 visible，用于识别"本次渲染刚被打开"（与 XPickerDate 同款） */
  const prevVisibleRef = useRef(visible);
  /** 滚轮的 flush 句柄：确定时强制按当前视觉位置结算 */
  const wheelRef = useRef<XWheelHandle>(null);

  /**
   * 打开瞬间同步重置草稿为当前 value（渲染期修正派生状态，避免闪旧值）。
   */
  if (visible !== prevVisibleRef.current) {
    prevVisibleRef.current = visible;
    if (visible) {
      setDraft(value);
    }
  }

  /** 打开期间外部 value 变化（比如上层异步回填）也跟着同步 */
  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  /** 点确定：flush 滚轮拿到"看到的"选项，回传后关闭 */
  const handleConfirm = useCallback(() => {
    const option = wheelRef.current?.flush() ?? options.find(o => o.value === draft);
    if (option) {
      onChange?.(option.value as T, option as XPickerOption<T>);
    }
    onClose();
  }, [options, draft, onChange, onClose]);

  return (
    <XPullView visible={visible} onClose={onClose} side='bottom' duration={duration} overlayOpacity={0.4}>
      <View style={[styles.panel, {paddingBottom: Math.max(insets.bottom, 10)}]}>
        {/* 工具栏：左右对称的 取消/确定，中间标题（与 XPickerDate 一致） */}
        <View style={styles.toolbar}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={styles.cancelBtn}>取消</Text>
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Pressable onPress={handleConfirm} hitSlop={8}>
            <Text style={styles.confirmBtn}>确定</Text>
          </Pressable>
        </View>
        {/* 单列滚轮：点行/拖拽改草稿，确定才生效 */}
        <View style={styles.columns}>
          <XWheel ref={wheelRef} items={options} value={draft} onSelect={v => setDraft(v as T)} />
        </View>
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: BG_COLOR,
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
    borderBottomColor: '#eee',
  },
  cancelBtn: {
    fontSize: 15,
    color: '#666',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  confirmBtn: {
    fontSize: 15,
    color: PRIMARY,
    fontWeight: '600',
  },
  /** 单列占满整行（XWheel 自带 flex:1 与 240 高） */
  columns: {
    flexDirection: 'row',
  },
});
