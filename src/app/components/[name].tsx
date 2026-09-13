import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { getComponentMeta, Not_found } from '@/examples/registry';

export default function ComponentDetail() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const meta = getComponentMeta(name);

  if (!meta) {
    return (
      <>
        <Stack.Screen options={{ title: '未找到' }} />
        <Not_found name={name} />
      </>
    );
  }

  const Demo = meta.component;
  const Wrapper = meta.noScroll ? DemoNoScroll : DemoScroll;
  return (
    <>
      <Stack.Screen options={{ title: meta.title }} />
      <Wrapper>
        <Demo />
      </Wrapper>
    </>
  );
}

/** 包裹 ScrollView 的常规详情容器 */
function DemoScroll({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F6F8' }}>
      {children}
    </View>
  );
}

/** 跳过 ScrollView：避免与 SectionList 等虚拟化列表嵌套告警 */
function DemoNoScroll({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
