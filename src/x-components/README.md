# X-Components

X 打头的自研组件库，API 对标 antd（React），实现为纯 React Native（不依赖 `@ant-design/react-native`）。主色沿用项目主色 `#2080F0`，设计 token 统一在 [theme.ts](./theme.ts)。

## 组件清单

| 组件 | 对标 | 状态 |
| --- | --- | --- |
| XButton | antd Button | 可用（type/danger/size/block/loading/icon/shape） |
| XDivider | antd Divider | 可用（horizontal/vertical、dashed、带标题、orientation） |
| XRadio | antd Radio | 可用（Radio / Radio.Group / Radio.Button、optionType=button） |
| XCheckbox | antd Checkbox | 可用（Checkbox / Checkbox.Group、indeterminate 半选） |
| XProgress | antd Progress | 可用（line / circle / dashboard、渐变 strokeColor、success 分段） |
| XTag | antd Tag | 可用（color 预设/自定义、variant light/solid/outline、closable、icon、onPress；兼容老 Tag 的 text/size/type） |
| XInput | antd Input | 可用（value/onChangeText 原生透传、multiline=TextArea、disabled、allowClear、focus 高亮） |
| XCascadeSelect | antd Cascader | 可用（路径数组值、多列滚轮联动、XPullView 弹层） |
| XMultiSelect | — | 可用（老 MultiSelect 重制：XPullView + XCheckbox + XButton） |
| XFormPro | 老 FormPro | 可用（低代码表单：X 控件映射 + hiddenValues 编辑传参） |
| XForm | antd Form | 可用（Form / Form.Item / useForm、规则校验、validateTrigger、dependencies、noStyle、函数式 children） |
| XAnimatedSearchPanel | — | 可用（列表头可折叠搜索面板：单 progress 驱动高度/淡入/箭头旋转/文案交叉淡入） |

## 快速上手

```tsx
import {XButton, XForm, XRadio, XCheckbox} from '@/components/X-Components';

const [form] = XForm.useForm();

<XForm form={form} onFinish={values => submit(values)}>
  <XForm.Item label='姓名' name='name' rules={[{required: true, message: '请输入姓名'}]}>
    <TextInput />
  </XForm.Item>
  <XForm.Item label='性别' name='sex'>
    <XRadio.Group options={[{label: '男', value: 1}, {label: '女', value: 0}]} />
  </XForm.Item>
  <XForm.Item label='爱好' name='hobbies'>
    <XCheckbox.Group options={HOBBY_OPTIONS} />
  </XForm.Item>
  <XButton type='primary' block onPress={() => form.submit()}>
    提交
  </XButton>
</XForm>
```

## XForm 与 antd 的主要差异

- `Form.List` / `Form.Provider` 未实现（动态列表字段后续有需要再加）
- `rules` 实现了 async-validator 常用子集：`required / type(string|number|boolean|array|email|url) / min / max / len / pattern / enum / whitespace / validator / transform`
- `type: 'number'` 放宽：数字字符串（如 `'12'`）也按数字参与 min/max/len 校验（RN TextInput 只产字符串）
- 默认校验文案为中文，`message` 可覆盖
- store 变化会通知所有 Form.Item 重渲染（antd 是精确调度；常规表单规模下没有性能问题）

## 约定

- 新组件统一放本目录下：`X-Components/Xxxx/index.tsx`，并在 [index.ts](./index.ts) 补导出
- 颜色 / 圆角 / 字号一律从 `theme.ts` 取，不要在组件里硬编码新色值
- 组件头部注释块说明：支持的 antd API、与 antd 的差异（RN 限制或有意取舍）
- 使用示例看 `src/screens/pages/xComponentsTest.tsx`（路由：XComponentsTest）
- XProviders（XLoadingModal / XImagePreview / XToast）三件套示例看 `src/screens/pages/xProvidersTest.tsx`（路由：XProvidersTest）；这三个 Provider 已在 App 根部全局挂载，任意位置直接调 Service 即可
