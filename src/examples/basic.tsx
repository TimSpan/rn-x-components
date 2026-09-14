import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { XButton, XDivider, XInput, XTag, XProgress, XImage } from '@/x-components';
import { DemoPage, Section, Card, Row } from './ui';

// ============================================================================
// XButton
// ============================================================================
export function XButtonDemo() {
  const [loading, setLoading] = useState(false);
  return (
    <DemoPage>
      <Section title="按钮类型 type">
        <Row>
          <XButton type="primary">主要</XButton>
          <XButton>默认</XButton>
          <XButton type="dashed">虚线</XButton>
          <XButton type="text">文本</XButton>
          <XButton type="link">链接</XButton>
        </Row>
        <Row>
          <XButton type="primary" danger>危险</XButton>
          <XButton danger>危险默认</XButton>
          <XButton type="text" danger>危险文本</XButton>
        </Row>
      </Section>

      <Section title="尺寸 / 形状">
        <Row>
          <XButton size="large" type="primary">大</XButton>
          <XButton size="small" type="primary">小</XButton>
          <XButton type="primary" shape="round">圆角</XButton>
          <XButton type="primary" disabled>禁用</XButton>
        </Row>
      </Section>

      <Section title="block 通栏 / loading">
        <XButton
          type="primary"
          block
          loading={loading}
          onPress={() => {
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
          }}
        >
          点击加载 2s（block 通栏）
        </XButton>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XDivider
// ============================================================================
export function XDividerDemo() {
  return (
    <DemoPage>
      <Section title="基本 / 虚线 / 带标题">
        <Card>
          <Text style={styles.demoText}>上文内容</Text>
          <XDivider />
          <Text style={styles.demoText}>基本分割线</Text>
          <XDivider dashed />
          <XDivider>带标题（居中）</XDivider>
          <XDivider orientation="left">左对齐标题</XDivider>
          <XDivider orientation="right">右对齐标题</XDivider>
          <XDivider orientation="left" orientationMargin={0} plain>
            plain 弱化
          </XDivider>
        </Card>
      </Section>
      <Section title="垂直分割线">
        <Card>
          <Row>
            <Text style={styles.demoText}>文本A</Text>
            <XDivider type="vertical" height={14} />
            <Text style={styles.demoText}>文本B</Text>
            <XDivider type="vertical" height={14} />
            <Text style={styles.demoText}>文本C</Text>
          </Row>
        </Card>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XInput
// ============================================================================
export function XInputDemo() {
  const [val, setVal] = useState('');
  const [amount, setAmount] = useState('');
  return (
    <DemoPage>
      <Section title="基本输入">
        <XInput
          placeholder="请输入"
          value={val}
          onChangeText={setVal}
          allowClear
        />
        <Text style={styles.resultText}>当前值：{val}</Text>
      </Section>
      <Section title="禁用 / 多行">
        <XInput placeholder="禁用状态" disabled />
        <View style={{height: 12}} />
        <XInput placeholder="多行文本（textarea）" multiline />
      </Section>
      <Section title="自定义数字键盘（customKeyboard='numeric'）">
        <XInput
          placeholder="点击输入金额"
          value={amount}
          onChangeText={setAmount}
          customKeyboard="numeric"
          maxLength={10}
        />
        <Text style={styles.resultText}>金额：¥{amount || '0.00'}</Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XTag
// ============================================================================
export function XTagDemo() {
  return (
    <DemoPage>
      <Section title="类型 type">
        <Row>
          <XTag type="primary">primary</XTag>
          <XTag type="success">success</XTag>
          <XTag type="warning">warning</XTag>
          <XTag type="error">error</XTag>
          <XTag>default</XTag>
        </Row>
      </Section>
      <Section title="variant：solid / outline">
        <Row>
          <XTag type="primary" variant="solid">实底</XTag>
          <XTag type="success" variant="solid">实底</XTag>
          <XTag type="primary" variant="outline">描边</XTag>
          <XTag type="error" variant="outline" bordered={false}>无描边</XTag>
        </Row>
      </Section>
      <Section title="color 预设 / 自定义 / 胶囊">
        <Row>
          <XTag color="magenta">magenta</XTag>
          <XTag color="geekblue">geekblue</XTag>
          <XTag color="#f50">#f50</XTag>
          <XTag color="#87d068" variant="solid">#87d068</XTag>
          <XTag color="success" shape="round">胶囊</XTag>
        </Row>
      </Section>
      <Section title="可关闭 / 可点击">
        <Row>
          <XTag color="error" closable onClose={() => console.log('closed')}>可关闭</XTag>
          <XTag color="blue" onPress={() => console.log('pressed')}>可点击</XTag>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XProgress
// ============================================================================
export function XProgressDemo() {
  const [percent, setPercent] = useState(40);
  return (
    <DemoPage>
      <Section title="线性进度条">
        <XProgress percent={percent} />
        <View style={{ height: 12 }} />
        <XProgress percent={percent} strokeColor={{ from: '#2080F0', to: '#52C41A' }} />
        <View style={{ height: 12 }} />
        <XProgress percent={70} status="exception" />
        <View style={{ height: 12 }} />
        <XProgress percent={percent} success={{ percent: 20 }} showInfo={false} />
      </Section>
      <Section title="环形 / 仪表盘">
        <Row style={{ justifyContent: 'space-around' }}>
          <XProgress type="circle" percent={percent} size={80} />
          <XProgress type="circle" percent={100} status="success" size={80} />
          <XProgress type="dashboard" percent={percent} size={80} strokeColor={{ from: '#108EE9', to: '#87D068' }} />
        </Row>
      </Section>
      <Section title="控制">
        <Row>
          <XButton size="small" onPress={() => setPercent(30)}>重置</XButton>
          <XButton size="small" type="primary" onPress={() => setPercent(p => Math.min(100, p + 10))}>+10</XButton>
          <XButton size="small" onPress={() => setPercent(100)}>加满</XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XImage
// ============================================================================
export function XImageDemo() {
  return (
    <DemoPage>
      <Section title="带加载态的图片">
        <Row>
          <XImage
            uri="https://picsum.photos/id/1015/200/200"
            style={{ width: 120, height: 120, borderRadius: 12 }}
          />
          <XImage
            uri="https://picsum.photos/id/1024/200/200"
            style={{ width: 120, height: 120, borderRadius: 12 }}
            onPress={() => console.log('image pressed')}
          />
        </Row>
      </Section>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  demoText: { fontSize: 14, color: 'rgba(128,128,128,0.9)' },
  resultText: { fontSize: 13, color: '#2080F0', marginTop: 8 },
});
