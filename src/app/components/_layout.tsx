import { Stack } from 'expo-router';
import { useXTheme } from '@/x-components';

/** 组件区导航栏：跟随 X-Components 主题（暗黑/品牌色） */
export default function ComponentsLayout() {
  const t = useXTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: t.colorBgContainer },
        headerTitleStyle: { fontSize: 16, fontWeight: '600', color: t.colorText },
        headerShadowVisible: false,
        headerTintColor: t.colorPrimary,
      }}
    />
  );
}
