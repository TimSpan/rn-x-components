# rn-x-components 项目长期笔记

- 项目：React Native 组件库 demo（Expo ~57, RN 0.86, expo-router, Reanimated 4）。**npm 包已发布：react-native-x-components@0.1.0（2026-09-13）**，主页 https://www.npmjs.com/package/react-native-x-components ；构建脚本 scripts/build-lib.sh（tsconfig.lib.json，ESM+bundler 解析），发新版流程：改 npm/package.template.json 版本号 → build → npm publish .lib-build --otp=码。用户账号已开 2FA（Google Authenticator）。官方文档站：/Users/myx/Desktop/rn-x-components-docs（Next.js 16 SSG，上线前改 lib/docs-data.ts 的 SITE_URL）。
- 组件源码：src/x-components/，约定 Xxxx/index.tsx + index.ts 导出 + 头部注释说明 antd API 差异；颜色/圆角/字号一律取 theme.ts。
- 示例：src/examples/registry.tsx 注册（title/description/component），详情页 src/app/components/[name].tsx 按 meta 渲染。
- 弹层体系：XTopView（zustand 宿主仓库）+ XPullView（side: bottom/top/left/right/center，Reanimated 驱动）+ XPopupProvider 挂根。组件内弹层一律走这套，勿用 RN Modal。
- 主题：src/x-components/theme.ts 静态浅色 token（对标 antd v5，colorPrimary #2080F0）；App 级 src/constants/theme.ts 有 light/dark + useColorScheme。第一轮 27 个组件未做暗黑/i18n。
- 参考项目：
  - changhu（RN 0.81 裸项目）：Skia 逐字签名 src/components/SkiaSignature/index.tsx（PanResponder+中点二次贝塞尔+makeImageSnapshot 导出）；MinIO 上传=后端 presigned URL（GET /file/getUploadUrl 返回 {objectKey,preSignedUrl}）+ XHR PUT 直传，工具在 src/utils/upload.ts、src/utils/oss.ts。
  - duxui（/Users/myx/Documents/duxapp- project/projectName/src/duxui，Taro 多端）：TopView=每页宿主+事件总线；Menu=页内 Absolute+测量+下拉动画；Calendar=纯 View 网格自绘；NumberKeyboard=静态键盘；LicensePlate=按输入进度切三套键盘；Record=Taro getRecorderManager；Chart=Chart.js+Skia 适配；上传=formConfig 单例注入。
- Android 打包：./gradlew assembleRelease 可用；遗留 debug.keystore 签名 + applicationId com.anonymous.myapp 占位。
