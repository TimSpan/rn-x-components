import { ScrollView, StyleSheet, Text, View, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeControls } from "@/x-components";

const PRIMARY = "#2080F0";
const COMPONENTS: { name: string; desc: string }[] = [
  // 基础
  {name: "XButton", desc: "按钮"},
  {name: "XDivider", desc: "分割线"},
  {name: "XInput", desc: "输入框"},
  {name: "XTag", desc: "标签"},
  {name: "XProgress", desc: "进度条"},
  {name: "XRadio", desc: "单选框"},
  {name: "XCheckbox", desc: "多选框"},
  // 表单
  {name: "XForm", desc: "表单"},
  {name: "XFormPro", desc: "低代码表单"},
  {name: "XCascadeSelect", desc: "级联选择"},
  {name: "XMultiSelect", desc: "多选选择器"},
  // 弹层
  {name: "XPullView", desc: "弹出层"},
  {name: "XActionSheet", desc: "底部菜单"},
  {name: "XPicker", desc: "滚轮选择器"},
  {name: "XPickerDate", desc: "日期选择"},
  {name: "XModalForm", desc: "居中弹层"},
  {name: "XConfirmForm", desc: "确认框"},
  {name: "XAnimatedView", desc: "动画引擎"},
  // 全局命令式
  {name: "XToast", desc: "轻提示"},
  {name: "XLoadingModal", desc: "全局加载"},
  {name: "XImagePreview", desc: "图片预览"},
  // 复合
  {name: "XAnimatedSearchPanel", desc: "搜索面板"},
  {name: "XImage", desc: "图片"},
  // v2 新增：交互
  {name: "XCarousel", desc: "轮播图"},
  {name: "XTabs", desc: "选项卡"},
  {name: "XDropdownMenu", desc: "下拉菜单"},
  {name: "XNumberKeyboard", desc: "数字键盘"},
  {name: "XLicensePlate", desc: "车牌输入"},
  // v2 新增：媒体
  {name: "XCalendar", desc: "日历"},
  {name: "XCalendarPopup", desc: "弹窗日历"},
  {name: "XRecord", desc: "录音"},
  {name: "XSignature", desc: "普通签名"},
  {name: "XSignatureSkia", desc: "Skia 逐字签名"},
  {name: "XUploadImage", desc: "图片上传"},
  {name: "XUploadVideo", desc: "视频上传"},
  {name: "XVideoPreview", desc: "视频预览"},
  // v2 新增：数据
  {name: "XChart", desc: "折线/柱状/饼图"},
];

