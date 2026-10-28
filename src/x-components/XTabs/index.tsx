/**
 * ============================================================================
 * XTabs —— 选项卡（duxui Tab 的 RN 原生重写版）
 * ============================================================================
 *
 * 【与 duxui Tab 的关系】
 * 保留 duxui 的核心 API：type('line'|'button') / swiper（内容滑动联动）/
 * lazyload / scroll / justify / TabPane 子组件声明式用法。
 * 差异：duxui 的下划线与内容联动跑在 Taro Animated（CSS）上，
 * 这里用 Reanimated shared value（UI 线程）+ 原生 ScrollView。
 *
 * 【用法】
 *   <XTabs onChange={...}>
 *     <XTabPane title="标签一" key="a">内容一</XTabPane>
 *     <XTabPane title="标签二" key="b" badge={3}>内容二</XTabPane>
 *   </XTabs>
 *
 * 【实现要点】
 * 1. tab 头：项数 > 4 默认横向滚动（scroll 可显式覆盖），每项 onLayout
 *    记录 x/width，下划线用 withTiming 平移 + 变宽（线型）；
 * 2. 内容区：swiper 模式 = ScrollView pagingEnabled，滑动结束反向同步
 *    激活项；非 swiper = 只挂载当前激活页（天然懒加载）；
 * 3. lazyload 仅对 swiper 模式有意义：激活过才渲染内容，渲染后保持挂载
 *    （保留滚动位置），未访问的页渲染占位。
 * ============================================================================
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useXTheme} from '../theme';

/** 单个选项卡 */
export interface XTabPaneProps {
  /** 标签文字（或任意节点） */
  title?: React.ReactNode;
  /** 徽标：数字/文字/true(红点) */
  badge?: string | number | boolean;
  /** 是否禁用 */
  disabled?: boolean;
  children?: React.ReactNode;
}

/** XTabPane 是声明式占位组件：内容由 XTabs 通过 element.props 提取，自身不渲染 */
export function XTabPane(_: XTabPaneProps) {
  return null;
}

