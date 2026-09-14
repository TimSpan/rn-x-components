# AGENTS.md — AI 编码工具使用指南

> 本文件供 AI 编码工具（Cursor / Copilot / Claude Code / WorkBuddy 等）在使用
> react-native-x-components 时参考。人也可以读，但写法面向 AI。

## 0. 安装与前置依赖

```bash
npm install react-native-x-components dayjs zustand
# 必需 peer（Expo 项目）：
npx expo install react-native-reanimated react-native-safe-area-context react-native-svg react-native-gesture-handler
# 可选 peer（用到哪个装哪个）：
#   @shopify/react-native-skia   → XSignatureSkia
#   expo-audio                   → XRecord
#   expo-image-picker + expo-image-manipulator + expo-file-system → XUpload*
#   expo-video                   → XVideoPreview
#   react-native-zoom-toolkit    → XImagePreview 缩放
```

原生依赖安装后需要 `npx expo prebuild --clean`（裸项目则重新构建原生包），
否则录音/拍照权限弹窗、Skia、视频编解码不会生效。

## 1. 必须的 App 根部接线（漏掉 = 命令式 API 静默失效）

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { XPopupProvider } from 'react-native-x-components';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <XPopupProvider>
        {/* 整个 App */}
      </XPopupProvider>
    </GestureHandlerRootView>
  );
}
```

XPopupProvider 内部挂载：XTopView（弹层宿主）、XConfirmForm、XActionSheet 全局实例、
XToast / XLoadingModal / XImagePreview 的 Provider。以下命令式 API 全部依赖它：

- `XToastService.show({ message, type, position })`
- `confirm({ title, content, danger })` → `Promise<boolean>`
- `showXActionSheet({ title, options })` → `Promise<value | null>`
- `XLoadingModalService.show({ message }) / hide()`
- `XImagePreviewService.show({ images, initialIndex })`

## 2. 常见错误对照表

| 症状 | 原因 | 修复 |
|---|---|---|
| Toast / confirm / ActionSheet 无反应 | XPopupProvider 未挂根 | App 根部包 `<XPopupProvider>` |
| 上传报 adapter 错误 | 未注入上传适配器 | `setXUploadAdapter(createMinioPresignedAdapter({...}))` |
| 手势 / 滚轮不响应 | 缺 gesture-handler | install + GestureHandlerRootView 包根 |
| Skia 签名报错 | 未装 skia | `npx expo install @shopify/react-native-skia` |
| 录音/拍照无权限弹窗 | prebuild 未重跑 | `npx expo prebuild --clean` |
| 暗黑切换全局不生效 | mode 被手动写死 | `setXThemeMode('system')` 恢复跟随 |
| 主题色不生效 | 组件硬编码颜色 | 颜色一律取 `useXTheme()` token |

## 3. 最小代码骨架

### 上传（MinIO 预签名直传）

```tsx
import { setXUploadAdapter, createMinioPresignedAdapter, XUploadImage } from 'react-native-x-components';

setXUploadAdapter(createMinioPresignedAdapter({
  getUploadUrl: async ({ name }) => {
    const res = await fetch(API + '/file/getUploadUrl?fileName=' + name);
    const { data } = await res.json();
    return { objectKey: data.objectKey, preSignedUrl: data.preSignedUrl };
  },
  getPreviewUrl: async objectKey => fetchPreviewUrl(objectKey),
}));

<XUploadImage value={imgs} onChange={setImgs} max={9} />
```

### 表单

```tsx
import { XForm, XInput, XButton } from 'react-native-x-components';

const [form] = XForm.useForm();
<XForm form={form} onFinish={console.log}>
  <XForm.Item label="姓名" name="name" trigger="onChangeText"
    rules={[{ required: true, message: '必填' }]}>
    <XInput placeholder="请输入姓名" />
  </XForm.Item>
  <XButton type="primary" onPress={() => form.submit()}>提交</XButton>
</XForm>
```

注意：输入类控件 `trigger="onChangeText"`，选择类 `trigger="onChange"`（默认），写错则值不同步。

### 主题 / 语言

```tsx
import { useXTheme, setXThemeMode, setXBrandByName, setXLocale } from 'react-native-x-components';

setXThemeMode('dark');        // 'light' | 'dark' | 'system'(默认跟随系统)
setXBrandByName('薰衣紫');     // 4 套预设品牌色，深浅色各自适配
setXLocale('en-US');          // 组件文案即时切换

const t = useXTheme();        // 组件内取 token，禁硬编码颜色
```

## 4. 设计约定（生成代码前遵守）

1. **弹层一律用本库体系**：XPullView（side: bottom/top/left/right/center）+ 全局 XTopView 宿主；**不要用 RN Modal**。
2. **命令式服务统一 `XxxService.show()` 风格**，不再自己 setState 管 visible（除非用受控形态组件）。
3. **颜色/圆角一律 `useXTheme()`**：浅深两套 token 自动切换，硬编码颜色是 bug。
4. **XRadio / XCheckbox 的 onChange 事件对象与 antd 同构**：`e.target.value / e.target.checked`。
5. XForm.Item 的 trigger：输入类 `onChangeText`，其余 `onChange`。
6. 上传适配器协议：`upload(file, onProgress) => Promise<XUploadResult>`；`XUploadResult` 至少含 `url`（或 `objectKey`）。
7. XSignatureSkia 需要 Skia；XRecord 需要 expo-audio；这些可选 peer 没装时不要 import 对应组件。

## 5. 组件速查（36 个）

基础：XButton · XDivider · XInput(customKeyboard 数字键盘) · XTag · XProgress · XRadio · XCheckbox
表单：XForm · XFormPro · XCascadeSelect · XMultiSelect
弹层：XPullView · XActionSheet · XPicker · XPickerDate · XModalForm · XConfirmForm · XAnimatedView · XToast · XLoadingModal
交互：XTabs · XDropdownMenu · XAnimatedSearchPanel · XNumberKeyboard · XLicensePlate
媒体：XCalendar · XCalendarPopup · XRecord · XSignature · XSignatureSkia · XUploadImage · XUploadVideo · XVideoPreview · XImage · XImagePreview
数据：XChart

完整用法与 props 表：https://react-native-x-components.dev（AI 可抓取 /llms-full.txt 获取全量文档）。
