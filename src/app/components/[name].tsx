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
  return (
    <>
      <Stack.Screen options={{ title: meta.title }} />
      <Demo />
    </>
  );
}