export default function IntroScreen() {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 80 }}
    >
      {/* 顶部主题切换 */}
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>个性化</Text>
        <ThemeControls />
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={[styles.logoBox, {backgroundColor: PRIMARY}]}>
          <Text style={styles.logoText}>X</Text>
        </View>
        <Text style={styles.heroTitle}>X-Components</Text>
        <Text style={styles.heroSubtitle}>React Native 高质量组件库</Text>
      </View>

      {/* 介绍卡片 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>为什么选择 X-Components？</Text>
        <Text style={styles.paragraph}>
          尽管身处 AI
          时代，代码生成已日趋成熟，但一个经过精心打磨的高质量组件库依然能为你节省大量工作。
          X-Components
          将常用业务场景沉淀为可复用的组件，让你把精力聚焦在业务逻辑而非重复造轮子上。
        </Text>
        <Text style={styles.paragraph}>
          基于 TopView 实现的 PullView 弹出层体系，通过 Reanimated 在 UI
          线程驱动动画， 相比 React Native 原生 Modal
          拥有更快的弹出速度、更低的渲染开销和更丝滑的手感。
        </Text>
      </View>

      {/* 核心特性 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>核心特性</Text>
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureTitle}>UI 线程动画</Text>
            <Text style={styles.featureDesc}>
              Reanimated worklet 驱动，不依赖 JS 线程，动画不掉帧
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎯</Text>
            <Text style={styles.featureTitle}>API 对标 antd</Text>
            <Text style={styles.featureDesc}>
              如果你熟悉 Ant Design，可以零学习成本上手
            </Text>
          </View>
        </View>
        <View style={styles.featureRow}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>📦</Text>
            <Text style={styles.featureTitle}>零重型依赖</Text>
            <Text style={styles.featureDesc}>
              不依赖 antd-mobile / ant-design-react-native，纯净轻量
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🎨</Text>
            <Text style={styles.featureTitle}>统一设计 Token</Text>
            <Text style={styles.featureDesc}>
              颜色 / 圆角 / 字号集中管理，换肤只改一个文件
            </Text>
          </View>
        </View>
      </View>

      {/* 弹出层架构 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>PullView 弹出层架构</Text>
        <Text style={styles.paragraph}>
          全套弹出层组件围绕 XPullView 构建，通过全局 XTopView 宿主绘制，
          绕开原生 Modal 窗口创建/销毁的开销：
        </Text>
        <View style={styles.archTree}>
          <Text style={styles.archNode}>XPopupProvider（App 根部挂载）</Text>
          <Text style={styles.archLine}>
            ├── XTopView（全局宿主：画所有弹层）
          </Text>
          <Text style={styles.archLine}>├── XPullView（通用弹出层核心）</Text>
          <Text style={styles.archLine}>│ ├── XActionSheet（底部菜单）</Text>
          <Text style={styles.archLine}>│ ├── XPicker（滚轮选择）</Text>
          <Text style={styles.archLine}>│ ├── XPickerDate（日期选择）</Text>
          <Text style={styles.archLine}>│ └── XWheel（通用滚轮列）</Text>
          <Text style={styles.archLine}>├── XModalForm（居中弹层）</Text>
          <Text style={styles.archLine}>
            └── XConfirmForm（命令式 confirm()）
          </Text>
        </View>
      </View>

      {/* 手势 + UI 线程 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>手势 + UI 线程：丝滑的全部秘密</Text>
        <Text style={styles.paragraph}>
          普通组件的手势回调运行在 JS 线程：手指一动，事件要先穿过 Bridge
          到 JS 处理，再把指令发回原生 —— 一旦 JS
          线程忙（渲染长列表、网络回调），拖拽立刻卡顿掉帧。
        </Text>
        <Text style={styles.paragraph}>
          X-Components 的可交互组件（滚轮、弹层拖拽等）使用
          react-native-gesture-handler 把手势回调直接编译成 worklet，
          与 Reanimated 共享值（SharedValue）在 UI
          线程闭环协作：手势 → 更新共享值 → 驱动动画，全程不经过 JS
          线程。哪怕 JS 被完全占满，手指到哪儿，界面就跟到哪儿。
        </Text>
        <View style={styles.flowBox}>
          <Text style={styles.flowText}>
            手指拖动 → Gesture.Pan（UI 线程） → SharedValue → Animated
            样式 → 逐帧渲染
          </Text>
          <Text style={styles.flowSub}>全程 UI 线程闭环，JS 零参与</Text>
        </View>
      </View>

      {/* Picker 滚轮体系 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Picker 滚轮体系</Text>
        <Text style={styles.paragraph}>
          滚轮选择器是移动端最考验手感的基础控件。X-Components 参考
          antd-mobile Picker 的核心架构，用 RN 原生手势 + Reanimated
          重写了通用滚轮列 XWheel，并被 XPicker（单列选择）、XPickerDate
          （多列日期）共用。
        </Text>
        <View style={styles.bulletList}>
          <Text style={styles.bullet}>
            🎯 没有 ScrollView —— 一个手势 + 一个平移值：Gesture.Pan
            驱动单个 y 共享值，整列只是整体 translateY，滚动中每帧只有 1
            个 transform 更新，零逐行计算、零 JS 参与
          </Text>
          <Text style={styles.bullet}>
            🧤 橡皮筋越界 —— 拖出边界时按 antd 原公式 rubberband
            阻尼回拉，松手自动回弹
          </Text>
          <Text style={styles.bullet}>
            🚀 动量投影落位 —— 松手按「位置 + 速度投影」夹取到目标行，
            withSpring 过阻尼弹簧落位，干脆利落不飘
          </Text>
          <Text style={styles.bullet}>
            ⚡ 选中即时上报 —— 不等动画结束立刻回调选中值，与 antd
            行为一致
          </Text>
          <Text style={styles.bullet}>
            🎭 遮罩即高亮 —— 所有行视觉完全一致，选中表现来自上下渐变遮罩
            + 中间框线，渲染成本恒定
          </Text>
        </View>
      </View>

      {/* 组件清单 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          组件清单（{COMPONENTS.length} 个）
        </Text>
        <View style={styles.compGrid}>
          {COMPONENTS.map((c) => (
            <View key={c.name} style={styles.compChip}>
              <Text style={styles.compName}>{c.name}</Text>
              <Text style={styles.compDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* npm 已发布 */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>已发布到 npm 🎉</Text>
        <Text style={styles.paragraph}>
          包名：
          <Text style={styles.code}> react-native-x-components</Text>
          {"\n"}最新版本：
          <Text style={styles.code}>0.1.0</Text>
          {"\n"}安装：
          <Text style={styles.code}>npm install react-native-x-components</Text>
          {"\n"}
          {"\n"}主页：
          <Text
            style={[styles.code, {textDecorationLine: 'underline'}]}
            onPress={() => Linking.openURL('https://www.npmjs.com/package/react-native-x-components')}
          >
            https://www.npmjs.com/package/react-native-x-components
          </Text>
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          X-Components · Made with ❤️ by KevinMao
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F6F8" },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  topTitle: { fontSize: 13, color: 'rgba(0,0,0,0.45)', fontWeight: '600' },
  hero: { alignItems: "center", paddingVertical: 40 },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: PRIMARY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoText: { fontSize: 44, fontWeight: "800", color: "#fff" },
  heroTitle: { fontSize: 26, fontWeight: "700", color: "rgba(0,0,0,0.88)" },
  heroSubtitle: { fontSize: 15, color: "rgba(0,0,0,0.45)", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(0,0,0,0.88)",
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 14,
    color: "rgba(0,0,0,0.65)",
    lineHeight: 22,
    marginBottom: 8,
  },
  code: { fontFamily: "monospace", color: PRIMARY, fontWeight: "600" },
  section: { paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(0,0,0,0.88)",
    marginBottom: 12,
  },
  featureRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  featureItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  featureIcon: { fontSize: 28, marginBottom: 8 },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(0,0,0,0.88)",
    marginBottom: 4,
  },
  featureDesc: { fontSize: 12, color: "rgba(0,0,0,0.45)", lineHeight: 18 },
  archTree: { marginTop: 12, paddingLeft: 8 },
  archNode: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
    marginBottom: 4,
  },
  archLine: {
    fontSize: 12,
    color: "rgba(0,0,0,0.65)",
    lineHeight: 22,
    fontFamily: "monospace",
  },
  compGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  compChip: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  compName: { fontSize: 13, fontWeight: "600", color: PRIMARY },
  compDesc: { fontSize: 11, color: "rgba(0,0,0,0.45)" },
  flowBox: {
    marginTop: 8,
    backgroundColor: "#F0F7FF",
    borderRadius: 8,
    padding: 12,
  },
  flowText: {
    fontSize: 12,
    lineHeight: 20,
    fontFamily: "monospace",
    color: PRIMARY,
    fontWeight: "600",
  },
  flowSub: { fontSize: 12, color: "rgba(0,0,0,0.45)", marginTop: 4 },
  bulletList: { marginTop: 4 },
  bullet: {
    fontSize: 13,
    color: "rgba(0,0,0,0.65)",
    lineHeight: 21,
    marginBottom: 8,
  },
  footer: { alignItems: "center", paddingVertical: 24 },
  footerText: { fontSize: 13, color: "rgba(0,0,0,0.25)" },
});
