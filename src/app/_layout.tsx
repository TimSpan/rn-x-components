import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import {
  XPopupProvider,
  XLoadingModalProvider,
  XImagePreviewProvider,
  XToastProvider,
} from '@/x-components';

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      {/*
        状态栏内容色跟着深浅色走：
        浅色页面（白底）→ 黑色文字/图标；深色页面 → 白色。
        之前 app.json 没配 androidStatusBar，Android 默认按 light-content 渲染，
        白底页面上就成了「白字看不见」。
      */}
      <StatusBar style='auto' />
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <XLoadingModalProvider>
            <XImagePreviewProvider>
              <XToastProvider>
                <XPopupProvider>
                  <AppTabs />
                </XPopupProvider>
              </XToastProvider>
            </XImagePreviewProvider>
          </XLoadingModalProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
