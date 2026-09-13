/**
 * ============================================================================
 * XMultiSelect —— 多选组件（src/components/MultiSelect 的 X 系列重制版）
 * ============================================================================
 *
 * 逻辑与老版保持一致：
 * - 触发区展示已选标签（tag 横滑）或 placeholder
 * - 打开弹窗时把 value 拷贝成 draft，确定才回传（取消不动原值）
 *
 * 组件替换：
 * - antd Modal     -> XPullView（XTopView 宿主，底部弹层）
 * - antd Checkbox  -> XCheckbox
 * - antd Button    -> XButton
 */
import React, {useCallback, useState, type ReactNode} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {XPullView} from '../XPullView';
import {XCheckbox} from '../XCheckbox';
import {XButton} from '../XButton';
import AntDesign from '@react-native-vector-icons/ant-design';

export interface XMultiSelectProps {
  value?: any[];
  onChange?: (val: any[]) => void;
  options: {label: string; value: any; disabled?: boolean}[];
  placeholder?: string;
  /** 弹层标题，默认取 placeholder */
  title?: string;
  /** 自定义触发器 */
  children?: ReactNode;
}

export function XMultiSelect({value = [], onChange, options, placeholder = '请选择', title, children}: XMultiSelectProps) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<any[]>([]);

  const openModal = useCallback(() => {
    setDraft([...value]);
    setVisible(true);
  }, [value]);

  const handleCancel = useCallback(() => {
    setVisible(false);
  }, []);

  const handleConfirm = useCallback(() => {
    onChange?.(draft);
    setVisible(false);
  }, [draft, onChange]);

  const handleToggle = useCallback((itemValue: any) => {
    setDraft(prev => (prev.includes(itemValue) ? prev.filter(v => v !== itemValue) : [...prev, itemValue]));
  }, []);

  const selectedLabels = options.filter(o => value.includes(o.value)).map(o => o.label);

  return (
    <>
      {/* 触发区：已选 tag 列表 或 placeholder */}
      {children ? (
        <Pressable onPress={openModal}>{children}</Pressable>
      ) : (
        <View style={styles.trigger}>
          <View style={styles.triggerLeft}>
            {selectedLabels.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.labelScrollContent}>
                {selectedLabels.map((label, idx) => (
                  <Pressable key={idx} onPress={openModal}>
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{label}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Pressable style={styles.placeholderWrap} onPress={openModal}>
                <Text style={styles.placeholder}>{placeholder}</Text>
              </Pressable>
            )}
          </View>
          <Pressable onPress={openModal} hitSlop={8}>
            <AntDesign name='right' size={16} color='#bbb' />
          </Pressable>
        </View>
      )}

      {/* 底部弹层：XTopView 宿主渲染（XPullView） */}
      <XPullView visible={visible} onClose={handleCancel} side='bottom' duration={200}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{title ?? placeholder}</Text>
          </View>

          {/* 选项列表：可竖向滚动 */}
          <ScrollView style={styles.optionList} contentContainerStyle={styles.optionListContent}>
            {options.map(o => (
              <Pressable key={String(o.value)} style={styles.optionItem} onPress={() => handleToggle(o.value)}>
                {/* pointerEvents=none：整行点击都触发 toggle，勾选区不拦截 */}
                <View pointerEvents='none'>
                  <XCheckbox checked={draft.includes(o.value)} disabled={o.disabled} />
                </View>
                <View pointerEvents='none' style={styles.optionLabelWrap}>
                  <Text style={styles.optionLabel}>{o.label}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <XButton onPress={handleCancel} style={styles.cancelBtn}>
              取消
            </XButton>
            <XButton type='primary' onPress={handleConfirm} style={styles.confirmBtn}>
              确定{draft.length > 0 ? `（${draft.length}）` : ''}
            </XButton>
          </View>
        </View>
      </XPullView>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
    paddingRight: 4,
    width: '100%',
  },
  triggerLeft: {
    flex: 1,
    marginRight: 8,
    overflow: 'hidden',
  },
  labelScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tag: {
    backgroundColor: '#E6F1FE',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 6,
  },
  tagText: {
    color: '#2080F0',
    fontSize: 13,
  },
  placeholderWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  placeholder: {
    color: '#bbb',
    fontSize: 15,
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  optionList: {
    maxHeight: 380,
  },
  optionListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  optionLabelWrap: {
    marginLeft: 10,
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    color: '#333',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  cancelBtn: {
    flex: 1,
    marginRight: 10,
  },
  confirmBtn: {
    flex: 1,
    marginLeft: 10,
  },
});

export default XMultiSelect;
