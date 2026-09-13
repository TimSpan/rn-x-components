/**
 * ============================================================================
 * XUploadImage —— 图片上传（九宫格，适配器驱动）
 * ============================================================================
 *
 * 【重构自 changhu/ImageUpload】原实现 UI 与 MinIO 上传逻辑耦合在组件内，
 * 且用 '__uploading__' 占位 hack 展示进度。重构后：
 * - UI 只关心"文件列表 + 进度"，上传走 useXUploadAdapter()（局部/全局可换）；
 * - 进度用独立 overlay 状态，不污染 value；
 * - 连续上传多张时用本地累加器 currentRef，避免闭包旧值覆盖；
 * - 图片自动压缩（expo-image-manipulator，可关）；列宽按容器实测精确计算。
 * ============================================================================
 */

import React, {useCallback, useRef, useState} from 'react';
import {Alert, Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {useXUploadAdapter} from './provider';
import {showXActionSheet} from '../XActionSheet/global';
import {XImagePreviewService} from '../XProviders';
import {compressImage, pickImageFiles, takePicture} from './helpers';
import type {XUploadAdapter, XUploadFile, XUploadResult} from './types';

export interface XUploadImageProps {
  /** 受控结果列表 */
  value?: XUploadResult[];
  onChange?: (items: XUploadResult[]) => void;
  /** 最多张数，默认 9 */
  max?: number;
  /** 是否压缩（默认 true，缩到 compressWidth 宽 + JPEG quality） */
  compress?: boolean;
  compressWidth?: number;
  quality?: number;
  disabled?: boolean;
  /** 列数，默认 3 */
  columns?: number;
  /** 局部适配器覆盖（不传用全局/Provider） */
  adapter?: XUploadAdapter;
  /** 点击已上传项（业务可接 XImagePreview 等） */
  onItemPress?: (item: XUploadResult, index: number) => void;
  style?: StyleProp<ViewStyle>;
}

interface UploadingTask {
  id: string;
  progress: number;
}

const CELL_GAP = 8;

export function XUploadImage({
  value,
  onChange,
  max = 9,
  compress = true,
  compressWidth = 1280,
  quality = 0.6,
  disabled = false,
  columns = 3,
  adapter: localAdapter,
  onItemPress,
  style,
}: XUploadImageProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const adapter = useXUploadAdapter(localAdapter);

  /** 非受控兜底 */
  const [inner, setInner] = useState<XUploadResult[]>([]);
  const items = value ?? inner;
  /** 上传中的任务（进度 overlay） */
  const [tasks, setTasks] = useState<UploadingTask[]>([]);
  /** 连续上传时跨轮次累加（闭包旧值防线） */
  const currentRef = useRef<XUploadResult[]>(items);
  currentRef.current = items;
  /** 容器实测宽度（精确列宽） */
  const [gridWidth, setGridWidth] = useState(0);

  const emit = useCallback(
    (next: XUploadResult[]) => {
      currentRef.current = next;
      setInner(next);
      onChange?.(next);
    },
    [onChange],
  );

  /**
   * 加号：弹 ActionSheet（拍照/相册/取消），再选 → 压缩 → 串行上传
   */
  const handleAdd = useCallback(async () => {
    if (disabled || tasks.length) return;
    const remaining = max - currentRef.current.length;
    if (remaining <= 0) return;
    const source = await showXActionSheet({
      title: '选择图片来源',
      options: [
        {label: '📷  拍照', value: 'camera'},
        {label: '🖼️  从相册选择', value: 'album'},
        {label: '取消', value: null},
      ],
    });
    let picked: XUploadFile[] = [];
    if (source === 'camera') {
      const file = await takePicture({quality: 0.9});
      if (file) picked = [file];
    } else if (source === 'album') {
      picked = await pickImageFiles({max: remaining, quality: 0.9});
    }
    for (const raw of picked) {
      if (currentRef.current.length >= max) break;
      const file = compress ? await compressImage(raw, compressWidth, quality) : raw;
      const taskId = `${Date.now()}-${Math.random()}`;
      setTasks(prev => [...prev, {id: taskId, progress: 0}]);
      try {
        const result = await adapter.upload(file, percent => {
          setTasks(prev => prev.map(task => (task.id === taskId ? {...task, progress: percent} : task)));
        });
        emit([...currentRef.current, result]);
      } catch (e) {
        console.warn('[XUploadImage] upload failed:', e);
        Alert.alert('上传失败', String((e as Error).message ?? e));
      } finally {
        setTasks(prev => prev.filter(task => task.id !== taskId));
      }
    }
  }, [disabled, max, tasks.length, compress, compressWidth, quality, adapter, emit]);

  /** 删除 */
  const handleRemove = useCallback(
    (index: number) => {
      emit(currentRef.current.filter((_, i) => i !== index));
    },
    [emit],
  );

  const handleLayout = useCallback((e: LayoutChangeEvent) => {
    setGridWidth(e.nativeEvent.layout.width);
  }, []);

  /** 精确列宽：容器宽 - 间隙后均分 */
  const cellWidth = gridWidth > 0 ? (gridWidth - CELL_GAP * (columns - 1)) / columns : undefined;

  const showAdd = !disabled && items.length + tasks.length < max;

  return (
    <View style={[styles.grid, style]} onLayout={handleLayout}>
      {items.map((item, index) => (
        <View
          key={`${item.objectKey ?? item.url ?? index}`}
          style={[styles.cell, {borderRadius: t.borderRadius, borderColor: t.colorSplit, width: cellWidth}]}
        >
          <Pressable
            style={styles.cellInner}
            onPress={() => {
              // 默认调用内置 XImagePreviewService 预览；也可通过 onItemPress 覆盖
              if (onItemPress) {
                onItemPress(item, index);
              } else {
                const urls = items
                  .map(it => it?.url ?? (it as {uri?: string}).uri)
                  .filter(Boolean) as string[];
                const initialIndex = index;
                XImagePreviewService.show({images: urls, initialIndex});
              }
            }}
          >
            <Image source={{uri: item.url ?? (item as {uri?: string}).uri}} style={styles.image} resizeMode='cover' />
          </Pressable>
          {!disabled && (
            <Pressable style={styles.remove} onPress={() => handleRemove(index)} hitSlop={6}>
              <Text style={styles.removeText} allowFontScaling={false}>
                ✕
              </Text>
            </Pressable>
          )}
        </View>
      ))}

      {/* 上传中占位 */}
      {tasks.map(task => (
        <View
          key={task.id}
          style={[
            styles.cell,
            styles.uploadingCell,
            {borderRadius: t.borderRadius, borderColor: t.colorSplit, backgroundColor: t.colorBgLayout, width: cellWidth},
          ]}
        >
          <View style={styles.cellCenter}>
            <Text style={[styles.progressText, {color: t.colorPrimary}]} allowFontScaling={false}>
              {i18n('uploadingPercent', {n: task.progress})}
            </Text>
          </View>
        </View>
      ))}

      {/* 加号 */}
      {showAdd && (
        <Pressable
          onPress={handleAdd}
          style={({pressed}) => [
            styles.cell,
            styles.addCell,
            {borderRadius: t.borderRadius, borderColor: t.colorBorder, width: cellWidth},
            pressed && {backgroundColor: t.colorBgLayout},
          ]}
        >
          <View style={styles.cellCenter}>
            <Text style={[styles.addText, {color: t.colorTextTertiary}]} allowFontScaling={false}>
              ＋
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CELL_GAP,
  },
  cell: {
    aspectRatio: 1,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  cellInner: {
    flex: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  remove: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    height: 20,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  removeText: {
    color: '#fff',
    fontSize: 11,
    lineHeight: 13,
  },
  uploadingCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 单元格内容统一用 flex:1 居中容器（修复安卓上加号仅水平居中问题） */
  cellCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  addCell: {
    borderStyle: 'dashed',
  },
  addText: {
    fontSize: 26,
    lineHeight: 30,
  },
});

export default XUploadImage;