export interface XTabsProps {
  /** 受控激活 key */
  value?: string;
  /** 非受控初始 key（默认第一个 TabPane 的 key） */
  defaultValue?: string;
  /** 激活变化回调 */
  onChange?: (key: string, index: number) => void;
  /** line=下划线 / button=分段按钮，默认 line */
  type?: 'line' | 'button';
  /** 内容区是否可滑动（ScrollView 分页联动），默认 false */
  swiper?: boolean;
  /** tab 头是否可横向滚动，默认：项数 > 4 时可滚动 */
  scroll?: boolean;
  /** swiper 模式下：激活过才渲染内容（保留已渲染），默认 true */
  lazyload?: boolean;
  /**
   * 非 swiper 模式下：是否保活所有页，默认 false。
   *
   * false（默认）= 只挂载当前激活页，切 Tab 会卸载旧页 —— 省内存，
   *   但页内的表单控件 state、上传组件的本地文件、ref 都会丢。
   * true = 所有页一起挂载，非激活页用 display:'none' 隐藏（不参与布局），
   *   等价于 antd Tabs 的 prerenderingSiblingsNumber={Infinity}。
   *   需要"多步表单来回切不丢输入"时用它。
   *
   * 注意：swiper 模式下内容被放进横向分页 ScrollView，flex:1 的子节点
   * 拿不到高度（会塌成 0）—— 需要保活又需要撑满高度时请用 keepAlive，
   * 不要用 swiper + lazyload={false}。
   */
  keepAlive?: boolean;
  /** tab 头均分宽度（不可滚动时有效），默认 false */
  justify?: boolean;
  /** 激活项右下角文字色跟随主色之外的自定义色（少量场景用） */
  activeColor?: string;
  style?: StyleProp<ViewStyle>;
  tabBarStyle?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

interface PaneEntry {
  key: string;
  title: React.ReactNode;
  badge?: string | number | boolean;
  disabled?: boolean;
  content: React.ReactNode;
}

export function XTabs({
  value,
  defaultValue,
  onChange,
  type = 'line',
  swiper = false,
  scroll,
  lazyload = true,
  keepAlive = false,
  justify = false,
  activeColor,
  style,
  tabBarStyle,
  children,
}: XTabsProps) {
  const t = useXTheme();
  /** 解析 TabPane 子元素 → 数据化 panes（key 取 React key） */
  const panes = useMemo<PaneEntry[]>(() => {
    // 注意：不能用 React.Children.toArray —— 它会给已有 key 加 ".$" 前缀
    // （'0' -> '.$0'），导致受控 value='0' 永远匹配不到 pane，Tab 永远切不动。
    // Children.forEach 不改写 key，拿到的就是业务写的原始 key。
    const list: PaneEntry[] = [];
    React.Children.forEach(children, (el, index) => {
      if (!React.isValidElement(el)) return;
      const props = el.props as XTabPaneProps;
      list.push({
        key: el.key != null ? String(el.key) : String(index),
        title: props.title,
        badge: props.badge,
        disabled: props.disabled,
        content: props.children,
      });
    });
    return list;
  }, [children]);

  const isControlled = value !== undefined;
  const [inner, setInner] = useState<string | undefined>(() => defaultValue ?? panes[0]?.key);
  const activeKey = isControlled ? value : inner;
  const activeIndex = Math.max(
    0,
    panes.findIndex(p => p.key === activeKey),
  );

  const setActive = useCallback(
    (key: string, index: number) => {
      if (!isControlled) setInner(key);
      onChange?.(key, index);
    },
    [isControlled, onChange],
  );

  /** tab 头是否滚动：项数 > 4 默认开 */
  const scrollable = scroll ?? panes.length > 4;

  // ---------------------------------------------------------------------------
  // 下划线（line 类型）：激活项 onLayout 测量 → shared value 平移/变宽
  // ---------------------------------------------------------------------------
  const tabLayoutsRef = useRef<Record<number, {x: number; width: number}>>({});
  const lineX = useSharedValue(0);
  const lineW = useSharedValue(0);

  useEffect(() => {
    const layout = tabLayoutsRef.current[activeIndex];
    if (!layout) return;
    const duration = t.motionDurationMid;
    lineX.value = withTiming(layout.x, {duration});
    lineW.value = withTiming(layout.width, {duration});
  }, [activeIndex, panes.length, lineX, lineW, t.motionDurationMid]);

  const lineAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{translateX: lineX.value}],
    width: lineW.value,
  }));

  // ---------------------------------------------------------------------------
  // swiper 内容联动：外部激活 → scrollTo；滑动结束 → 反向激活
  // ---------------------------------------------------------------------------
  const contentRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(0);
  /** 记录"由滑动触发的激活"，避免 scrollTo 循环 */
  const swipingRef = useRef(false);

  useEffect(() => {
    if (!swiper || contentWidth <= 0) return;
    contentRef.current?.scrollTo({x: activeIndex * contentWidth, animated: false});
    // activeIndex 变化统一同步（滑动手势结束 setState 后也会走到这里，
    // 位置已在松手处，scrollTo 同值无副作用）
  }, [activeIndex, swiper, contentWidth]);

  const handleContentMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / contentWidth);
      const pane = panes[Math.min(Math.max(index, 0), panes.length - 1)];
      if (pane && pane.key !== activeKey) {
        swipingRef.current = true;
        setActive(pane.key, panes.indexOf(pane));
      }
    },
    [contentWidth, panes, activeKey, setActive],
  );

  /** swiper 模式已访问页（lazyload） */
  const [visited, setVisited] = useState<Set<number>>(() => new Set([activeIndex]));
  useEffect(() => {
    setVisited(prev => (prev.has(activeIndex) ? prev : new Set(prev).add(activeIndex)));
  }, [activeIndex]);

  /** 渲染单个 tab 头 */
  const renderTab = (pane: PaneEntry, index: number) => {
    const active = index === activeIndex;
    const disabled = pane.disabled;
    const press = () => !disabled && setActive(pane.key, index);

    if (type === 'button') {
      // 分段按钮：灰轨道 + 激活白底胶囊（暗黑下轨道黑、胶囊灰，由 token 自适应）
      return (
        <Pressable
          key={pane.key}
          onPress={press}
          onLayout={e => {
            tabLayoutsRef.current[index] = {x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width};
          }}
          style={[styles.buttonTab, justify && !scrollable && styles.flex1]}
        >
          <View style={[styles.buttonPill, active && {backgroundColor: t.colorBgContainer}]}>
            <TabTitle pane={pane} active={active} color={active ? t.colorPrimary : t.colorTextSecondary} />
          </View>
        </Pressable>
      );
    }

    // line 类型
    return (
      <Pressable
        key={pane.key}
        onPress={press}
        onLayout={e => {
          tabLayoutsRef.current[index] = {x: e.nativeEvent.layout.x, width: e.nativeEvent.layout.width};
        }}
        style={[styles.lineTab, justify && !scrollable && styles.flex1, disabled && styles.disabled]}
      >
        <TabTitle pane={pane} active={active} color={disabled ? t.colorTextQuaternary : active ? activeColor ?? t.colorPrimary : t.colorText} />
      </Pressable>
    );
  };

  const tabBar = (
    <View
      style={[
        styles.tabBar,
        type === 'button' && {backgroundColor: t.colorBgLayout, borderRadius: t.borderRadius, padding: 2},
        !scrollable && {flexDirection: 'row'},
        tabBarStyle,
      ]}
    >
      {scrollable ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {panes.map(renderTab)}
        </ScrollView>
      ) : (
        panes.map(renderTab)
      )}
      {type === 'line' && (
        <Animated.View
          style={[styles.lineIndicator, {backgroundColor: activeColor ?? t.colorPrimary}, lineAnimatedStyle]}
          pointerEvents='none'
        />
      )}
    </View>
  );

  return (
    <View style={style}>
      {tabBar}
      {swiper ? (
        <View
          onLayout={e => setContentWidth(e.nativeEvent.layout.width)}
          style={styles.content}
        >
          {contentWidth > 0 && (
            <ScrollView
              ref={contentRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              onMomentumScrollEnd={handleContentMomentumEnd}
            >
              {panes.map((pane, index) => (
                <View key={pane.key} style={{width: contentWidth}}>
                  {lazyload && !visited.has(index) ? (
                    <View style={styles.lazyPlaceholder} />
                  ) : (
                    pane.content
                  )}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      ) : keepAlive ? (
        // 保活：全部挂载，非激活页 display:'none' 隐藏（不参与布局，state/ref 都保留）
        // 用 absoluteFill 让每页铺满内容区，flex:1 的子节点才能拿到高度
        <View style={[styles.content, styles.contentFill]}>
          {panes.map((pane, index) => (
            <View
              key={pane.key}
              style={[StyleSheet.absoluteFill, index !== activeIndex && styles.hidden]}
              pointerEvents={index === activeIndex ? 'auto' : 'none'}
            >
              {pane.content}
            </View>
          ))}
        </View>
      ) : (
        // 非 swiper：只挂载激活页（切换即卸载，天然按需渲染）
        <View style={styles.content}>{panes[activeIndex]?.content}</View>
      )}
    </View>
  );
}

/** tab 标题 + 徽标 */
function TabTitle({pane, active, color}: {pane: PaneEntry; active: boolean; color: string}) {
  const t = useXTheme();
  return (
    <View style={styles.titleRow}>
      {typeof pane.title === 'string' ? (
        <Text style={[styles.titleText, {color}, active && styles.titleActive]} numberOfLines={1}>
          {pane.title}
        </Text>
      ) : (
        pane.title
      )}
      {pane.badge != null && pane.badge !== false && (
        <View
          style={[
            styles.badge,
            pane.badge === true
              ? {width: 6, height: 6, borderRadius: 3, backgroundColor: t.colorError}
              : {backgroundColor: t.colorError},
          ]}
        >
          {typeof pane.badge === 'string' || typeof pane.badge === 'number' ? (
            <Text style={styles.badgeText} allowFontScaling={false}>
              {pane.badge}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'relative',
  },
  scrollContent: {
    paddingRight: 8,
  },
  lineTab: {
    paddingHorizontal: 16,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonTab: {
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  flex1: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleText: {
    fontSize: 15,
  },
  titleActive: {
    fontWeight: '600',
  },
  badge: {
    marginLeft: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    lineHeight: 12,
  },
  lineIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 2,
    borderRadius: 1,
  },
  buttonPill: {
    height: 32,
    borderRadius: 6,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    overflow: 'hidden',
    // 内容区必须撑满剩余高度：页面里常见 flex:1 的滚动容器，
    // 父级不撑满就会塌成 0 高（表现为"Tab 头在、内容空白"）
    flex: 1,
  },
  lazyPlaceholder: {
    height: 100,
  },
  /** keepAlive 模式：内容区撑满，absoluteFill 的每页才有真实尺寸 */
  contentFill: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default XTabs;
