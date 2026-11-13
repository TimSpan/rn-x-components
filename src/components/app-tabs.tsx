import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      /**
       * 选中指示块 + 点击涟漪都换成品牌色系。
       * 原来是 indicatorColor={colors.backgroundElement}（浅灰）+ 不设 rippleColor，
       * 后者会走 Material3 主题默认的 colorSecondaryContainer（青绿），
       * 点击时闪一下绿色块很难看。这里 ripple 直接置透明，只保留品牌淡蓝的指示块。
       *
       * 想彻底去掉选中块：加 disableIndicator 即可（涟漪已透明，点击就完全没有色块）。
       */
      indicatorColor={scheme === 'dark' ? 'rgba(32,128,240,0.28)' : '#E8F1FE'}
      rippleColor="transparent"
      labelStyle={{ selected: { color: '#2080F0' } }}
      iconColor={{ selected: '#2080F0' }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>介绍</NativeTabs.Trigger.Label>
        {/* Android: res/drawable 里的矢量 XML；iOS: 系统 SF Symbol。两端都是矢量，不依赖位图 */}
        <NativeTabs.Trigger.Icon sf='book.fill' drawable='ic_tab_book' />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="components">
        <NativeTabs.Trigger.Label>组件</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf='square.grid.2x2.fill' drawable='ic_tab_grid' />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="mine">
        <NativeTabs.Trigger.Label>关于</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf='person.fill' drawable='ic_tab_mine' />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
