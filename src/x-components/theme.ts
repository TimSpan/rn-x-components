/**
 * ============================================================================
 * X-Components 共享设计 token（对标 antd v5 design token，取值做 RN 适配）
 * ============================================================================
 *
 * 后续所有 X 打头组件统一从这里取色/取圆角，避免各组件散落硬编码色值；
 * 想整体换肤时只改这一个文件。
 *
 * 色值来源约定：
 * - 主色沿用项目既有主色 #2080F0（原 DuxPopup 弹窗族、现 X 弹窗族同款），而不是 antd 默认 #1677ff，
 *   保证 X 系列组件和项目里已有页面视觉一致；
 * - 其余语义色（成功/警告/错误/边框/文字灰阶）按 antd v5 默认 token 取值。
 */
export const xTheme = {
  /** 品牌色（项目主色） */
  colorPrimary: '#2080F0',
  /** 主色按压反馈用的浅主色（对标 antd colorPrimaryActive/BorderHover 一档） */
  colorPrimaryActive: '#0E6FD8',
  /** 主色弱背景（对标 antd colorPrimaryBg） */
  colorPrimaryBg: '#E6F1FE',

  colorSuccess: '#52C41A',
  colorSuccessBg: '#F6FFED',

  colorWarning: '#FAAD14',
  colorWarningBg: '#FFFBE6',

  colorError: '#FF4D4F',
  colorErrorBg: '#FFF2F0',

  /** 主文字（对标 antd colorText：rgba(0,0,0,0.88)） */
  colorText: 'rgba(0, 0, 0, 0.88)',
  /** 次要文字（对标 antd colorTextSecondary） */
  colorTextSecondary: 'rgba(0, 0, 0, 0.65)',
  colorTextTertiary: 'rgba(0, 0, 0, 0.45)',
  colorTextQuaternary: 'rgba(0, 0, 0, 0.25)',
  /** 实底主色上的文字 / 图标色（对标 antd colorTextLightSolid：primary 按钮、选中态文字用） */
  colorTextLightSolid: '#FFFFFF',

  /** 描边色（对标 antd colorBorder） */
  colorBorder: '#D9D9D9',
  /** 弱分割线（对标 antd colorSplit） */
  colorSplit: '#F0F0F0',
  /** 进度条轨道底色（比 colorSplit 深一档，白底卡片上肉眼可见） */
  colorProgressTrack: '#E5E7EB',
  colorBgContainer: '#FFFFFF',
  colorBgLayout: '#F5F5F5',
  /** 禁用态容器底色（对标 antd colorBgContainerDisabled） */
  colorBgContainerDisabled: 'rgba(0, 0, 0, 0.04)',
  /** 禁用态主色（浅一档的主色，用于主按钮禁用底色） */
  colorPrimaryDisabled: '#91C9FF',

  /** 小圆角：输入框 / 小按钮 / 标签（对标 antd borderRadiusSM） */
  borderRadiusSM: 4,
  borderRadius: 6,
  borderRadiusLG: 8,
  /** 卡片 / 大面板圆角（项目扩展：antd 只有 2/4/6/8 四档，此档对齐项目既有卡片视觉） */
  borderRadiusXL: 12,

  /** 文本字号（对标 antd v5 默认 fontSize 14） */
  fontSize: 14,
  fontSizeSM: 12,
  fontSizeLG: 16,

  controlHeight: 36,
  controlHeightSM: 30,
  controlHeightLG: 44,

  /** 动效时长（对标 antd motionDurationMid） */
  motionDurationMid: 200,
} as const;

export type XTheme = typeof xTheme;
