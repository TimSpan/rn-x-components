/**
 * ============================================================================
 * XLoadingModal —— 命令式 Loading（X 系列，复刻自 components/LoadingModal）
 * ============================================================================
 *
 * 由三部分组成：
 * - XLoadingModal          纯 UI 组件（Modal + 转圈 + 文案）
 * - XLoadingModalProvider  状态宿主，App 根部挂载一次
 * - XLoadingModalService   命令式入口，任意地方（含非组件环境）调用
 *
 * 用法：
 *   App 根部挂载一次 XLoadingModalProvider，然后任意地方：
 *   XLoadingModalService.show({title: '上传中...'});
 *   XLoadingModalService.hide();
 *
 * 实现要点：
 * - 全局句柄 useEffect 注册/清理，Provider 卸载后调用自动失效（无 render 副作用）；
 * - show/hide 引用计数，并发多次 show 时全部 hide 后才关闭；
 * - show 传参为 Partial 合并，只改传入的字段；
 * - DEV 环境未挂载时给出 console.warn，不再静默吞掉调用。
 */
import React, {useCallback, useEffect, useRef, useState, type ReactNode} from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';
import {xTheme} from '../../theme';

// ================= 类型 =================

export interface XLoadingModalProps {
  title?: string;
  visible: boolean;
  color?: string;
  size?: number | 'small' | 'large';
  transparent?: boolean;
}

export interface XLoadingModalConfig {
  title?: string;
  color?: string;
  size?: number | 'small' | 'large';
  transparent?: boolean;
}

type XLoadingModalHandle = {
  show: (params?: Partial<XLoadingModalConfig>) => void;
  hide: () => void;
};

// ================= 纯 UI 组件 =================

export const XLoadingModal: React.FC<XLoadingModalProps> = ({
  title = '加载中...',
  visible,
  color = '#fff',
  size = 'large',
  transparent = false,
}) => {
  return (
    <Modal visible={visible} transparent animationType='fade' statusBarTranslucent presentationStyle='overFullScreen' hardwareAccelerated>
      <View style={styles.mask}>
        <View style={[styles.box, transparent && styles.boxTransparent]}>
          <ActivityIndicator size={size} color={color} />
          {!!title && <Text style={styles.title}>{title}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  mask: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: xTheme.borderRadiusLG,
    backgroundColor: 'rgba(17,20,26,0.85)',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 8},
    elevation: 10,
  },
  boxTransparent: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  title: {
    color: '#fff',
    fontSize: xTheme.fontSize,
    lineHeight: 22,
  },
});

// ================= Provider + Service =================

/** 全局句柄：Provider 挂载时写入，卸载时清空 */
let handle: XLoadingModalHandle | null = null;

const DEFAULT_CONFIG: XLoadingModalConfig = {
  title: '加载中...',
  color: '#fff',
  size: 'large',
  transparent: false,
};

export const XLoadingModalProvider = ({children}: {children: ReactNode}) => {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<XLoadingModalConfig>(DEFAULT_CONFIG);
  /** 引用计数：并发 show 的次数，hide 到 0 才真正关闭 */
  const countRef = useRef(0);

  const show = useCallback((params: Partial<XLoadingModalConfig> = {}) => {
    countRef.current += 1;
    setConfig(prev => ({...prev, ...params}));
    setVisible(true);
  }, []);

  const hide = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    handle = {show, hide};
    return () => {
      if (handle?.show === show) {
        handle = null;
      }
    };
  }, [show, hide]);

  return (
    <>
      {children}
      <XLoadingModal visible={visible} title={config.title} color={config.color} size={config.size} transparent={config.transparent} />
    </>
  );
};

/**
 * XLoadingModalService —— 命令式调用入口（可在 axios 拦截器等非组件环境使用）
 */
export const XLoadingModalService = {
  show: (params: Partial<XLoadingModalConfig> = {}) => {
    if (__DEV__ && !handle) {
      console.warn('[XLoadingModalService] XLoadingModalProvider 未挂载，本次 show 调用被忽略');
    }
    handle?.show(params);
  },
  hide: () => {
    if (__DEV__ && !handle) {
      console.warn('[XLoadingModalService] XLoadingModalProvider 未挂载，本次 hide 调用被忽略');
    }
    handle?.hide();
  },
};
