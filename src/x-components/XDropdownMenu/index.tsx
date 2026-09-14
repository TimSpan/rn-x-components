/**
 * ============================================================================
 * XDropdownMenu —— 下拉菜单（duxui Menu 的 XTopView 版重写）
 * ============================================================================
 *
 * 【回答"为什么用 XTopView 而不是 duxui 的方式"】
 * duxui 的 Menu 用"页内 Absolute"（TopView.add 挂到页面层）实现，
 * 需要每页包 TopView.page 宿主。本项目已有全局 XTopView 宿主
 * （XPopupProvider 挂根），弹层直接 add 进宿主即可：
 *   1. 不依赖页面容器 —— 任何组件树层级都能弹出；
 *   2. 复用 XPullView 已验证的"挂载→入场→离场→移除"生命周期；
 *   3. 动画走 Reanimated UI 线程，与项目弹窗族手感一致。
 *
 * 【结构与 duxui 对齐】
 *   <XDropdownMenu>
 *     <XDropdownMenu.Item title="全部" options={[{name,value}]} value onChange />
 *     <XDropdownMenu.Item title="排序" options={...} value onChange />
 *   </XDropdownMenu>
 * 打开时：遮罩（点击关闭）+ 触发条"快照"（显示激活态标题，duxui 同思路）
 * + 面板从触发条下方 translateY 下拉滑入；选中即回调 onChange 并关闭。
 * Item 支持自定义 children 面板（替代 options 网格）。
 *
 * 【差异】v1 仅向下展开（绝大多数筛选场景）；多列宽度均分（duxui 支持自定义 column）。
 * ============================================================================
 */

