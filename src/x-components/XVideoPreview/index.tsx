/**
 * ============================================================================
 * XVideoPreview —— 视频全屏预览（基于 expo-video + XPullView 居中弹层）
 * ============================================================================
 * 用法：受控组件
 *   <XVideoPreview visible={visible} onClose={...} uri="..." />
 * XUploadVideo 内部直接复用。
 * ============================================================================
 */
import React, {useCallback, useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {useVideoPlayer, VideoView} from 'expo-video';
import {XPullView} from '../XPullView';

export interface XVideoPreviewProps {
  visible: boolean;
  onClose: () => void;
  uri: string;
}

export function XVideoPreview({visible, onClose, uri}: XVideoPreviewProps) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
    p.play();
  });

  // 关闭时停止播放 + 卸载时清理
  useEffect(() => {
    return () => {
      try {
        player?.pause();
      } catch {
        /* noop */
      }
    };
  }, [player]);

  // 每次打开自动播放
  useEffect(() => {
    if (visible && player) {
      try {
        player.play();
      } catch {
        /* noop */
      }
    } else if (!visible && player) {
      try {
        player.pause();
      } catch {
        /* noop */
      }
    }
  }, [visible, player]);

  return (
    <XPullView visible={visible} onClose={onClose} side='center' overlayOpacity={0.85} mask>
      <View style={styles.overlay}>
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit='contain'
          nativeControls
        />
        <Pressable onPress={onClose} hitSlop={12} style={styles.close}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
    </XPullView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: '80%',
    backgroundColor: '#000',
    overflow: 'hidden',
    borderRadius: 12,
  },
  close: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  closeText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default XVideoPreview;