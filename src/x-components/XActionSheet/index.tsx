/**
 * ============================================================================
 * XActionSheet —— 底部弹出菜单（duxui XActionSheet 移植）
 * ============================================================================
 *
 * 【组合模式】
 * 它本身不写任何动画代码 —— 只是给 XPullView 传 children（菜单内容），
 * XPullView 负责"底部滑入 + 遮罩淡入"的整套动画。
 * 这就是这套组件库的设计思路：XPullView 是动画引擎，业务组件是内容。
 *
 * 【交互】
 * - 点选项 → onClose + onSelect(option)（先关再回调，保证动画和业务分离）
 * - 点取消/遮罩 → onClose
 * - danger 选项显示红色（危险操作）、disabled 选项置灰不可点
 *
 * 【安全区】
 * useSafeAreaInsets() 取 iPhone 底部 Home 条高度，
 * paddingBottom 保证取消按钮不被 Home 条挡住。
 * ============================================================================
 */

import React, {useCallback} from 'react';
import {Pressable, StyleSheet, View, ViewStyle, StyleProp, Text} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {XPullView} from '../XPullView';

/** 菜单选项 */
export interface XActionSheetOption<T = any> {
  /** 显示文本 */
  label: string;
  /** 回传的值 */
  value: T;
  /** 危险操作：文字变红 */
  danger?: boolean;
  /** 禁用：置灰且不可点 */
  disabled?: boolean;
}

interface XActionSheetProps<T = any> {
  visible: boolean;
  onClose: () => void;
  options: XActionSheetOption<T>[];
  /** 顶部标题（可选） */
  title?: string;
  cancelText?: string;
  duration?: number;
  /** 选中选项回调 */
  onSelect?: (option: XActionSheetOption<T>) => void;
  style?: StyleProp<ViewStyle>;
}

export function XActionSheet<T = any>({
  visible,
  onClose,
  options,
  title,
  cancelText = '取消',
  duration = 200,
  onSelect,
  style,
}: XActionSheetProps<T>) {
  const insets = useSafeAreaInsets();

  /** 点选项：先关闭弹层，再通知业务方选中了谁 */
  const handleSelect = useCallback(
    (option: XActionSheetOption<T>) => {
      onClose();
      onSelect?.(option);
    },
    [onClose, onSelect],
  );

  return (
    // side='bottom'：底部滑入；overlayOpacity=0.4：遮罩比默认的 0.5 浅一点
    <XPullView visible={visible} onClose={onClose} side='bottom' duration={duration} overlayOpacity={0.4}>
      <View style={[styles.panel, style, {paddingBottom: Math.max(insets.bottom, 10)}]}>
        {/* 标题区 */}
        {!!title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        {/* 选项列表 */}
        <View style={styles.optionList}>
          {options.map(option => (
            <Pressable
              key={String(option.value)}
              disabled={option.disabled}
              onPress={() => handleSelect(option)}
              // style 可以是函数：pressed 状态时换个底色，模拟按压反馈
              style={({pressed}) => [styles.option, pressed && !option.disabled && styles.pressed]}
            >
              <Text style={[styles.optionText, option.danger && styles.dangerText, option.disabled && styles.disabledText]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
        {/* 选项和取消按钮之间的小间隔 */}
        <View style={styles.cancelGap} />
        {/* 取消按钮（单独一行） */}
        <Pressable onPress={onClose} style={({pressed}) => [styles.cancel, pressed && styles.pressed]}>
          <Text style={styles.cancelText}>{cancelText}</Text>
        </Pressable>
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
  /** 面板整体：浅灰底 + 圆角，顶部裁圆角 */
  panel: {
    backgroundColor: '#f5f6f8',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 14,
    backgroundColor: '#fff',
  },
  title: {
    textAlign: 'center',
    fontSize: 13,
    color: '#999',
  },
  /** 选项区：白底，每个选项之间用 hairline 细线分隔 */
  optionList: {
    backgroundColor: '#fff',
  },
  option: {
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  /** 按压反馈底色 */
  pressed: {
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  dangerText: {
    color: '#f5222d',
  },
  disabledText: {
    color: '#c0c0c0',
  },
  cancelGap: {
    height: 8,
  },
  cancel: {
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
});
