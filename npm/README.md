# react-native-x-components

<div align="center">

[![npm version](https://img.shields.io/npm/v/react-native-x-components.svg)](https://www.npmjs.com/package/react-native-x-components)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-TimSpan%2Frn--x--components-181717?logo=github)](https://github.com/TimSpan/rn-x-components)

</div>

Ant Design 风格的 React Native (Expo) 组件库。对齐 antd v5 设计 token，内置**暗黑模式**与**中英双语**，弹层体系基于自研 TopView（比 RN Modal 更快），覆盖表单、选择器、日历、录音、签名（Skia 逐字签名）、上传（MinIO 预签名适配器）、轻量图表等 40+ 组件。

- 📦 GitHub：https://github.com/TimSpan/rn-x-components
- 📖 文档：https://react-native-x-components.dev（AI 可抓取 `/llms-full.txt` 全量文档）
- 💬 微信交流（问题反馈 / 技术交流 / 定制咨询）：

<div align="center">
<img src="./wechat-qrcode.png" alt="微信添加 Otis 为好友" width="260" />
</div>

> 🤖 **AI 编码工具（Cursor/Copilot/Claude 等）请先读包内 [AGENTS.md](./AGENTS.md)** ——
> 前置接线清单、常见错误对照表、最小代码骨架，能避开 90% 的集成坑。

## 30 秒最小骨架

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { XPopupProvider, XButton, XToastService, confirm } from 'react-native-x-components';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <XPopupProvider>   {/* 必挂！否则命令式 API 静默失效 */}
        <XButton
          type="primary"
          onPress={async () => {
            const ok = await confirm({ title: '确认提交？', danger: true });
            if (ok) XToastService.show({ message: '已提交', type: 'success' });
          }}
        >
          点我
        </XButton>
      </XPopupProvider>
    </GestureHandlerRootView>
  );
}
```

## 特性

- 🌗 **暗黑模式**：`useXTheme()` 全组件自适应，`setXThemeMode('light' | 'dark' | 'system')` 一行切换
- 🌐 **国际化**：内置 zh-CN / en-US 字典，`setXLocale('en-US')` 即时生效
- ⚡ **TopView 弹层**：Reanimated UI 线程驱动，无原生 Modal 开销
- 📝 **Skia 逐字签名**：一字一格可重写，结构化 value，中点二次贝塞尔平滑
- 📤 **上传适配器**：UI 与上传彻底解耦，内置 MinIO 预签名直传 / multipart / Mock 三种适配器
- 📊 **轻量图表**：react-native-svg 自研折线/柱状/环形，零重量级依赖

## 安装

```bash
npm install react-native-x-components dayjs zustand
# 必需 peer 依赖（Expo 项目推荐用 expo install 自动匹配版本）
npx expo install react-native-reanimated react-native-safe-area-context react-native-svg
# 推荐安装（XImagePreview/XInput 焦点等需要手势处理）：
npx expo install react-native-gesture-handler
# 可选（按需装）：
# 签名: npx expo install @shopify/react-native-skia
# 录音: npx expo install expo-audio
# 上传: npx expo install expo-image-picker expo-image-manipulator expo-file-system
```

### Android 权限说明（首次录音 / 拍照 / 选媒体时系统会自动弹）

- **录音**：`expo-audio` 在 `npx expo prebuild --clean` 后会自动往 AndroidManifest.xml 注入 `RECORD_AUDIO`、iOS Info.plist 注入 `NSMicrophoneUsageDescription`
- **拍照**：自动注入 `CAMERA`、iOS NSCameraUsageDescription
- **选媒体**：自动注入 `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO` (Android 13+)、`READ_EXTERNAL_STORAGE` (Android 12-) 及 NSPhotoLibraryUsageDescription (iOS)

如果预编译后系统仍不弹权限框，先执行 `npx expo prebuild --clean && npx expo run:android` 让插件重新注入原生配置。

## 快速上手

```tsx
import {
  XPopupProvider,   // 1. 根部挂弹层宿主（必需一次）
  XButton,
  XCalendarPopup,
  setXThemeMode,    // 2. 暗黑模式
  setXLocale,       // 3. 中英切换
} from 'react-native-x-components';

export default function App() {
  return (
    <XPopupProvider>
      <XButton type="primary" onPress={() => setXThemeMode('dark')}>
        切换暗黑
      </XButton>
    </XPopupProvider>
  );
}
```

## 组件总览

| 分类 | 组件 |
| --- | --- |
| 基础 | XButton XDivider XInput XImage XTag XProgress XRadio XCheckbox |
| 表单 | XForm XFormPro XCascadeSelect XMultiSelect XModalForm |
| 弹层 | XPullView XActionSheet XPicker XPickerDate XConfirmForm XTopView XAnimatedView |
| 全局 | XToast XLoadingModal XImagePreview |
| 交互 | XCarousel XTabs XDropdownMenu XElevator XNumberKeyboard XLicensePlate |
| 媒体 | XRecord XCalendar XCalendarPopup XSignature XSignatureSkia XUploadImage XUploadVideo |
| 数据 | XChart(XLineChart/XBarChart/XPieChart) |
| 基建 | useXTheme setXThemeMode useXLocale setXLocale XUploadProvider |

## 上传适配器（MinIO 预签名直传）

```tsx
import { setXUploadAdapter, createMinioPresignedAdapter } from 'react-native-x-components';

// App 入口注入一次（对接你的后端预签名接口）
setXUploadAdapter(
  createMinioPresignedAdapter({
    getUploadUrl: async ({ name, mimeType }) => {
      const res = await fetch(`${API}/file/getUploadUrl?fileName=${name}&contentType=${mimeType}`);
      const { data } = await res.json();
      return { objectKey: data.objectKey, preSignedUrl: data.preSignedUrl };
    },
    getPreviewUrl: async (objectKey) => {
      const res = await fetch(`${API}/file/getPreviewUrl?objectKey=${objectKey}`);
      const { data } = await res.json();
      return data.preSignedUrl;
    },
  }),
);
```

之后 `<XUploadImage />` / `<XUploadVideo />` / `uploadBase64()` 全部走该通道；换后端只换适配器。

## 主题定制

```ts
// 修改浅色/暗黑 token（如品牌色）
import { lightTokens, darkTokens } from 'react-native-x-components';
lightTokens.colorPrimary = '#7C3AED';
darkTokens.colorPrimary = '#A78BFA';
```

## License

MIT
