# X-Components

<div align="center">

<img src="assets/icons/x-icon-1024.png" width="88" alt="X-Components logo" />

**Ant Design 风格的 React Native (Expo) 组件库**

[![npm version](https://img.shields.io/npm/v/react-native-x-components.svg)](https://www.npmjs.com/package/react-native-x-components)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-TimSpan%2Frn--x--components-181717?logo=github)](https://github.com/TimSpan/rn-x-components)

[📦 npm 包](https://www.npmjs.com/package/react-native-x-components) ·
[📖 组件文档](https://react-native-x-components.dev) ·
[🐙 GitHub](https://github.com/TimSpan/rn-x-components)

</div>

本仓库是组件库的**开发与示例工程**（Expo App，含全部 36 个组件的演示页）。
组件库 npm 包源码位于 [`npm/`](./npm)，构建脚本 `scripts/build-lib.sh`。

## 快速体验

```bash
npm install
npx expo start          # 或 npx expo run:android 构建原生 dev client
```

## 目录结构

| 路径 | 说明 |
|---|---|
| `src/x-components/` | 组件库源码（发布到 npm 的就是这里的产物） |
| `src/examples/` | 全部组件的演示页（registry 注册） |
| `src/app/` | Expo Router 页面（介绍 / 组件 / 关于） |
| `npm/` | npm 包模板（package.json / README / AGENTS.md） |
| `scripts/build-lib.sh` | 一键构建 npm 包到 `.lib-build/` |

## 文档

- 组件文档站：https://react-native-x-components.dev
- AI 工具：抓取 `https://react-native-x-components.dev/llms-full.txt` 获取全量文档；npm 包内含 `AGENTS.md`

## 交流

问题反馈 / 技术交流 / 定制咨询，微信添加（备注来意）：

<p align="center">
  <img src="npm/wechat-qrcode.png" alt="微信添加 Otis 为好友" width="240" />
</p>
