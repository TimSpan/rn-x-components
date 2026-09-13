/**
 * ============================================================================
 * XElevator —— 电梯楼层/字母导航列表（duxui Elevator 同架构重写）
 * ============================================================================
 *
 * 【架构对齐 duxui】（v2 重构：放弃 SectionList）
 * duxui 的实现 = ScrollView + 每组 onLayout 记录位置 + scrollTo(y) +
 * 导航条 responder 触摸定位。第一版用 SectionList 的 scrollToLocation 实现，
 * 实测两大问题：未测量完成时定位失败（onScrollToIndexFailed 兜底跳顶）、
 * 与外层 ScrollView 嵌套必报 VirtualizedList 告警。
 * 现在完全回归 duxui 思路：
 *   1. 普通 ScrollView（无虚拟化，无嵌套告警，任意容器可用）；
 *   2. 每个分组 onLayout 记录 contentY → scrollToSection 精确 scrollTo；
 *   3. onScroll 实时反推当前分组 → 导航条高亮；
 *   4. 右侧导航条用"捕获式 responder"（onStartShouldSetResponderCapture），
 *      手指按下/滑动都能连续命中字母（Pressable 会被子元素抢焦点，弃用）。
 * ============================================================================
 */

import React, {useCallback, useRef, useState} from 'react';
import {Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import {useXTheme} from '@/x-components/theme';

export interface XElevatorSection<T = {name: string}> {
  /** 分组标题（吸顶显示） */
  title: string;
  /** 右侧导航条短标签，默认取 title 首字符 */
  navLabel?: string;
  /** 数据 */
  data: T[];
}

export interface XElevatorProps<T> {
  sections: XElevatorSection<T>[];
  /** 自定义行渲染，默认显示 item.name */
  renderItem?: (item: T, section: XElevatorSection<T>, index: number) => React.ReactNode;
  keyExtractor?: (item: T, index: number) => string;
  onItemClick?: (item: T, section: XElevatorSection<T>) => void;
  /** 是否显示右侧导航条，默认 true */
  showNav?: boolean;
  /** 列表顶部（搜索框等） */
  renderTop?: () => React.ReactNode;
  /** 列表底部 */
  renderFooter?: () => React.ReactNode;
  /** 空态 */
  renderEmpty?: () => React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function XElevator<T = {name: string}>({
  sections,
  renderItem,
  keyExtractor,
  onItemClick,
  showNav = true,
  renderTop,
  renderFooter,
  renderEmpty,
  style,
}: XElevatorProps<T>) {
  const t = useXTheme();
  const scrollRef = useRef<ScrollView>(null);
  /** 每个分组在 content 中的 y（onLayout 记录） */
  const sectionYsRef = useRef<number[]>([]);
  /** 当前滚动位置（算高亮用） */
  const scrollYRef = useRef(0);
  /** 当前高亮的分组下标 */
  const [activeIndex, setActiveIndex] = useState(0);

  /** 滚动定位到分组（duxui：scrollTo 累加高度） */
  const scrollToSection = useCallback((index: number) => {
    const y = sectionYsRef.current[index];
    if (y === undefined) return;
    scrollRef.current?.scrollTo({y: Math.max(y - 0.5, 0), animated: true});
  }, []);

  /** 点击字母 → 跳转分组（Pressable 回调，100% 可靠） */
  const handleNavTap = useCallback(
    (index: number) => {
      setActiveIndex(index);
      scrollToSection(index);
    },
    [scrollToSection],
  );

  /**
   * 导航条触摸定位：locationY 落在哪个字母区间 → 定位。
   * 用捕获式 responder：按下即抢占（onStartShouldSetResponderCapture），
   * 滑动连续命中（onMoveShouldSetResponderCapture），子元素不参与抢焦点。
   */
  const navYRef = useRef<number[]>([]);
  const handleNavTouch = useCallback(
    (e: {nativeEvent: {locationY: number}}) => {
      const y = e.nativeEvent.locationY;
      const ys = navYRef.current;
      let hit = 0;
      for (let i = ys.length - 1; i >= 0; i--) {
        if (ys[i] !== undefined && y >= ys[i] - 9) {
          hit = i;
          break;
        }
      }
      setActiveIndex(prev => (prev === hit ? prev : hit));
      scrollToSection(hit);
    },
    [scrollToSection],
  );

  /** 滚动 → 反推当前分组（最后一个 y <= scrollY + 60 的分组） */
  const handleScroll = useCallback(
    (e: {nativeEvent: {contentOffset: {y: number}}}) => {
      const y = e.nativeEvent.contentOffset.y;
      scrollYRef.current = y;
      const ys = sectionYsRef.current;
      let index = 0;
      for (let i = 0; i < ys.length; i++) {
        if (ys[i] !== undefined && y + 60 >= ys[i]) index = i;
      }
      setActiveIndex(prev => (prev === index ? prev : index));
    },
    [],
  );

  /** 默认行渲染 */
  const defaultRenderItem = (item: T) => (
    <Text style={[styles.itemText, {color: t.colorText}]} allowFontScaling={false}>
      {(item as {name?: string}).name}
    </Text>
  );

  const hasData = sections.some(s => s.data.length > 0);

  return (
    <View style={[styles.container, style]}>
      <ScrollView
        ref={scrollRef}
        style={styles.list}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {renderTop?.()}
        {sections.map((section, si) => (
          <View
            key={section.title + si}
            onLayout={e => {
              // 记录分组在 content 中的绝对 y（相对 ScrollView 内容）
              sectionYsRef.current[si] = e.nativeEvent.layout.y;
            }}
          >
            {/* 分组标题 */}
            <View style={[styles.sectionHeader, {backgroundColor: t.colorBgLayout}]}>
              <Text style={[styles.sectionTitle, {color: t.colorTextSecondary}]} allowFontScaling={false}>
                {section.title}
              </Text>
            </View>
            {/* 组内条目 */}
            {section.data.length === 0 ? null : section.data.map((item, ii) => {
              const key = keyExtractor ? keyExtractor(item, ii) : String(ii);
              const Row = renderItem ?? defaultRenderItem;
              return (
                <View
                  key={key}
                  style={[styles.item, {borderBottomColor: t.colorSplit}]}
                  onTouchEnd={() => onItemClick?.(item, section)}
                >
                  {Row(item, section, ii)}
                </View>
              );
            })}
          </View>
        ))}
        {!hasData && (renderEmpty ? renderEmpty() : <Text style={[styles.empty, {color: t.colorTextTertiary}]}>暂无数据</Text>)}
        {renderFooter?.()}
      </ScrollView>

      {/* 右侧导航条：字母 Pressable 负责"点击跳转"（100% 可靠），
          容器 onMoveShouldSetResponderCapture 负责"按住拖动连续定位"
          （拖动开始时从 Pressable 手里抢回 responder） */}
      {showNav && hasData && (
        <View
          style={[styles.nav, {backgroundColor: t.colorBgContainerDisabled}]}
          onMoveShouldSetResponderCapture={() => true}
          onResponderMove={handleNavTouch}
          onResponderGrant={handleNavTouch}
        >
          {sections.map((section, i) => (
            <Pressable
              key={section.title + i}
              onPress={() => handleNavTap(i)}
              onPressIn={() => handleNavTap(i)}
              onLayout={e => {
                navYRef.current[i] = e.nativeEvent.layout.y + e.nativeEvent.layout.height / 2;
              }}
              style={[styles.navItem, activeIndex === i && {backgroundColor: t.colorPrimary}]}
            >
              <Text
                style={[
                  styles.navText,
                  {color: t.colorTextSecondary},
                  activeIndex === i && {color: t.colorTextLightSolid},
                ]}
                allowFontScaling={false}
              >
                {section.navLabel ?? section.title.slice(0, 1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  list: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sectionTitle: {
    fontSize: 13,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemText: {
    fontSize: 15,
  },
  empty: {
    textAlign: 'center',
    paddingVertical: 40,
    fontSize: 14,
  },
  nav: {
    position: 'absolute',
    right: 4,
    top: '20%',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 6,
    alignItems: 'center',
  },
  navItem: {
    paddingVertical: 2,
    paddingHorizontal: 3,
    borderRadius: 9,
    minHeight: 18,
    justifyContent: 'center',
  },
  navText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});

export default XElevator;