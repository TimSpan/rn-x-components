import { Stack } from 'expo-router';

export default function ComponentsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontSize: 16, fontWeight: '600' },
        headerShadowVisible: false,
        headerTintColor: '#2080F0',
      }}
    />
  );
}
