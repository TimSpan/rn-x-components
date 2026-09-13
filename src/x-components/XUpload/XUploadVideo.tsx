/**
 * ============================================================================
 * XUploadVideo —— 视频上传（单个，适配器驱动）
 * ============================================================================
 * 与 XUploadImage 同一适配器协议；不压缩（视频压缩超出组件库职责），
 * 选择即上传，展示进度与结果（文件名 + 删除）。
 * ============================================================================
 */

import React, {useCallback, useState} from 'react';
import {Pressable, StyleSheet, Text, View, StyleProp, ViewStyle} from 'react-native';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {useXUploadAdapter} from './provider';
import {showXActionSheet} from '../XActionSheet/global';
import {pickVideoFile, takeVideo} from './helpers';
import {XVideoPreview} from '../XVideoPreview';
import type {XUploadAdapter, XUploadResult} from './types';

export interface XUploadVideoProps {
  /** 受控结果 */
  value?: XUploadResult | null;
  onChange?: (item: XUploadResult | null) => void;
  /** 最长视频秒数（picker 侧限制），默认 60 */
  videoMaxDuration?: number;
  disabled?: boolean;
  /** 局部适配器覆盖 */
  adapter?: XUploadAdapter;
  style?: StyleProp<ViewStyle>;
}

export function XUploadVideo({
  value,
  onChange,
  videoMaxDuration = 60,
  disabled = false,
  adapter: localAdapter,
  style,
}: XUploadVideoProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const adapter = useXUploadAdapter(localAdapter);

  const [inner, setInner] = useState<XUploadResult | null>(null);
  const current = value !== undefined ? value : inner;
  const [progress, setProgress] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  /** 视频预览弹层 */
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const emit = useCallback(
    (item: XUploadResult | null) => {
      setInner(item);
      onChange?.(item);
    },
    [onChange],
  );

  /** 弹 ActionSheet → 拍照 / 相册 → 上传 */
  const handlePick = useCallback(async () => {
    if (disabled || progress !== null) return;
    setFailed(false);
    const source = await showXActionSheet({
      title: '选择视频来源',
      options: [
        {label: '🎥  拍视频', value: 'camera'},
        {label: '🎞️  从相册选择', value: 'album'},
        {label: '取消', value: null},
      ],
    });
    let file = null;
    if (source === 'camera') {
      file = await takeVideo({videoMaxDuration});
    } else if (source === 'album') {
      file = await pickVideoFile({videoMaxDuration});
    }
    if (!file) return;
    setProgress(0);
    try {
      const result = await adapter.upload(file, setProgress);
      emit(result);
    } catch (e) {
      console.warn('[XUploadVideo] upload failed:', e);
      setFailed(true);
    } finally {
      setProgress(null);
    }
  }, [disabled, progress, videoMaxDuration, adapter, emit]);

  return (
    <View style={style}>
      {current ? (
        <Pressable
          onPress={() => setPreviewUri(current.url ?? (current as {uri?: string}).uri ?? null)}
          style={[styles.resultBox, {borderColor: t.colorSplit, backgroundColor: t.colorBgLayout, borderRadius: t.borderRadius}]}
        >
          <Text numberOfLines={1} style={[styles.resultText, {color: t.colorText}]}>
            🎬 {String((current as {url?: string}).url ?? (current as {objectKey?: string}).objectKey ?? '视频')}
          </Text>
          {!disabled && (
            <Pressable
              hitSlop={6}
              onPress={() => emit(null)}
              style={styles.deleteBtn}
            >
              <Text style={[styles.removeText, {color: t.colorError}]}>{i18n('delete')}</Text>
            </Pressable>
          )}
        </Pressable>
      ) : (
        <Pressable
          onPress={handlePick}
          disabled={disabled}
          style={({pressed}) => [
            styles.pickBox,
            {borderColor: t.colorBorder, borderRadius: t.borderRadius},
            pressed && {backgroundColor: t.colorBgLayout},
          ]}
        >
          {progress !== null ? (
            <Text style={[styles.pickText, {color: t.colorPrimary}]} allowFontScaling={false}>
              {i18n('uploadingPercent', {n: progress})}
            </Text>
          ) : (
            <Text style={[styles.pickText, {color: failed ? t.colorError : t.colorTextSecondary}]} allowFontScaling={false}>
              {failed ? `${i18n('uploadFailed')} · ${i18n('retry')}` : i18n('pleaseSelect')}
            </Text>
          )}
        </Pressable>
      )}

      {/* 视频预览弹层 */}
      <XVideoPreview
        visible={!!previewUri}
        uri={previewUri ?? ''}
        onClose={() => setPreviewUri(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  resultBox: {
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  resultText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  removeText: {
    fontSize: 13,
  },
  deleteBtn: {
    paddingHorizontal: 4,
  },
  pickBox: {
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickText: {
    fontSize: 14,
  },
});

export default XUploadVideo;
