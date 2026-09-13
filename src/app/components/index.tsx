import { router, Stack } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeControls, useXTheme } from "@/x-components";

interface CompItem {
  name: string;
  label: string;
  desc: string;
}

interface CompGroup {
  title: string;
  items: CompItem[];
}

const GROUPS: CompGroup[] = [
  {
    title: "基础组件",
    items: [
      {
        name: "XButton",
        label: "XButton 按钮",
        desc: "type/danger/size/block/loading/icon/shape",
      },
      {
        name: "XDivider",
        label: "XDivider 分割线",
        desc: "horizontal/vertical、dashed、带标题",
      },
      {
        name: "XInput",
        label: "XInput 输入框",
        desc: "value/onChangeText/multiline/disabled/allowClear",
      },
      {
        name: "XTag",
        label: "XTag 标签",
        desc: "color预设/自定义、variant、closable、onPress",
      },
      {
        name: "XProgress",
        label: "XProgress 进度条",
        desc: "line/circle/dashboard、渐变strokeColor",
      },
      {
        name: "XImage",
        label: "XImage 图片",
        desc: "带加载态、长按删除、点击回调",
      },
    ],
  },
  {
    title: "表单组件",
    items: [
      {
        name: "XRadio",
        label: "XRadio 单选框",
        desc: "Radio/Group/Button、optionType=button",
      },
      {
        name: "XCheckbox",
        label: "XCheckbox 多选框",
        desc: "Checkbox/Group、indeterminate半选",
      },
      {
        name: "XForm",
        label: "XForm 表单",
        desc: "Form/Item/useForm、规则校验、联动",
      },
      {
        name: "XFormPro",
        label: "XFormPro 低代码表单",
        desc: "配置式表单，X控件映射",
      },
      {
        name: "XCascadeSelect",
        label: "XCascadeSelect 级联选择",
        desc: "多列滚轮联动、路径数组值",
      },
      {
        name: "XMultiSelect",
        label: "XMultiSelect 多选选择器",
        desc: "XPullView+XCheckbox+XButton",
      },
    ],
  },
  {
    title: "弹窗族",
    items: [
      {
        name: "XPullView",
        label: "XPullView 弹出层",
        desc: "TopView挂载+入场/离场动画（核心）",
      },
      {
        name: "XActionSheet",
        label: "XActionSheet 底部菜单",
        desc: "命令式底部弹出菜单",
      },
      { name: "XPicker", label: "XPicker 滚轮选择器", desc: "单列滚轮选择" },
      {
        name: "XPickerDate",
        label: "XPickerDate 日期选择",
        desc: "日期时间滚轮，format定列",
      },
      {
        name: "XModalForm",
        label: "XModalForm 居中弹层",
        desc: "居中弹层：确认/表单",
      },
      {
        name: "XConfirmForm",
        label: "XConfirmForm 确认框",
        desc: "命令式封装：show()→Promise",
      },
      {
        name: "XAnimatedView",
        label: "XAnimatedView 动画引擎",
        desc: "anim()链式构建器",
      },
    ],
  },
  {
    title: "全局命令式组件",
    items: [
      {
        name: "XToast",
        label: "XToast 轻提示",
        desc: "success/error/info/warning/loading",
      },
      {
        name: "XLoadingModal",
        label: "XLoadingModal 全局加载",
        desc: "引用计数，支持并发",
      },
      {
        name: "XImagePreview",
        label: "XImagePreview 图片预览",
        desc: "全屏缩放/翻页手势",
      },
    ],
  },
  {
    title: "复合组件",
    items: [
      {
        name: "XAnimatedSearchPanel",
        label: "XAnimatedSearchPanel 搜索面板",
        desc: "列表头可折叠搜索面板",
      },
    ],
  },
  {
    title: "主题与国际化",
    items: [
      {
        name: "XThemeConfig",
        label: "XTheme 主题与国际化",
        desc: "暗黑模式、中英切换（全局生效）",
      },
    ],
  },
  {
    title: "交互组件",
    items: [
      { name: "XCarousel", label: "XCarousel 轮播图", desc: "自动播放/无限循环/指示点" },
      { name: "XTabs", label: "XTabs 选项卡", desc: "line/button、滑动联动、懒加载" },
      { name: "XDropdownMenu", label: "XDropdownMenu 下拉菜单", desc: "基于 XTopView 宿主" },
      { name: "XNumberKeyboard", label: "XNumberKeyboard 数字键盘", desc: "弹出模式为主，乱序/小数点" },
      { name: "XLicensePlate", label: "XLicensePlate 车牌输入", desc: "三段键盘，新能源末位 D/F" },
    ],
  },
  {
    title: "选择与媒体",
    items: [
      { name: "XCalendar", label: "XCalendar 日历", desc: "单选/周选/范围/多选" },
      { name: "XCalendarPopup", label: "XCalendarPopup 弹窗日历", desc: "底部弹出，取消/确定工具栏" },
      { name: "XRecord", label: "XRecord 录音", desc: "expo-audio，试听/重录/使用" },
      { name: "XChart", label: "XChart 图表", desc: "SVG 自研：折线/柱状/环形" },
      { name: "XSignature", label: "XSignature 普通签名", desc: "连笔签名，导出 base64" },
      { name: "XSignatureSkia", label: "XSignatureSkia 逐字签名", desc: "Skia 高性能逐字签名" },
      { name: "XUploadImage", label: "XUploadImage 图片上传", desc: "适配器：Mock/MinIO 预签名" },
      { name: "XUploadVideo", label: "XUploadVideo 视频上传", desc: "单个视频，适配器驱动" },
    ],
  },
];

export default function ComponentsList() {
  const insets = useSafeAreaInsets();
  const t = useXTheme();

  return (
    <>
      <Stack.Screen
        options={{
          title: "组件",
          headerRight: () => (
            <View style={{marginRight: 8}}>
              <ThemeControls compact />
            </View>
          ),
        }}
      />
      <ScrollView
        style={[styles.container, {backgroundColor: t.colorBgLayout}]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={[styles.groupTitle, {color: t.colorTextTertiary}]}>{group.title}</Text>
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.name}
                style={[styles.item, {backgroundColor: t.colorBgContainer, borderBottomColor: t.colorSplit}]}
                activeOpacity={0.6}
                onPress={() => router.push(`/components/${item.name}`)}
              >
                <View style={styles.itemContent}>
                  <Text style={[styles.itemLabel, {color: t.colorText}]}>{item.label}</Text>
                  <Text style={[styles.itemDesc, {color: t.colorTextTertiary}]}>{item.desc}</Text>
                </View>
                <Text style={[styles.arrow, {color: t.colorTextQuaternary}]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  group: {
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: "600",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemContent: {
    flex: 1,
  },
  itemLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  itemDesc: {
    fontSize: 12,
    marginTop: 3,
  },
  arrow: {
    fontSize: 22,
    marginLeft: 8,
  },
});
