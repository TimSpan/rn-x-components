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
import React, {useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import {ActivityIndicator, Modal, StyleSheet, Text, View} from 'react-native';
import {useXTheme} from '../../theme';
import {useXLocale} from '../../XLocale';

// ================= 类型 =================

export interface XLoadingModalProps {
  title?: string;
  visible: boolean;
  color?: string;
  size?: number | 'small' | 'large';
  /** @deprecated 全局 loading 现在只有整屏遮罩、没有卡片底色，这个参数不再生效 */
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
  title,
  visible,
  color,
  size = 'large',
  transparent = false,
}) => {
  const theme = useXTheme();
  const {t: i18n} = useXLocale();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        mask: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          // 去掉卡片后，白色转圈/文案直接压在遮罩上：
          // 0.35 / 0.45 在浅色页面上对比度不够，提到 0.6 才清晰（仍是半透明，能看到底下内容）
          backgroundColor: 'rgba(0,0,0,0.6)',
        },
        /**
         * 只做布局，不画任何底色。
         *
         * 原来这里有一层深色胶囊（rgba(17,20,26,0.85)）+ 阴影，
         * 叠在整屏遮罩上就出现了"遮罩里还有一块更黑的方块"的观感。
         * 全局 loading 只需要「整屏遮罩 + 转圈 + 文案」，不要卡片。
         */
        box: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          paddingHorizontal: 24,
          paddingVertical: 18,
        },
        title: {
          // 浅色实底文字：深色胶囊上的固定对比色
          color: theme.colorTextLightSolid,
          fontSize: theme.fontSize,
          lineHeight: 22,
        },
      }),
    [theme],
  );
  const resolvedTitle = title ?? i18n('loading');
  const resolvedColor = color ?? theme.colorTextLightSolid;
  return (
    <Modal visible={visible} transparent animationType='fade' statusBarTranslucent presentationStyle='overFullScreen' hardwareAccelerated>
      <View style={styles.mask}>
        <View style={styles.box}>
          <ActivityIndicator size={size} color={resolvedColor} />
          {!!resolvedTitle && <Text style={styles.title}>{resolvedTitle}</Text>}
        </View>
      </View>
    </Modal>
  );
};

// ================= Provider + Service =================

/** 全局句柄：Provider 挂载时写入，卸载时清空 */
let handle: XLoadingModalHandle | null = null;

const DEFAULT_CONFIG: XLoadingModalConfig = {
  // title / color 不在此写死：未传时由 XLoadingModal 解析为当前语言的 loading 文案与浅色实底色
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
