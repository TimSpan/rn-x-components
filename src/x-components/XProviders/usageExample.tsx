/**
 * ============================================================================
 * XProviders 使用示例（可运行演示页）
 * ============================================================================
 *
 * 演示 XLoadingModal / XImagePreview / XToast 三件套的完整用法。
 * 页面自身演示了正确的挂载层级（生产环境应挂到 App 根部，这里为了独立可跑
 * 直接包在本页内；SafeAreaProvider / GestureHandlerRootView 已由 App 根部
 * 提供时无需重复包裹，本页包一层是为了单独调试也能正常运行）。
 *
 * 快速上手（别处使用）：
 *   XLoadingModalService.show({title: '上传中...'});
 *   XLoadingModalService.hide();
 *   XImagePreviewService.show({images: urls, initialIndex: 0});
 *   XToastService.show({message: '保存成功', type: 'success'});
 */
import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {XButton} from '../XButton';
import {
  XImagePreviewProvider,
  XImagePreviewService,
  XLoadingModalProvider,
  XLoadingModalService,
  XToastProvider,
  XToastService,
} from './';

/** 在线演示图片（picsum 随机图床） */
const ONLINE_IMAGES = [
  'https://picsum.photos/id/1015/1200/800',
  'https://picsum.photos/id/1016/1200/800',
  'https://picsum.photos/id/1018/1200/800',
  'https://picsum.photos/id/1024/1200/800',
];

/** 演示区块 */
const Section = ({title, description, children}: {title: string; description?: string; children: React.ReactNode}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {!!description && <Text style={styles.sectionDesc}>{description}</Text>}
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

const XProvidersDemo = () => {
  // ---- XToast ----
  const showToast = (type: 'success' | 'error' | 'info' | 'warning' | 'loading' | 'text') => {
    const map = {
      success: '保存成功',
      error: '网络错误，请重试',
      info: '当前版本 v2.3.1',
      warning: '存储空间不足',
      loading: '正在加载...',
      text: '这是一条纯文本 Toast',
    } as const;
    XToastService.show({message: map[type], type});
  };

  // ---- XLoadingModal ----
  const showLoadingOnce = () => {
    XLoadingModalService.show({title: '加载中...'});
    setTimeout(() => XLoadingModalService.hide(), 2000);
  };

  /** 并发场景：两个 show + 两个 hide，验证引用计数（弹窗不会提前消失） */
  const showLoadingConcurrent = () => {
    XLoadingModalService.show({title: '第一步...'});
    setTimeout(() => XLoadingModalService.show({title: '第二步...'}), 600);
    setTimeout(() => XLoadingModalService.hide(), 1500);
    // 第二个 hide（2.6s）之前，第一步的 hide 不会让弹窗提前关闭
    setTimeout(() => XLoadingModalService.hide(), 2600);
  };

  // ---- XImagePreview ----
  const previewImages = (initialIndex: number) => {
    XImagePreviewService.show({images: ONLINE_IMAGES, initialIndex});
  };

  return (
    <SafeAreaProvider>
      <XLoadingModalProvider>
        <XImagePreviewProvider>
          <XToastProvider>
            <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
              <Section title='XToast 轻提示' description='深色胶囊 + 语义图标，支持 top / center / bottom 三个位置'>
                <View style={styles.row}>
                  <XButton type='primary' size='small' onPress={() => showToast('success')}>
                    成功
                  </XButton>
                  <XButton type='primary' danger size='small' onPress={() => showToast('error')}>
                    失败
                  </XButton>
                  <XButton type='primary' size='small' onPress={() => showToast('info')}>
                    信息
                  </XButton>
                  <XButton type='primary' size='small' onPress={() => showToast('warning')}>
                    警告
                  </XButton>
                </View>
                <View style={styles.row}>
                  <XButton size='small' onPress={() => showToast('loading')}>
                    加载中
                  </XButton>
                  <XButton size='small' onPress={() => showToast('text')}>
                    纯文本
                  </XButton>
                  <XButton
                    size='small'
                    onPress={() => XToastService.show({message: '我是顶部 Toast', type: 'info', position: 'top'})}>
                    顶部
                  </XButton>
                  <XButton
                    size='small'
                    onPress={() => XToastService.show({message: '我是居中 Toast', type: 'info', position: 'center'})}>
                    居中
                  </XButton>
                </View>
              </Section>

              <Section title='XLoadingModal 全局加载' description='show/hide 带引用计数，并发请求不会互相打断'>
                <View style={styles.row}>
                  <XButton type='primary' size='small' onPress={showLoadingOnce}>
                    单次加载 2s
                  </XButton>
                  <XButton type='primary' size='small' onPress={showLoadingConcurrent}>
                    并发加载演示
                  </XButton>
                </View>
              </Section>

              <Section title='XImagePreview 图片预览' description='在线图片演示，双指缩放 / 左右翻页 / 点击关闭'>
                <View style={styles.row}>
                  <XButton type='primary' size='small' onPress={() => previewImages(0)}>
                    预览（第一张）
                  </XButton>
                  <XButton type='primary' size='small' onPress={() => previewImages(3)}>
                    预览（第四张）
                  </XButton>
                </View>
              </Section>
            </ScrollView>
          </XToastProvider>
        </XImagePreviewProvider>
      </XLoadingModalProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.88)',
  },
  sectionDesc: {
    marginTop: 4,
    fontSize: 12,
    color: 'rgba(0,0,0,0.45)',
    lineHeight: 18,
  },
  sectionBody: {
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
});

export default XProvidersDemo;
