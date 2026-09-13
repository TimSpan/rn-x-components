/**
 * ============================================================================
 * XSignature 共享内核 —— Skia 画布/贝塞尔/字符变换（逐字签名与普通签名共用）
 * ============================================================================
 *
 * 【移植自 changhu/SkiaSignature】核心算法原样保留：
 * - makePath：中点二次贝塞尔平滑（quadTo），单点画圆；
 * - transformCharacters：每个"字"按独立 cell 等比缩放居中拼到目标画布；
 * - SignatureCanvas：PanResponder 采点（locationX/Y）+ forceTick 触发重绘，
 *   已提交笔画 useMemo 化的 Skia Path 渲染。
 * ============================================================================
 */

import React, {useMemo, useRef, useState} from 'react';
import {PanResponder, StyleSheet, View} from 'react-native';
import {Canvas, Fill, Path, Skia, type CanvasRef} from '@shopify/react-native-skia';

export interface XSignaturePoint {
  x: number;
  y: number;
}

/** 一笔 */
export interface XSignatureStroke {
  id: string;
  color: string;
  width: number;
  points: XSignaturePoint[];
  size: {width: number; height: number};
}

/** 一个"字"（逐字签名用） */
export interface XSignatureCharacter {
  id: string;
  strokes: XSignatureStroke[];
  size: {width: number; height: number};
}

/** 逐字签名结构化取值（可直接进表单） */
export interface XSignatureSkiaValue {
  version: 1;
  characters: XSignatureCharacter[];
}

/** 中点二次贝塞尔平滑（changhu 原算法） */
export function makeSignaturePath(points: XSignaturePoint[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);

  if (points.length === 1) {
    path.addCircle(points[0].x, points[0].y, 0.5);
    return path;
  }

  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path.quadTo(current.x, current.y, midX, midY);
  }

  const last = points[points.length - 1];
  path.lineTo(last.x, last.y);
  return path;
}

/** 字符集 → 目标画布笔画（等比缩放居中，changhu 原算法） */
export function transformCharacters(
  characters: XSignatureCharacter[] | undefined | null,
  targetSize: {width: number; height: number},
): XSignatureStroke[] {
  if (!characters || !characters.length || !targetSize.width || !targetSize.height) return [];

  const cellWidth = targetSize.width / characters.length;
  const padding = Math.min(cellWidth, targetSize.height) * 0.12;
  const targetWidth = Math.max(cellWidth - padding * 2, 1);
  const targetHeight = Math.max(targetSize.height - padding * 2, 1);

  return characters.flatMap((character, charIndex) => {
    const scale = Math.min(targetWidth / character.size.width, targetHeight / character.size.height);
    const drawWidth = character.size.width * scale;
    const drawHeight = character.size.height * scale;
    const offsetX = charIndex * cellWidth + (cellWidth - drawWidth) / 2;
    const offsetY = (targetSize.height - drawHeight) / 2;

    return character.strokes.map(stroke => ({
      ...stroke,
      width: Math.max(stroke.width * scale, 1),
      size: targetSize,
      points: stroke.points.map(point => ({
        x: point.x * scale + offsetX,
        y: point.y * scale + offsetY,
      })),
    }));
  });
}

/** 签名画布（采集 + 渲染；touchEnabled=false 时为静态预览） */
export function SignatureCanvas({
  strokes,
  currentPoints = [],
  touchEnabled = false,
  strokeColor,
  strokeWidth,
  onStrokeComplete,
  onLayoutSize,
  canvasRef,
  paperColor = '#FFFFFF',
}: {
  strokes: XSignatureStroke[];
  currentPoints?: XSignaturePoint[];
  touchEnabled?: boolean;
  strokeColor: string;
  strokeWidth: number;
  onStrokeComplete?: (points: XSignaturePoint[], size: {width: number; height: number}) => void;
  onLayoutSize?: (size: {width: number; height: number}) => void;
  canvasRef?: React.RefObject<CanvasRef | null>;
  /** 纸面颜色（签名图默认白纸，不随主题） */
  paperColor?: string;
}) {
  const sizeRef = useRef({width: 0, height: 0});
  const pointsRef = useRef<XSignaturePoint[]>([]);
  const [, forceTick] = useState(0);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => touchEnabled,
        onMoveShouldSetPanResponder: () => touchEnabled,
        onPanResponderGrant: event => {
          const point = {x: event.nativeEvent.locationX, y: event.nativeEvent.locationY};
          pointsRef.current = [point];
          forceTick(tick => tick + 1);
        },
        onPanResponderMove: event => {
          const point = {x: event.nativeEvent.locationX, y: event.nativeEvent.locationY};
          pointsRef.current = [...pointsRef.current, point];
          forceTick(tick => tick + 1);
        },
        onPanResponderRelease: () => {
          if (pointsRef.current.length) {
            onStrokeComplete?.(pointsRef.current, sizeRef.current);
          }
          pointsRef.current = [];
          forceTick(tick => tick + 1);
        },
        onPanResponderTerminate: () => {
          pointsRef.current = [];
          forceTick(tick => tick + 1);
        },
      }),
    [onStrokeComplete, touchEnabled],
  );

  const activePoints = touchEnabled ? pointsRef.current : currentPoints;

  return (
    <View
      style={styles.canvasHost}
      onLayout={event => {
        const {width, height} = event.nativeEvent.layout;
        const size = {width, height};
        sizeRef.current = size;
        onLayoutSize?.(size);
      }}
      {...(touchEnabled ? panResponder.panHandlers : {})}
    >
      <Canvas ref={canvasRef} style={styles.canvas}>
        <Fill color={paperColor} />
        {strokes.map(stroke => (
          <Path
            key={stroke.id}
            path={makeSignaturePath(stroke.points)}
            color={stroke.color}
            style='stroke'
            strokeWidth={stroke.width}
            strokeCap='round'
            strokeJoin='round'
          />
        ))}
        {activePoints.length > 0 && (
          <Path
            path={makeSignaturePath(activePoints)}
            color={strokeColor}
            style='stroke'
            strokeWidth={strokeWidth}
            strokeCap='round'
            strokeJoin='round'
          />
        )}
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  canvasHost: {
    flex: 1,
  },
  canvas: {
    flex: 1,
  },
});