import React, {createContext, useCallback, useContext, useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleProp, StyleSheet, Text, View, ViewStyle} from 'react-native';
import Animated, {Easing, useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';
import {useXTopViewStore} from '../XTopViewStore';
import {useXTheme} from '../theme';

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

export interface XMenuOption {
  name: string;
  value: any;
}

export interface XDropdownMenuItemProps {
  /** 无 options 时的触发文案 */
  title?: string;
  /** 选项列表（有 options 才渲染默认面板） */
  options?: XMenuOption[];
  /** 受控选中值 */
  value?: any;
  /** 选中回调（选中后面板自动关闭） */
  onChange?: (value: any) => void;
  /** 禁用 */
  disabled?: boolean;
  /** 自定义面板内容（替代 options） */
  children?: React.ReactNode;
}

export interface XDropdownMenuProps {
  /** 面板底部是否圆角，默认 true */
  round?: boolean;
  /** 打开/关闭回调 */
  onOpenChange?: (open: boolean) => void;
  /** 触发条高度，默认 44 */
  triggerHeight?: number;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Menu 内部共享：每个 Item 的序号 + 打开/关闭动作 + 激活下标 + 触发条高度 */
interface MenuContextValue {
  index: number;
  activeIndex: number;
  open: (index: number) => void;
  close: () => void;
  triggerHeight: number;
}

const MenuContext = createContext<MenuContextValue | null>(null);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const AnimatedPressable = Animated.createAnimatedComponent(Pressable as any);

// ---------------------------------------------------------------------------
// 触发条单项标题（真实触发与"快照"共用一套渲染）
// ---------------------------------------------------------------------------

function TriggerTitle({
  itemProps,
  active,
  onPress,
  height,
}: {
  itemProps: XDropdownMenuItemProps;
  active: boolean;
  /** 快照场景传 undefined（pointerEvents=none 不需要响应） */
  onPress?: () => void;
  height: number;
}) {
  const t = useXTheme();
  const color = itemProps.disabled
    ? t.colorTextQuaternary
    : active
      ? t.colorPrimary
      : t.colorText;
  const selectedName =
    itemProps.options && itemProps.value !== undefined
      ? itemProps.options.find(o => o.value === itemProps.value)?.name
      : undefined;
  const label = selectedName ?? itemProps.title;
  return (
    <Pressable onPress={onPress} style={[styles.triggerItem, {height}]} disabled={itemProps.disabled || !onPress}>
      <Text style={[styles.triggerText, {color}, active && styles.triggerTextActive]} numberOfLines={1} allowFontScaling={false}>
        {label}
      </Text>
      <Text style={[styles.arrow, {color}, active && styles.arrowOpen]} allowFontScaling={false}>
        ▼
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// 面板覆盖层（挂 XTopView，XPullView 同款生命周期）
// ---------------------------------------------------------------------------

interface MenuOverlayProps {
  visible: boolean;
  /** 触发条在窗口中的位置（measureInWindow 实测） */
  trigger: {x: number; y: number; width: number; height: number};
  round: boolean;
  /** 关闭（点遮罩/选中后） */
  onClose: () => void;
  onExitEnd: () => void;
  /** 触发条快照（激活态渲染，盖在遮罩上保持视觉连续） */
  snapshot: React.ReactNode;
  /** 面板内容 */
  panel: React.ReactNode;
}

const MenuOverlay = ({visible, trigger, round, onClose, onExitEnd, snapshot, panel}: MenuOverlayProps) => {
  const t = useXTheme();
  /** 面板内容高度（onLayout 实测，决定遮罩起点 & 完全收起判断） */
  const [panelHeight, setPanelHeight] = useState(0);
  /** scaleY 展开动画（transformOrigin 顶部 = 触发条下沿），像"从触发条下面抽出/收回" */
  const scaleY = useSharedValue(0);
  const maskOpacity = useSharedValue(0);

  /** 展开 scaleY 0→1（顶部锚点），遮罩淡入 */
  useEffect(() => {
    if (visible) {
      const raf = requestAnimationFrame(() => {
        scaleY.value = withTiming(1, {duration: 200, easing: Easing.out(Easing.cubic)});
        maskOpacity.value = withTiming(0.4, {duration: 200});
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [visible, scaleY, maskOpacity]);

  /** 收起 scaleY →0（同锚点收回，不再向上平移），动画后通知宿主移除 */
  useEffect(() => {
    if (!visible) {
      scaleY.value = withTiming(0, {duration: 180, easing: Easing.in(Easing.cubic)});
      maskOpacity.value = withTiming(0, {duration: 180});
      const timer = setTimeout(onExitEnd, 220);
      return () => clearTimeout(timer);
    }
  }, [visible, scaleY, maskOpacity, onExitEnd]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{scaleY: scaleY.value}],
  }));
  const maskStyle = useAnimatedStyle(() => ({opacity: maskOpacity.value}));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents='box-none'>
      {/* 遮罩：只盖触发条下方区域（duxui 同款），点按关闭；触发条本体不被遮罩覆盖 */}
      <AnimatedPressable
        style={[
          {
            position: 'absolute',
            left: 0,
            right: 0,
            top: trigger.y + trigger.height,
            bottom: 0,
            backgroundColor: '#000',
          },
          maskStyle,
        ]}
        onPress={onClose}
      />
      {/* 触发条快照：显示激活态标题（原位覆盖，遮罩外） */}
      <View
        pointerEvents='none'
        style={{
          position: 'absolute',
          left: trigger.x,
          top: trigger.y,
          width: trigger.width,
          height: trigger.height,
          backgroundColor: t.colorBgContainer,
        }}
      >
        {snapshot}
      </View>
      {/* 面板：宽度对齐触发条，scaleY 从触发条下沿展开/收回（transformOrigin 顶部） */}
      <Animated.View
        style={[
          styles.panel,
          {
            left: trigger.x,
            top: trigger.y + trigger.height,
            width: trigger.width,
            backgroundColor: t.colorBgContainer,
            borderBottomLeftRadius: round ? t.borderRadiusXL : 0,
            borderBottomRightRadius: round ? t.borderRadiusXL : 0,
            transformOrigin: '50% 0%',
          },
          panelStyle,
        ]}
        pointerEvents='auto'
      >
        <View
          onLayout={e => {
            const h = e.nativeEvent.layout.height;
            setPanelHeight(prev => (prev === h ? prev : h));
          }}
        >
          {panel}
        </View>
      </Animated.View>
    </View>
  );
};

// ---------------------------------------------------------------------------
// 对外组件
// ---------------------------------------------------------------------------

export function XDropdownMenu({round = true, onOpenChange, triggerHeight = 44, style, children}: XDropdownMenuProps) {
  const t = useXTheme();
  const add = useXTopViewStore(s => s.add);
  const update = useXTopViewStore(s => s.update);
  const remove = useXTopViewStore(s => s.remove);

  /** 当前打开的 Item 下标；null = 关闭 */
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  /** 触发条窗口坐标（打开瞬间 measureInWindow 实测） */
  const [trigger, setTrigger] = useState({x: 0, y: 0, width: 0, height: triggerHeight});
  /** 面板宿主 key（XPullView 同款生命周期） */
  const keyRef = useRef<number | null>(null);
  /** 最后一次打开的下标（离场动画需要保留面板内容） */
  const lastOpenIndexRef = useRef(-1);
  /** 触发条容器（measureInWindow 用） */
  const triggerRef = useRef<View>(null);

  /** 子 Item 列表（保持声明式 API：通过 element.props 取 options/onChange/children） */
  const items = useMemo(
    () => React.Children.toArray(children).filter(React.isValidElement) as React.ReactElement<XDropdownMenuItemProps>[],
    [children],
  );

  const close = useCallback(() => setActiveIndex(null), []);

  /** 打开某一项：实测触发条窗口坐标 → set 状态 → effect 挂载面板；同项再点 = 关闭 */
  const open = useCallback(
    (index: number) => {
      if (index === activeIndex) {
        close();
        return;
      }
      triggerRef.current?.measureInWindow((x, y, width, height) => {
        setTrigger({x, y, width, height: height || triggerHeight});
        setActiveIndex(prev => (prev === index ? prev : index));
      });
    },
    [activeIndex, close, triggerHeight],
  );

  /** onOpenChange 通知 */
  useEffect(() => {
    onOpenChange?.(activeIndex !== null);
  }, [activeIndex, onOpenChange]);

  /**
   * 面板挂载/更新/移除：
   * activeIndex 变化 → add/update 覆盖层（visible=true）；
   * 变为 null → update 成 visible=false 播离场 → onExitEnd 移除。
   */
  const buildElement = useCallback(
    (openIndex: number, visible: boolean) => {
      const item = items[openIndex];
      const itemProps = item?.props ?? {};
      const handleClose = () => setActiveIndex(null);
      /** 选项点击：回调 + 关闭 */
      const handleOptionPress = (option: XMenuOption) => {
        itemProps.onChange?.(option.value);
        handleClose();
      };
      return (
        <MenuOverlay
          visible={visible}
          trigger={trigger}
          round={round}
          onClose={handleClose}
          onExitEnd={() => {
            if (keyRef.current) {
              remove(keyRef.current);
              keyRef.current = null;
            }
          }}
          snapshot={
            /* 快照 = 触发条行的"激活态重渲染"（duxui 同思路：children 复制一份盖在遮罩上） */
            <View style={[styles.triggerRow, {height: trigger.height}]}>
              {items.map((child, i) => (
                <TriggerTitle key={i} itemProps={child.props} active={i === openIndex} height={trigger.height} />
              ))}
            </View>
          }
          panel={
            itemProps.children != null ? (
              itemProps.children
            ) : (
              <View style={styles.optionsWrap}>
                {(itemProps.options ?? []).map(option => {
                  const selected = option.value === itemProps.value;
                  return (
                    <Pressable
                      key={String(option.value)}
                      onPress={() => handleOptionPress(option)}
                      style={({pressed}) => [
                        styles.optionRow,
                        {borderBottomColor: t.colorSplit},
                        pressed && {backgroundColor: t.colorBgLayout},
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {color: selected ? t.colorPrimary : t.colorText},
                          selected && styles.optionTextActive,
                        ]}
                        allowFontScaling={false}
                      >
                        {option.name}
                      </Text>
                      {selected && (
                        <Text style={{color: t.colorPrimary, fontSize: 14}} allowFontScaling={false}>
                          ✓
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )
          }
        />
      );
    },
    [items, trigger, round, remove, t],
  );

  useEffect(() => {
    if (activeIndex !== null) {
      const el = buildElement(activeIndex, true);
      if (!keyRef.current) {
        keyRef.current = add(el);
      } else {
        update(keyRef.current, el);
      }
      lastOpenIndexRef.current = activeIndex;
    } else if (keyRef.current && lastOpenIndexRef.current >= 0) {
      // 关闭：更新为离场态（保留最后内容），动画后由 onExitEnd 移除
      update(keyRef.current, buildElement(lastOpenIndexRef.current, false));
    }
  }, [activeIndex, buildElement, add, update]);

  /** 卸载兜底清理 */
  useEffect(() => {
    return () => {
      if (keyRef.current) {
        remove(keyRef.current);
        keyRef.current = null;
      }
    };
  }, [remove]);

  /** context value：open/close/activeIndex 分发给每个 Item */
  const ctx = useMemo<MenuContextValue>(
    () => ({index: -1, activeIndex: activeIndex ?? -1, open, close, triggerHeight}),
    [activeIndex, open, close, triggerHeight],
  );

  return (
    <View
      ref={triggerRef}
      style={[styles.triggerRow, {height: triggerHeight, backgroundColor: t.colorBgContainer}, style]}
    >
      {items.map((child, i) => (
        <MenuContext.Provider key={i} value={{...ctx, index: i}}>
          {child}
        </MenuContext.Provider>
      ))}
    </View>
  );
}

/**
 * 触发条单项（真实渲染）：从 MenuContext 拿到自己的序号与开合动作。
 * 面板内容由 XDropdownMenu 直接读取 element.props 渲染，本组件只负责触发条 UI。
 */
export function XDropdownMenuItem(props: XDropdownMenuItemProps) {
  const ctx = useContext(MenuContext);
  if (!ctx) return null;
  return (
    <TriggerTitle
      itemProps={props}
      active={ctx.activeIndex === ctx.index}
      onPress={() => !props.disabled && ctx.open(ctx.index)}
      height={ctx.triggerHeight}
    />
  );
}

const styles = StyleSheet.create({
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  triggerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  triggerText: {
    fontSize: 14,
  },
  triggerTextActive: {
    fontWeight: '600',
  },
  arrow: {
    fontSize: 9,
    marginLeft: 4,
  },
  arrowOpen: {
    transform: [{rotate: '180deg'}],
  },
  panel: {
    position: 'absolute',
    overflow: 'hidden',
  },
  optionsWrap: {
    paddingVertical: 4,
  },
  optionRow: {
    height: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  optionText: {
    fontSize: 14,
  },
  optionTextActive: {
    fontWeight: '600',
  },
});

/** 挂载到 XDropdownMenu 上便于声明式使用：<XDropdownMenu.Item .../> */
const MenuWithItem = XDropdownMenu as typeof XDropdownMenu & {Item: typeof XDropdownMenuItem};
MenuWithItem.Item = XDropdownMenuItem;

export default MenuWithItem;
