import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  XButton,
  XActionSheet,
  XPicker,
  XPickerDate,
  XModalForm,
  XPullView,
  confirm,
  XAnimatedView,
  anim,
  XInput,
} from '@/x-components';
import { DemoPage, Section, Row } from './ui';

// ============================================================================
// XPullView
// ============================================================================
export function XPullViewDemo() {
  const [visible, setVisible] = useState(false);
  const [sideVisible, setSideVisible] = useState(false);
  return (
    <DemoPage>
      <Section title="底部弹出层（side=bottom）">
        <XButton type="primary" onPress={() => setVisible(true)}>弹出底部面板</XButton>
      </Section>
      <Section title="居中弹出层（side=center）">
        <XButton type="primary" onPress={() => setSideVisible(true)}>弹出居中面板</XButton>
      </Section>
      <XPullView visible={visible} onClose={() => setVisible(false)} side="bottom">
        <View style={styles.pullContent}>
          <Text style={styles.pullTitle}>底部弹出面板</Text>
          <Text style={styles.pullDesc}>
            基于 TopView 实现的 PullView 弹层，比 RN Modal 拥有更快的弹出速度。{'\n'}
            动画在 UI 线程驱动，不依赖 JS 线程。
          </Text>
          <XButton type="primary" block onPress={() => setVisible(false)}>关闭</XButton>
        </View>
      </XPullView>
      <XPullView visible={sideVisible} onClose={() => setSideVisible(false)} side="center" duration={150}>
        <View style={styles.centerContent}>
          <Text style={styles.pullTitle}>居中弹出</Text>
          <Text style={styles.pullDesc}>scale 0.85→1 + 淡入，150ms</Text>
          <XButton type="primary" onPress={() => setSideVisible(false)}>确定</XButton>
        </View>
      </XPullView>
    </DemoPage>
  );
}

// ============================================================================
// XActionSheet
// ============================================================================
export function XActionSheetDemo() {
  const [visible, setVisible] = useState(false);
  const [result, setResult] = useState('');
  return (
    <DemoPage>
      <Section title="底部菜单">
        <XButton type="primary" onPress={() => setVisible(true)}>弹出菜单</XButton>
        {result ? <Text style={styles.resultText}>选择了：{result}</Text> : null}
      </Section>
      <XActionSheet
        visible={visible}
        onClose={() => setVisible(false)}
        title="请选择操作"
        options={[
          { label: '保存', value: 'save' },
          { label: '分享', value: 'share' },
          { label: '删除', value: 'delete', danger: true },
        ]}
        onSelect={(option) => {
          setResult(option.label);
          setVisible(false);
        }}
      />
    </DemoPage>
  );
}

// ============================================================================
// XPicker
// ============================================================================
export function XPickerDemo() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState<any>(null);
  const options = [
    { label: '苹果', value: 'apple' },
    { label: '香蕉', value: 'banana' },
    { label: '橙子', value: 'orange' },
    { label: '葡萄', value: 'grape' },
    { label: '西瓜', value: 'watermelon' },
  ];
  return (
    <DemoPage>
      <Section title="单列滚轮选择">
        <XButton type="primary" onPress={() => setVisible(true)}>选择水果</XButton>
        {value != null && <Text style={styles.resultText}>当前值：{value}</Text>}
      </Section>
      <XPicker
        visible={visible}
        onClose={() => setVisible(false)}
        options={options}
        value={value}
        onChange={(v) => setValue(v)}
        title="请选择"
      />
    </DemoPage>
  );
}

// ============================================================================
// XPickerDate
// ============================================================================
export function XPickerDateDemo() {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState<string>('');
  return (
    <DemoPage>
      <Section title="日期选择（年月日）">
        <XButton type="primary" onPress={() => setVisible(true)}>选择日期</XButton>
        {value ? <Text style={styles.resultText}>当前值：{value}</Text> : null}
      </Section>
      <XPickerDate
        visible={visible}
        onClose={() => setVisible(false)}
        value={value}
        onChange={(v) => setValue(v)}
        format="YYYY-MM-DD"
      />
    </DemoPage>
  );
}

// ============================================================================
// XModalForm
// ============================================================================
export function XModalFormDemo() {
  const [visible, setVisible] = useState(false);
  const [inputVal, setInputVal] = useState('');
  return (
    <DemoPage>
      <Section title="居中弹层表单">
        <XButton type="primary" onPress={() => setVisible(true)}>弹出表单</XButton>
      </Section>
      <XModalForm
        visible={visible}
        onClose={() => setVisible(false)}
        title="请输入名称"
        onSubmit={() => {
          if (!inputVal.trim()) return false;
          setVisible(false);
          return true;
        }}
      >
        <XInput
          placeholder="请输入名称"
          value={inputVal}
          onChangeText={setInputVal}
        />
      </XModalForm>
    </DemoPage>
  );
}

// ============================================================================
// XConfirmForm / confirm
// ============================================================================
export function XConfirmFormDemo() {
  const [result, setResult] = useState('');
  return (
    <DemoPage>
      <Section title="命令式确认框（Promise）">
        <XButton type="primary" onPress={async () => {
          const ok = await confirm({
            title: '确认删除？',
            content: '删除后不可恢复，确定继续吗？',
            confirmText: '删除',
            cancelText: '取消',
            danger: true,
          });
          setResult(ok ? '已确认删除' : '已取消');
        }}>弹出确认框</XButton>
        {result ? <Text style={styles.resultText}>{result}</Text> : null}
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XAnimatedView
// ============================================================================
export function XAnimatedViewDemo() {
  const [toggle, setToggle] = useState(false);
  const animation = anim(300, 'ease-out')
    .translateY(toggle ? -20 : 0)
    .opacity(toggle ? 0 : 1)
    .step()
    .translateY(toggle ? 0 : -20)
    .opacity(toggle ? 1 : 0)
    .step()
    .export();

  return (
    <DemoPage>
      <Section title="动画引擎 anim() 链式构建器">
        <XButton type="primary" onPress={() => setToggle(t => !t)}>播放动画</XButton>
        <View style={{ height: 20 }} />
        <XAnimatedView animation={animation} style={styles.animBox}>
          <Text style={styles.animText}>XAnimatedView</Text>
        </XAnimatedView>
      </Section>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  pullContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  pullTitle: { fontSize: 17, fontWeight: '600', color: 'rgba(0,0,0,0.88)', marginBottom: 8 },
  pullDesc: { fontSize: 14, color: 'rgba(0,0,0,0.65)', lineHeight: 22, marginBottom: 16 },
  centerContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: 260,
    alignItems: 'center',
  },
  resultText: { fontSize: 13, color: '#2080F0', marginTop: 8 },
  animBox: {
    width: '100%',
    height: 80,
    backgroundColor: '#2080F0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  animText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
