/**
 * ============================================================================
 * XToast —— 全局轻提示（X 系列，复刻自 components/Toast 并现代化）
 * ============================================================================
 *
 * 由三部分组成：
 * - XToast          单条 UI（深色胶囊：图标 + 文案）
 * - XToastProvider  状态宿主，App 根部挂载一次（必须在 SafeAreaProvider 内）
 * - XToastService   命令式入口，任意地方调用
 *
 * 用法：
 *   XToastService.show('保存成功');                                   // 纯文本
 *   XToastService.show({message: '保存成功', type: 'success'});        // 带图标
 *   XToastService.show({message: '网络错误', type: 'error', position: 'top'});
 *
 * 视觉：iOS 风格深色胶囊，淡入 + 弹簧位移动画；top / center / bottom
 * 三个位置独立堆叠，同屏最多 3 条（新的顶掉最旧的）。
 *
 * 实现要点：
 * - 全局句柄 useEffect 注册/清理（无 render 副作用）；
 * - id 由自增计数器生成，避免同一毫秒多条 Toast 的 key 冲突；
 * - 位移方向按位置自适应（top 从上滑入，其余从下滑入）；
 * - duration 传 0 表示不自动消失，适配手动控制场景。
 */
import React, {createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode} from 'react';
import {ActivityIndicator, Animated, StyleSheet, Text, View} from 'react-native';
import AntDesign from '@react-native-vector-icons/ant-design';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {xTheme} from '../../theme';

// ================= 类型定义 =================

export type XToastType = 'success' | 'error' | 'info' | 'warning' | 'loading' | 'text';
export type XToastPosition = 'top' | 'center' | 'bottom';

export interface XToastOptions {
  message: string;
  /** 显示时长（毫秒），默认 2000；0 表示不自动消失 */
  duration?: number;
  type?: XToastType;
  position?: XToastPosition;
}

interface XToastState {
  id: number;
  message: string;
  duration: number;
  type: XToastType;
  position: XToastPosition;
}

/** 同屏最多保留的 Toast 条数 */
const MAX_VISIBLE = 3;

/** 深色底上的语义图标色（比 antd 默认色提亮一档，保证对比度）；as const 保留图标名字面量类型 */
const TYPE_ICON = {
  success: {name: 'check-circle', color: '#4ADE80'},
  error: {name: 'close-circle', color: '#F87171'},
  info: {name: 'info-circle', color: '#60A5FA'},
  warning: {name: 'warning', color: '#FBBF24'},
} as const satisfies Record<Exclude<XToastType, 'loading' | 'text'>, {name: string; color: string}>;

// ================= 单条 Toast UI =================

const XToastItem = ({toast, onClose}: {toast: XToastState; onClose: () => void}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const fromTop = toast.position === 'top';
  const translateY = useRef(new Animated.Value(fromTop ? -24 : 24)).current;

  useEffect(() => {
    // 入场：淡入 + 弹簧位移
    Animated.parallel([
      Animated.timing(opacity, {toValue: 1, duration: 180, useNativeDriver: true}),
      Animated.spring(translateY, {toValue: 0, useNativeDriver: true, friction: 9, tension: 80}),
    ]).start();

    // 定时退场（duration 为 0 时不自动消失，由调用方手动控制）
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (toast.duration > 0) {
      timer = setTimeout(() => {
        Animated.timing(opacity, {toValue: 0, duration: 200, useNativeDriver: true}).start(({finished}) => {
          if (finished) onClose();
        });
      }, toast.duration);
    }
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const icon = TYPE_ICON[toast.type as Exclude<XToastType, 'loading' | 'text'>];

  return (
    <Animated.View style={[styles.toast, {opacity, transform: [{translateY}]}]}>
      {toast.type === 'loading' ? (
        <ActivityIndicator size='small' color='#fff' />
      ) : (
        icon && <AntDesign name={icon.name} size={18} color={icon.color} />
      )}
      {!!toast.message && <Text style={styles.text}>{toast.message}</Text>}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '82%',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(23,26,31,0.94)',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  text: {
    color: '#fff',
    fontSize: xTheme.fontSize,
    lineHeight: 20,
    flexShrink: 1,
  },
});

const styles_overlay = StyleSheet.create({
  top: {
    ...{position: "absolute", top: 0, left: 0, right: 0, bottom: 0},
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 8,
  },
  center: {
    ...{position: "absolute", top: 0, left: 0, right: 0, bottom: 0},
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  bottom: {
    ...{position: "absolute", top: 0, left: 0, right: 0, bottom: 0},
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
  },
});

// ================= Context =================

const XToastContext = createContext<{addToast: (options: XToastOptions) => void}>({
  addToast: () => {},
});

/** 组件内获取 addToast 的 Hook */
export const useXToast = () => useContext(XToastContext);

// ================= Provider + Service =================

/** 全局句柄：Provider 挂载时写入，卸载时清空 */
let addToastHandle: ((options: XToastOptions) => void) | null = null;

export const XToastProvider = ({children}: {children: ReactNode}) => {
  const [toasts, setToasts] = useState<XToastState[]>([]);
  const nextIdRef = useRef(0);
  const insets = useSafeAreaInsets();

  const addToast = useCallback((options: XToastOptions) => {
    const id = ++nextIdRef.current;
    setToasts(prev => {
      const next = [
        ...prev,
        {
          id,
          message: options.message,
          duration: options.duration ?? 2000,
          type: options.type ?? 'text',
          position: options.position ?? 'bottom',
        },
      ];
      // 超出上限时丢最旧的
      return next.slice(-MAX_VISIBLE);
    });
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  useEffect(() => {
    addToastHandle = addToast;
    return () => {
      if (addToastHandle === addToast) {
        addToastHandle = null;
      }
    };
  }, [addToast]);

  const byPosition = (position: XToastPosition) => toasts.filter(toast => toast.position === position);

  const renderPosition = (position: XToastPosition) => {
    const list = byPosition(position);
    if (list.length === 0) {
      return null;
    }
    return (
      <View
        key={position}
        pointerEvents='box-none'
        style={[
          styles_overlay[position],
          position === 'top' ? {paddingTop: insets.top + 56} : null,
          position === 'bottom' ? {paddingBottom: insets.bottom + 80} : null,
        ]}>
        {list.map(toast => (
          <XToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </View>
    );
  };

  return (
    <XToastContext.Provider value={{addToast}}>
      {children}
      {/* 三个位置容器互不干扰，均不拦截触摸 */}
      {(['top', 'center', 'bottom'] as XToastPosition[]).map(renderPosition)}
    </XToastContext.Provider>
  );
};

/**
 * XToastService —— 命令式调用入口（可在组件外使用）
 * show 支持两种签名：
 *   show('保存成功')                            纯文本
 *   show({message, type, duration, position})   完整配置
 */
export const XToastService = {
  show: (messageOrOptions: string | XToastOptions, duration?: number) => {
    const options: XToastOptions =
      typeof messageOrOptions === 'string' ? {message: messageOrOptions, duration} : messageOrOptions;
    if (__DEV__ && !addToastHandle) {
      console.warn('[XToastService] XToastProvider 未挂载，本次 show 调用被忽略');
    }
    addToastHandle?.(options);
  },
};
