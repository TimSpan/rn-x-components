import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  XButton,
  XToastService,
  XLoadingModalService,
  XImagePreviewService,
  XAnimatedSearchPanel,
} from '@/x-components';
import { DemoPage, Section, Row } from './ui';

const ONLINE_IMAGES = [
  'https://picsum.photos/id/1015/1200/800',
  'https://picsum.photos/id/1016/1200/800',
  'https://picsum.photos/id/1018/1200/800',
  'https://picsum.photos/id/1024/1200/800',
];

// ============================================================================
// XToast
// ============================================================================
export function XToastDemo() {
  return (
    <DemoPage>
      <Section title="轻提示类型">
        <Row>
          <XButton type="primary" size="small" onPress={() => XToastService.show({ message: '保存成功', type: 'success' })}>成功</XButton>
          <XButton type="primary" danger size="small" onPress={() => XToastService.show({ message: '网络错误', type: 'error' })}>失败</XButton>
          <XButton type="primary" size="small" onPress={() => XToastService.show({ message: '版本 v1.0', type: 'info' })}>信息</XButton>
          <XButton type="primary" size="small" onPress={() => XToastService.show({ message: '空间不足', type: 'warning' })}>警告</XButton>
          <XButton size="small" onPress={() => XToastService.show({ message: '加载中...', type: 'loading' })}>加载</XButton>
          <XButton size="small" onPress={() => XToastService.show({ message: '纯文本', type: 'text' })}>纯文本</XButton>
        </Row>
      </Section>
      <Section title="位置">
        <Row>
          <XButton size="small" onPress={() => XToastService.show({ message: '顶部', type: 'info', position: 'top' })}>顶部</XButton>
          <XButton size="small" onPress={() => XToastService.show({ message: '居中', type: 'info', position: 'center' })}>居中</XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XLoadingModal
// ============================================================================
export function XLoadingModalDemo() {
  return (
    <DemoPage>
      <Section title="全局加载（引用计数）">
        <Row>
          <XButton type="primary" size="small" onPress={() => {
            XLoadingModalService.show({ title: '加载中...' });
            setTimeout(() => XLoadingModalService.hide(), 2000);
          }}>单次加载 2s</XButton>
          <XButton type="primary" size="small" onPress={() => {
            XLoadingModalService.show({ title: '第一步...' });
            setTimeout(() => XLoadingModalService.show({ title: '第二步...' }), 600);
            setTimeout(() => XLoadingModalService.hide(), 1500);
            setTimeout(() => XLoadingModalService.hide(), 2600);
          }}>并发加载演示</XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XImagePreview
// ============================================================================
export function XImagePreviewDemo() {
  return (
    <DemoPage>
      <Section title="全屏图片预览">
        <Row>
          <XButton type="primary" size="small" onPress={() => XImagePreviewService.show({ images: ONLINE_IMAGES, initialIndex: 0 })}>
            预览（第一张）
          </XButton>
          <XButton type="primary" size="small" onPress={() => XImagePreviewService.show({ images: ONLINE_IMAGES, initialIndex: 3 })}>
            预览（第四张）
          </XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XAnimatedSearchPanel
// ============================================================================
export function XAnimatedSearchPanelDemo() {
  return (
    <DemoPage>
      <Section title="列表头可折叠搜索面板">
        <Text style={styles.desc}>
          单 progress 驱动高度/淡入/箭头旋转/文案交叉淡入，点击标题展开/收起
        </Text>
      </Section>
      <View style={styles.panelContainer}>
        <XAnimatedSearchPanel
          onSearch={() => XToastService.show({ message: '搜索', type: 'info' })}
          onReset={() => XToastService.show({ message: '重置', type: 'info' })}
        >
          <View style={styles.searchContent}>
            <Text style={styles.searchText}>搜索条件区域（可折叠）</Text>
            <Text style={styles.desc}>这里放筛选表单控件</Text>
          </View>
        </XAnimatedSearchPanel>
      </View>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  desc: { fontSize: 13, color: 'rgba(0,0,0,0.45)', lineHeight: 20 },
  panelContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchContent: {
    padding: 16,
    backgroundColor: '#E6F1FE',
  },
  searchText: { fontSize: 14, color: '#2080F0' },
});
