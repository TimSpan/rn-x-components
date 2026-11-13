/**
 * 交互类组件演示页 —— 堆叠卡片（XCardStack）、滚轮（XWheel）与回馈（音效 / 触感）
 */
import React, {useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  XCardStack,
  XWheel,
  XButton,
  isXWheelHapticsEnabled,
  isXWheelSoundEnabled,
  playWheelTick,
  setXWheelHapticsEnabled,
  setXWheelSoundEnabled,
  useXTheme,
} from '@/x-components';
import {DemoPage, Section, Row} from './ui';

// ============================================================================
// XCardStack 堆叠卡片
// ============================================================================
type Shift = {id: string; name: string; start: string; end: string; note: string};

const SHIFTS: Shift[] = [
  {id: '1', name: '白班', start: '09:00', end: '18:00', note: '常规班次'},
  {id: '2', name: '夜班', start: '18:00', end: '02:00', note: '含夜间补贴'},
  {id: '3', name: '早班', start: '06:00', end: '14:00', note: '交接班'},
];

export function XCardStackDemo() {
  const t = useXTheme();
  const [index, setIndex] = useState(0);

  /** 卡片内容：浅蓝描边 + 数据格，实际业务可任意渲染 */
  const renderCard = (item: Shift, i: number) => (
    <View style={[styles.card, {borderColor: i === index ? t.colorPrimary : t.colorSplit}]}>
      <View style={styles.cardHead}>
        <Text style={[styles.cardName, {color: t.colorText}]}>{item.name}</Text>
        <Text style={[styles.cardIndex, {color: t.colorTextTertiary}]}>
          {i + 1} / {SHIFTS.length}
        </Text>
      </View>
      <View style={styles.cardData}>
        <View style={[styles.cell, {backgroundColor: t.colorBgLayout}]}>
          <Text style={[styles.cellValue, {color: t.colorText}]}>{item.start}</Text>
          <Text style={[styles.cellLabel, {color: t.colorTextTertiary}]}>上班</Text>
        </View>
        <View style={[styles.cell, {backgroundColor: t.colorBgLayout}]}>
          <Text style={[styles.cellValue, {color: t.colorText}]}>{item.end}</Text>
          <Text style={[styles.cellLabel, {color: t.colorTextTertiary}]}>下班</Text>
        </View>
      </View>
      <Text style={[styles.cardNote, {color: t.colorTextTertiary}]}>{item.note}</Text>
    </View>
  );

  return (
    <DemoPage>
      <Section title="上下滑动切换（后卡露出 28）">
        <XCardStack data={SHIFTS} index={index} onIndexChange={setIndex} height={176} peek={28} renderCard={renderCard} />
        <Text style={[styles.note, {color: t.colorTextTertiary}]}>
          当前第 {index + 1} 张：{SHIFTS[index].name}
        </Text>
      </Section>

      <Section title="不循环 + 只露 12">
        <XCardStack data={SHIFTS.slice(0, 2)} height={176} peek={12} loop={false} renderCard={renderCard} />
      </Section>

      <Section title="单张（自动禁用滑动）">
        <XCardStack data={SHIFTS.slice(0, 1)} height={176} renderCard={renderCard} />
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XWheel 滚轮 + 回馈
// ============================================================================
const NUMBERS = Array.from({length: 30}, (_, i) => String(i + 1).padStart(2, '0'));

export function XWheelDemo() {
  const t = useXTheme();
  const [value, setValue] = useState('01');
  const [haptic, setHaptic] = useState(isXWheelHapticsEnabled());
  const [sound, setSound] = useState(isXWheelSoundEnabled());

  return (
    <DemoPage>
      <Section title="基础滚轮（每格一次咔哒声 + 极短触感）">
        <View style={styles.wheelBox}>
          <XWheel items={NUMBERS.map(n => ({label: n, value: n}))} value={value} onSelect={setValue} />
        </View>
        <Text style={[styles.note, {color: t.colorTextTertiary}]}>当前值：{value}</Text>
      </Section>

      <Section title="回馈开关">
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, {color: t.colorText}]}>触感（Android CLOCK_TICK）</Text>
          <XButton
            size='small'
            type={haptic ? 'primary' : 'default'}
            onPress={() => {
              const next = !haptic;
              setHaptic(next);
              setXWheelHapticsEnabled(next);
            }}
          >
            {haptic ? '已开启' : '已关闭'}
          </XButton>
        </View>
        <View style={styles.switchRow}>
          <Text style={[styles.switchLabel, {color: t.colorText}]}>声音（内嵌 22ms 咔哒声）</Text>
          <XButton
            size='small'
            type={sound ? 'primary' : 'default'}
            onPress={() => {
              const next = !sound;
              setSound(next);
              setXWheelSoundEnabled(next);
            }}
          >
            {sound ? '已开启' : '已关闭'}
          </XButton>
        </View>
        <Row>
          <XButton size="small" onPress={() => playWheelTick()}>
            手动播一次
          </XButton>
        </Row>
        <Text style={[styles.note, {color: t.colorTextTertiary}]}>
          宿主没装 expo-haptics / expo-audio 时会静默降级，滚动不受影响。
        </Text>
      </Section>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-between',
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardIndex: {
    fontSize: 12,
  },
  cardData: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  cellValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  cellLabel: {
    fontSize: 11,
  },
  cardNote: {
    fontSize: 12,
  },
  note: {
    fontSize: 12,
    marginTop: 8,
  },
  /** 滚轮需要确定高度（内部按容器高度算行高） */
  wheelBox: {
    height: 180,
    overflow: 'hidden',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  switchLabel: {
    fontSize: 14,
  },
});
