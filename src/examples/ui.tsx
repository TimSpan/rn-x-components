import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useXTheme } from '@/x-components';

/** 示例区块标题 */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useXTheme();
  return (
    <View style={[styles.section, {backgroundColor: t.colorBgContainer}]}>
      <Text style={[styles.sectionTitle, {color: t.colorTextTertiary, backgroundColor: t.colorBgLayout}]}>{title}</Text>
      <View style={[styles.sectionBody, {borderTopColor: t.colorSplit}]}>{children}</View>
    </View>
  );
}

/** 示例页面容器（ScrollView + SafeArea） */
export function DemoPage({ children }: { children: React.ReactNode }) {
  const t = useXTheme();
  return (
    <View style={[styles.page, {backgroundColor: t.colorBgLayout}]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
    </View>
  );
}

/** 卡片 */
export function Card({ children }: { children: React.ReactNode }) {
  const t = useXTheme();
  return <View style={[styles.card, {backgroundColor: t.colorBgContainer}]}>{children}</View>;
}

/** 行容器 */
export function Row({ children, style }: { children: React.ReactNode; style?: any }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionBody: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
});
