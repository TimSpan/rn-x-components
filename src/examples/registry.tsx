import React from 'react';
import { Text, View, StyleSheet } from 'react-native';

import { XButtonDemo, XDividerDemo, XInputDemo, XTagDemo, XProgressDemo, XImageDemo } from './basic';
import {
  XRadioDemo,
  XCheckboxDemo,
  XFormDemo,
  XFormProDemo,
  XCascadeSelectDemo,
  XMultiSelectDemo,
} from './forms';
import {
  XPullViewDemo,
  XActionSheetDemo,
  XPickerDemo,
  XPickerDateDemo,
  XModalFormDemo,
  XConfirmFormDemo,
  XAnimatedViewDemo,
} from './popups';
import { XToastDemo, XLoadingModalDemo, XImagePreviewDemo, XAnimatedSearchPanelDemo } from './providers';

export interface CompMeta {
  title: string;
  description: string;
  component: React.ComponentType;
}

export const REGISTRY: Record<string, CompMeta> = {
  // 基础组件
  XButton: { title: 'XButton 按钮', description: '对标 antd Button，支持 type/danger/size/block/loading/shape', component: XButtonDemo },
  XDivider: { title: 'XDivider 分割线', description: '对标 antd Divider，支持 horizontal/vertical、dashed、带标题', component: XDividerDemo },
  XInput: { title: 'XInput 输入框', description: '对标 antd Input，支持 value/onChangeText/multiline/disabled/allowClear', component: XInputDemo },
  XTag: { title: 'XTag 标签', description: '对标 antd Tag，支持 color预设/自定义、variant、closable、onPress', component: XTagDemo },
  XProgress: { title: 'XProgress 进度条', description: '对标 antd Progress，支持 line/circle/dashboard、渐变strokeColor', component: XProgressDemo },
  XImage: { title: 'XImage 图片', description: '带加载态、长按删除、点击回调的图片组件', component: XImageDemo },

  // 表单组件
  XRadio: { title: 'XRadio 单选框', description: '对标 antd Radio，支持 Radio/Group/Button、optionType=button', component: XRadioDemo },
  XCheckbox: { title: 'XCheckbox 多选框', description: '对标 antd Checkbox，支持 Checkbox/Group、indeterminate半选', component: XCheckboxDemo },
  XForm: { title: 'XForm 表单', description: '对标 antd Form，支持 Form/Item/useForm、规则校验、联动', component: XFormDemo },
  XFormPro: { title: 'XFormPro 低代码表单', description: '配置式表单，X控件映射 + hiddenValues 编辑传参', component: XFormProDemo },
  XCascadeSelect: { title: 'XCascadeSelect 级联选择', description: 'antd Cascader RN 版，多列滚轮联动', component: XCascadeSelectDemo },
  XMultiSelect: { title: 'XMultiSelect 多选选择器', description: 'XPullView + XCheckbox + XButton 组合', component: XMultiSelectDemo },

  // 弹窗族
  XPullView: { title: 'XPullView 弹出层', description: '基于 TopView，比 RN Modal 更快的弹出层（核心）', component: XPullViewDemo },
  XActionSheet: { title: 'XActionSheet 底部菜单', description: '底部弹出菜单，danger 选项红色', component: XActionSheetDemo },
  XPicker: { title: 'XPicker 滚轮选择器', description: '单列滚轮选择，XWheel 驱动', component: XPickerDemo },
  XPickerDate: { title: 'XPickerDate 日期选择', description: '日期时间滚轮，format 定列', component: XPickerDateDemo },
  XModalForm: { title: 'XModalForm 居中弹层', description: '居中弹层，确认/表单，校验不通过不关', component: XModalFormDemo },
  XConfirmForm: { title: 'XConfirmForm 确认框', description: '命令式封装：confirm() → Promise<boolean>', component: XConfirmFormDemo },
  XAnimatedView: { title: 'XAnimatedView 动画引擎', description: 'anim() 链式构建器，UI 线程驱动', component: XAnimatedViewDemo },

  // 全局命令式
  XToast: { title: 'XToast 轻提示', description: 'success/error/info/warning/loading，三位置', component: XToastDemo },
  XLoadingModal: { title: 'XLoadingModal 全局加载', description: '引用计数，支持并发 show/hide', component: XLoadingModalDemo },
  XImagePreview: { title: 'XImagePreview 图片预览', description: '全屏缩放/翻页手势，微信相册同款', component: XImagePreviewDemo },

  // 复合组件
  XAnimatedSearchPanel: { title: 'XAnimatedSearchPanel 搜索面板', description: '列表头可折叠搜索面板，单 progress 驱动', component: XAnimatedSearchPanelDemo },
};

export function getComponentMeta(name: string): CompMeta | undefined {
  return REGISTRY[name];
}

export function Not_found({ name }: { name: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>未找到组件「{name}」的示例</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F8' },
  text: { fontSize: 16, color: 'rgba(0,0,0,0.45)' },
});
