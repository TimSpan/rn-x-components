import { ScrollView, StyleSheet, Text, View, Linking, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemeControls, useXTheme } from '@/x-components';

const NPM_URL = 'https://www.npmjs.com/package/react-native-x-components';

export default function AboutScreen() {
  const t = useXTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={[styles.container, {backgroundColor: t.colorBgLayout}]}
      contentContainerStyle={{paddingTop: insets.top + 8, paddingBottom: 80}}
    >
      {/* 顶部主题切换按钮组 */}
      <View style={styles.topBar}>
        <Text style={[styles.topTitle, {color: t.colorTextSecondary}]}>个性化</Text>
        <ThemeControls />
      </View>

      {/* 头部：品牌 */}
      <View style={styles.header}>
        <Image
          source={require('@/assets/icons/x-icon-1024.png')}
          style={styles.avatarBox}
          resizeMode="cover"
        />
        <View style={styles.headerInfo}>
          <Text style={[styles.name, {color: t.colorText}]}>X-Components</Text>
          <Text style={[styles.role, {color: t.colorTextTertiary}]}>
            React Native 高质量组件库
          </Text>
        </View>
      </View>

      {/* npm 信息 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: t.colorTextTertiary}]}>已发布到 npm</Text>
        <View style={[styles.card, {backgroundColor: t.colorBgContainer}]}>
          <InfoRow label="包名" value="react-native-x-components" theme={t} mono />
          <Divider theme={t} />
          <InfoRow
            label="主页"
            value="npmjs.com/package/react-native-x-components"
            theme={t}
            mono
            onPress={() => Linking.openURL(NPM_URL)}
          />
        </View>
      </View>

      {/* 关于本项目 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: t.colorTextTertiary}]}>关于</Text>
        <View style={[styles.card, {backgroundColor: t.colorBgContainer}]}>
          <InfoRow label="作者" value="KevinMao" theme={t} />
          <Divider theme={t} />
          <InfoRow label="技术栈" value="React Native + Reanimated + Zustand" theme={t} />
          <Divider theme={t} />
          <InfoRow label="暗黑模式" value="已支持（切换实时生效）" theme={t} />
          <Divider theme={t} />
          <InfoRow label="中英双语" value="已支持（切换实时生效）" theme={t} />
        </View>
      </View>

      {/* 组件库愿景 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: t.colorTextTertiary}]}>组件库愿景</Text>
        <View style={[styles.card, {backgroundColor: t.colorBgContainer}]}>
          <Text style={[styles.paragraph, {color: t.colorTextSecondary}]}>
            X-Components 致力于成为 React Native 生态中最好用的国产组件库。
            所有组件 API 对标 Ant Design，让前端开发者可以无缝迁移到 RN 开发。
          </Text>
          <Text style={[styles.paragraph, {color: t.colorTextSecondary}]}>
            基于 TopView 的 PullView 弹出层体系，通过 Reanimated 在 UI 线程驱动动画，
            提供比原生 Modal 更快的弹出速度和更丝滑的用户体验。
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={[styles.footerText, {color: t.colorTextQuaternary}]}>
          Made with ❤️ by maoyuxiang
        </Text>
      </View>
    </ScrollView>
  );
}

function InfoRow({
  label,
  value,
  theme,
  mono,
  onPress,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useXTheme>;
  mono?: boolean;
  onPress?: () => void;
}) {
  const Container: any = onPress ? Text : View;
  return (
    <Container
      onPress={onPress}
      style={[styles.contactRow, onPress && {opacity: 0.95}]}
    >
      <Text style={[styles.contactLabel, {color: theme.colorTextSecondary}]}>{label}</Text>
      <Text
        style={[
          styles.contactValue,
          {color: theme.colorPrimary},
          mono && {fontFamily: 'ui-monospace'},
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </Container>
  );
}

function Divider({theme}: {theme: ReturnType<typeof useXTheme>}) {
  return <View style={{height: StyleSheet.hairlineWidth, backgroundColor: theme.colorSplit, marginHorizontal: 16}} />;
}

const styles = StyleSheet.create({
  container: {flex: 1},
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  topTitle: {fontSize: 13, fontWeight: '600'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  avatarBox: {
    width: 64, height: 64, borderRadius: 32,
    marginRight: 16,
  },
  headerInfo: {flex: 1},
  name: {fontSize: 20, fontWeight: '700'},
  role: {fontSize: 14, marginTop: 4},
  section: {paddingHorizontal: 16, marginBottom: 12},
  sectionTitle: {
    fontSize: 13, fontWeight: '600',
    marginBottom: 10, paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12, padding: 4, overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  contactLabel: {fontSize: 15},
  contactValue: {fontSize: 14, fontWeight: '500', maxWidth: 220},
  paragraph: {fontSize: 14, lineHeight: 22, paddingHorizontal: 16, paddingVertical: 8},
  footer: {alignItems: 'center', paddingVertical: 32},
  footerText: {fontSize: 13},
});