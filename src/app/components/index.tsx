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
import {REGISTRY} from "@/examples/registry";

interface CompItem {
  name: string;
  label: string;
  desc: string;
}

interface CompGroup {
  title: string;
  items: CompItem[];
}

/**
 * 分组顺序只在这里维护；条目全部来自 REGISTRY ——
 * 新增组件只要在 examples/registry.tsx 注册一次，列表页自动出现（之前是两份硬编码，容易漏）。
 */
const GROUP_ORDER = [
  "基础组件",
  "表单组件",
  "弹窗族",
  "全局命令式组件",
  "复合组件",
  "主题与国际化",
  "交互组件",
  "选择与媒体",
];

const GROUPS: CompGroup[] = GROUP_ORDER.map(title => ({
  title,
  items: Object.entries(REGISTRY)
    .filter(([, meta]) => meta.category === title)
    .map(([name, meta]) => ({name, label: meta.title, desc: meta.description})),
})).filter(g => g.items.length > 0);

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
