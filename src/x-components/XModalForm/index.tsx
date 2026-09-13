/**
 * ============================================================================
 * XModalForm —— 居中弹出表单（duxui XModalForm 移植）
 * ============================================================================
 *
 * 【与底部弹窗的区别】
 * side='center' 的 XPullView：面板从屏幕中间"放大"出现（scale 0.85→1）
 * 同时透明度淡入，默认 150ms —— 比底部滑入更轻快，适合确认框/表单这类
 * 小面积内容（duxui 同款设计）。
 *
 * 【表单校验约定】
 * onSubmit 返回 false（或 Promise<false>）时弹窗不关闭，
 * 可用来做"校验不通过就不让关"的逻辑。
 * ============================================================================
 */

import React, {useCallback} from 'react';
import {Pressable, StyleSheet, View, ViewStyle, StyleProp, ScrollView, Text} from 'react-native';
import {XPullView} from '../XPullView';

interface XModalFormProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /** 表单内容（TextInput 等，由调用方自由组合） */
  children?: React.ReactNode;
  /** 确认回调，返回 false 时不关闭（可做表单校验） */
  onSubmit?: () => boolean | void | Promise<boolean | void>;
  confirmText?: string;
  cancelText?: string;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

export function XModalForm({
  visible,
  onClose,
  title,
  children,
  onSubmit,
  confirmText = '确定',
  cancelText = '取消',
  duration = 150,
  style,
}: XModalFormProps) {
  /** 点确定：await 校验回调，只有没返回 false 才关闭 */
  const handleSubmit = useCallback(async () => {
    const result = await onSubmit?.();
    if (result !== false) {
      onClose();
    }
  }, [onSubmit, onClose]);

  return (
    // side='center'：居中弹层；overlayOpacity=0.25：遮罩比底部弹窗浅（内容居中，暗度低一点更通透）
    <XPullView visible={visible} onClose={onClose} side='center' duration={duration} overlayOpacity={0.25}>
      <View style={[styles.card, style]}>
        {/* 标题区 */}
        {!!title && (
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
          </View>
        )}
        {/* 内容区：maxHeight 限制 + 可滚动，键盘弹出时内容不会被挤没 */}
        <ScrollView style={styles.body} keyboardShouldPersistTaps='handled'>
          {children}
        </ScrollView>
        {/* 底部按钮区：取消 | 确定 */}
        <View style={styles.footer}>
          <Pressable onPress={onClose} style={({pressed}) => [styles.footerBtn, styles.cancelBtn, pressed && styles.pressed]}>
            <Text style={styles.cancelText}>{cancelText}</Text>
          </Pressable>
          <Pressable onPress={handleSubmit} style={({pressed}) => [styles.footerBtn, styles.submitBtn, pressed && styles.pressed]}>
            <Text style={styles.submitText}>{confirmText}</Text>
          </Pressable>
        </View>
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
  /** 卡片本体：固定宽度 300、圆角、白底 */
  card: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  body: {
    maxHeight: 320,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  footerBtn: {
    flex: 1,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {},
  submitBtn: {
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: '#eee',
  },
  pressed: {
    backgroundColor: '#f5f5f5',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  submitText: {
    fontSize: 16,
    color: '#2080F0',
    fontWeight: '600',
  },
});
