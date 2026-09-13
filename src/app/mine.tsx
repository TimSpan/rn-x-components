import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PRIMARY = '#2080F0';

export default function MineScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 80 }}
    >
      {/* 头部 */}
      <View style={styles.header}>
        <View style={styles.avatarBox}>
          <Text style={styles.avatarText}>K</Text>
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.name}>KevinMao</Text>
          <Text style={styles.role}>X-Components 作者</Text>
        </View>
      </View>

      {/* 联系方式 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>联系方式</Text>
        <View style={styles.card}>
          <ContactRow label="手机号" value="17346625362" />
          <Divider />
          <ContactRow label="微信号" value="17346625362" />
          <Divider />
          <ContactRow label="npm 账号" value="maoyuxiang" />
        </View>
      </View>

      {/* 关于本项目 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>关于本项目</Text>
        <View style={styles.card}>
          <InfoRow label="作者" value="KevinMao" />
          <Divider />
          <InfoRow label="项目名称" value="react-native-x-components" />
          <Divider />
          <InfoRow label="技术栈" value="React Native + Reanimated + Zustand" />
          <Divider />
          <InfoRow label="启动命令" value="npx expo run android" />
        </View>
      </View>

      {/* 组件库愿景 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>组件库愿景</Text>
        <View style={styles.card}>
          <Text style={styles.paragraph}>
            X-Components 致力于成为 React Native 生态中最好用的国产组件库。
            所有组件 API 对标 Ant Design，让前端开发者可以无缝迁移到 RN 开发。
          </Text>
          <Text style={styles.paragraph}>
            基于 TopView 的 PullView 弹出层体系，通过 Reanimated 在 UI 线程驱动动画，
            提供比原生 Modal 更快的弹出速度和更丝滑的用户体验。
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>v1.0.0 · Made with ❤️ by maoyuxiang</Text>
      </View>
    </ScrollView>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={styles.contactValue}>{value}</Text>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={styles.contactValueSmall}>{value}</Text>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6F8' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  avatarBox: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: PRIMARY,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  headerInfo: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: 'rgba(0,0,0,0.88)' },
  role: { fontSize: 14, color: 'rgba(0,0,0,0.45)', marginTop: 4 },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: 'rgba(0,0,0,0.45)',
    marginBottom: 10, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 4,
    overflow: 'hidden',
  },
  contactRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  contactLabel: { fontSize: 15, color: 'rgba(0,0,0,0.65)' },
  contactValue: { fontSize: 15, color: PRIMARY, fontWeight: '500' },
  contactValueSmall: { fontSize: 13, color: 'rgba(0,0,0,0.88)', maxWidth: 200, textAlign: 'right' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#F0F0F0', marginHorizontal: 16 },
  paragraph: { fontSize: 14, color: 'rgba(0,0,0,0.65)', lineHeight: 22, paddingHorizontal: 16, paddingVertical: 8 },
  footer: { alignItems: 'center', paddingVertical: 32 },
  footerText: { fontSize: 13, color: 'rgba(0,0,0,0.25)' },
});
