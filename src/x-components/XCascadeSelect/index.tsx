/**
 * ============================================================================
 * XCascadeSelect —— 级联选择器（antd Cascader 的 RN 自实现版）
 * ============================================================================
 *
 * 数据结构（antd Cascader 同款）：
 *   options = [{label, value, children: [{label, value, children: ...}]}]
 *   value   = ['hunan', 'changsha', 'yuelu']（各级 value 组成的路径数组）
 *   展示    = 湖南 / 长沙 / 岳麓（路径上各级 label 用 " / " 连接）
 *
 * 交互形态：点击触发区弹出底部面板（XPullView），多列滚轮（XWheel）联动——
 * 改动第 i 列会截断更深的路径，后续列选项自动跟着变。
 * 路径必须走到叶子（没有 children 的选项）才能点确定。
 *
 * 用法（Form.Item 注入 value/onChange 即可作表单控件）：
 *   <XCascadeSelect options={AREA_DATA} placeholder='请选择省市区' />
 */
import React, {useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {XPullView} from '../XPullView';
import {XWheel, XWheelHandle, XWheelOption} from '../XWheel';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import AntDesign from '@react-native-vector-icons/ant-design';

export interface XCascadeOption {
  label: string;
  value: any;
  disabled?: boolean;
  children?: XCascadeOption[];
}

export interface XCascadeSelectProps {
  /** 路径数组：每级选中的 value（如 ['hunan','changsha','yuelu']） */
  value?: any[];
  onChange?: (path: any[]) => void;
  options: XCascadeOption[];
  placeholder?: string;
  /** 弹层标题，默认"请选择" */
  title?: string;
  /** 自定义触发器（不传则渲染默认的输入框样式触发区） */
  children?: React.ReactNode;
}

/** 沿路径取各级选项（找不到即截断） */
export function getCascadePathOptions(options: XCascadeOption[], path: any[]): XCascadeOption[] {
  const result: XCascadeOption[] = [];
  let cur = options;
  for (const v of path) {
    const hit = cur?.find(o => o.value === v);
    if (!hit) break;
    result.push(hit);
    cur = hit.children ?? [];
  }
  return result;
}

/** 路径是否走到叶子（末级选项没有 children） */
function isPathComplete(options: XCascadeOption[], path: any[]): boolean {
  const nodes = getCascadePathOptions(options, path);
  if (nodes.length !== path.length || nodes.length === 0) return false;
  return !nodes[nodes.length - 1].children?.length;
}

export function XCascadeSelect({value, onChange, options, placeholder, title, children}: XCascadeSelectProps) {
  const theme = useXTheme();
  const {t} = useXLocale();
  const resolvedPlaceholder = placeholder ?? t('pleaseSelect');
  const resolvedTitle = title ?? t('pleaseSelect');
  const [visible, setVisible] = useState(false);
  /** 面板内的临时路径，确定时才回传 */
  const [draft, setDraft] = useState<any[]>([]);
  /** 上一次的 visible，识别"刚被打开"同步草稿 */
  const prevVisibleRef = useRef(visible);
  if (visible && !prevVisibleRef.current) {
    setDraft(value ?? []);
  }
  prevVisibleRef.current = visible;

  /**
   * 各列选项：第 0 列 = options，第 i 列 = draft[i-1] 的 children。
   * draft 改动第 i 项后，更深的列会整体消失/重建（联动）。
   */
  const columns = useMemo(() => {
    const cols: XCascadeOption[][] = [options];
    let cur = options;
    for (const v of draft) {
      const next = cur?.find(o => o.value === v)?.children;
      if (!next?.length) break;
      cols.push(next);
      cur = next;
    }
    return cols;
  }, [options, draft]);

  const complete = isPathComplete(options, draft);
  const display = (value?.length ? getCascadePathOptions(options, value).map(o => o.label) : []).join(' / ');

  /** 每列一个 wheel 句柄，确定时按视觉位置结算（拖拽/spring 进行中也正确） */
  const wheelRefs = useRef<(XWheelHandle | null)[]>([]);
  wheelRefs.current = [];

  const handleColumnSelect = (colIndex: number, v: any) => {
    // 改第 i 列：截断更深路径后落下当前值，后续列自动联动
    setDraft(prev => [...prev.slice(0, colIndex), v]);
  };

  const handleConfirm = () => {
    if (!complete) return;
    // 结算：以每列滚轮当前视觉位置为准（与 XPicker 同款 flush 策略）
    const flushed = wheelRefs.current.slice(0, columns.length).map(w => w?.flush()?.value);
    const path = flushed.filter(v => v !== undefined);
    if (!isPathComplete(options, path)) return;
    onChange?.(path);
    setVisible(false);
  };

  return (
    <>
      {/* 触发区 */}
      {children ? (
        <Pressable onPress={() => setVisible(true)}>{children}</Pressable>
      ) : (
        <Pressable style={[styles.trigger, {borderColor: theme.colorBorder, backgroundColor: theme.colorBgLayout}]} onPress={() => setVisible(true)}>
            <Text style={[styles.triggerText, {color: display ? theme.colorText : theme.colorTextQuaternary}]} allowFontScaling={false}>
            {display || resolvedPlaceholder}
          </Text>
          <AntDesign name='right' size={16} color={theme.colorTextTertiary} />
        </Pressable>
      )}

      {/* 级联面板 */}
      <XPullView visible={visible} onClose={() => setVisible(false)} side='bottom' duration={200}>
        <View style={[styles.panel, {backgroundColor: theme.colorBgContainer}]}>
          {/* 头部：取消 | 标题 | 确定 */}
          <View style={[styles.header, {borderBottomColor: theme.colorSplit}]}>
            <Pressable onPress={() => setVisible(false)} hitSlop={8}>
              <Text style={[styles.headerBtn, {color: theme.colorTextSecondary}]}>{t('cancel')}</Text>
            </Pressable>
            <Text style={[styles.headerTitle, {color: theme.colorText}]}>{resolvedTitle}</Text>
            <Pressable onPress={handleConfirm} hitSlop={8} disabled={!complete}>
              <Text style={[styles.headerBtn, styles.confirmBtn, {color: !complete ? theme.colorTextQuaternary : theme.colorPrimary}]}>{t('confirm')}</Text>
            </Pressable>
          </View>
          {/* 多列滚轮：列数随路径深度动态增减 */}
          <View style={styles.wheelRow}>
            {columns.map((col, i) => (
              <View key={i} style={styles.wheelCol}>
                <XWheel
                  ref={(r: XWheelHandle | null) => {
                    wheelRefs.current[i] = r;
                  }}
                  items={col as XWheelOption[]}
                  value={draft[i]}
                  onSelect={v => handleColumnSelect(i, v)}
                />
              </View>
            ))}
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
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 40,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  panel: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerBtn: {
    fontSize: 15,
    paddingHorizontal: 4,
  },
  confirmBtn: {
    fontWeight: '600',
  },
  wheelRow: {
    flexDirection: 'row',
  },
  wheelCol: {
    flex: 1,
  },
});

export default XCascadeSelect;
