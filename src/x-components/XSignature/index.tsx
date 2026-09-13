/**
 * ============================================================================
 * XSignature —— 普通签名（单画布连笔，非逐字）
 * ============================================================================
 *
 * 【与 XSignatureSkia 的分工】
 * - XSignatureSkia：逐字签名（一字一格、可单字重写、结构化 value）；
 * - XSignature：普通连笔签名（一块白纸写到底），适合"签个名确认"场景；
 * 两者共用 ./core.tsx 的采集/贝塞尔/渲染内核。
 *
 * 【API】
 *   <XSignature height={200} onExport={base64 => upload(base64)} />
 * 内置 撤销/清空/完成 三个动作按钮（XButton + theme + i18n）。
 * ============================================================================
 */

import React, {useCallback, useState} from 'react';
import {ImageFormat, useCanvasRef} from '@shopify/react-native-skia';
import {StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {XButton} from '../XButton';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {SignatureCanvas, XSignaturePoint, XSignatureStroke} from './core';

export interface XSignatureProps {
  /** 画布高度，默认 200 */
  height?: number;
  /** 笔迹颜色（白纸上），默认 #111 */
  strokeColor?: string;
  /** 笔迹宽度，默认 4 */
  strokeWidth?: number;
  /** 点完成：导出 PNG base64（不含 data: 前缀） */
  onExport?: (base64: string) => void;
  /** 每笔画完回调（业务可拿笔迹做存储） */
  onStrokeEnd?: (strokeCount: number) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function XSignature({
  height = 200,
  strokeColor = '#111111',
  strokeWidth = 4,
  onExport,
  onStrokeEnd,
  disabled = false,
  style,
}: XSignatureProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const canvasRef = useCanvasRef();
  const [size, setSize] = useState({width: 0, height: 0});
  /** 已提交笔画 */
  const [strokes, setStrokes] = useState<XSignatureStroke[]>([]);

  /** 一笔画完 */
  const handleStrokeComplete = useCallback(
    (points: XSignaturePoint[], strokeSize: {width: number; height: number}) => {
      setStrokes(prev => {
        const next = [
          ...prev,
          {
            id: `${Date.now()}-${prev.length}`,
            color: strokeColor,
            width: strokeWidth,
            points,
            size: strokeSize,
          },
        ];
        onStrokeEnd?.(next.length);
        return next;
      });
    },
    [strokeColor, strokeWidth, onStrokeEnd],
  );

  /** 撤销最后一笔 */
  const handleUndo = useCallback(() => setStrokes(prev => prev.slice(0, -1)), []);

  /** 清空 */
  const handleClear = useCallback(() => setStrokes([]), []);

  /** 完成：截图导出（无笔画时不上抛） */
  const handleDone = useCallback(async () => {
    if (!strokes.length) return;
    await new Promise<void>(resolve => setTimeout(resolve, 50));
    const image = canvasRef.current?.makeImageSnapshot();
    if (image) onExport?.(image.encodeToBase64(ImageFormat.PNG));
  }, [strokes.length, canvasRef, onExport]);

  return (
    <View style={[styles.container, style]}>
      <View style={[styles.paper, {height, borderColor: t.colorBorder, borderRadius: t.borderRadiusXL}]}>
        <SignatureCanvas
          strokes={strokes}
          touchEnabled={!disabled}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onStrokeComplete={handleStrokeComplete}
          onLayoutSize={setSize}
          canvasRef={canvasRef}
        />
        {/* 普通签名不放米字格：连笔签名场景不需要字形辅助线（逐字签名才有） */}
        {strokes.length === 0 && (
          <Text pointerEvents='none' style={[styles.placeholder, {color: t.colorTextTertiary}]}>
            {i18n('signHint')}
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        <XButton size='small' onPress={handleUndo} disabled={disabled || !strokes.length}>
          {i18n('undo')}
        </XButton>
        <XButton size='small' danger type='text' onPress={handleClear} disabled={disabled || !strokes.length}>
          {i18n('clear')}
        </XButton>
        <XButton size='small' type='primary' onPress={handleDone} disabled={disabled || !strokes.length}>
          {i18n('done')}
        </XButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  paper: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  placeholder: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});

export default XSignature;
