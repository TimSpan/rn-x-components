/**
 * ============================================================================
 * XRecord —— 录音（duxui Recorder 的 expo-audio 重写版）
 * ============================================================================
 *
 * 【与 duxui Recorder 的关系】
 * duxui 用 Taro getRecorderManager()（RN 端依赖 duxapp 原生录音模块），
 * Expo 项目换官方 expo-audio：useAudioRecorder + RecordingPresets +
 * useAudioRecorderState（轮询 RecorderState 拿时长，SDK 57 实测 API）。
 * 交互保留 duxui 的"三段式"：待录音 → 录音中（计时/停止）→ 完成
 * （试听/重录/使用），并补充受控 value 支持。
 *
 * 【取值】onChange({uri, duration})——uri 为本机临时文件，
 * 上传可配合 XUpload 适配器（业务自行接管 uri）。
 * ============================================================================
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {XButton} from '../XButton';

/** 录音结果 */
export interface XRecordValue {
  /** 本机文件地址 file://... */
  uri: string;
  /** 秒 */
  duration: number;
}

export interface XRecordProps {
  /** 最长录音秒数，默认 60（duxui 同默认） */
  max?: number;
  /** 受控值（回显已上抛的录音） */
  value?: XRecordValue | null;
  /** 录音完成并点"使用"后回传 */
  onChange?: (value: XRecordValue) => void;
  /** 麦克风权限被拒回调 */
  onPermissionDenied?: () => void;
  disabled?: boolean;
}

/** 秒 → mm:ss */
const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export function XRecord({max = 60, value, onChange, onPermissionDenied, disabled = false}: XRecordProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();

  /** 三段式状态：idle 待录音 / recording 录音中 / done 录完待确认 */
  const [phase, setPhase] = useState<'idle' | 'recording' | 'done'>('idle');
  /** 录完待确认的草稿 */
  const [draft, setDraft] = useState<XRecordValue | null>(null);
  /** 权限拒绝提示 */
  const [denied, setDenied] = useState(false);
  /** 录音停止瞬间锁存的时长（state 轮询停更后仍能取到正确值） */
  const secondsRef = useRef(0);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  /** 轮询录音状态（200ms）：时长计时 + 上限判断 */
  const recState = useAudioRecorderState(recorder, 200);
  const seconds = recState.durationMillis / 1000;

  /** 停止录音 → 生成草稿 */
  const finishRecording = useCallback(async () => {
    try {
      await recorder.stop();
      const uri = recorder.uri ?? recState.url;
      if (uri) {
        setDraft({uri, duration: Math.max(1, Math.round(Math.min(secondsRef.current || seconds, max)))});
        setPhase('done');
      } else {
        setPhase('idle');
      }
    } catch {
      setPhase('idle');
    }
  }, [recorder, recState.url, seconds, max]);

  /** 上限自动停（isRecording 中且到达 max） */
  useEffect(() => {
    if (phase === 'recording' && recState.isRecording && seconds >= max) {
      secondsRef.current = max;
      finishRecording();
    } else if (recState.isRecording) {
      secondsRef.current = seconds;
    }
  }, [phase, recState.isRecording, seconds, max, finishRecording]);

  /** 开始录音：先请求权限 */
  const startRecording = useCallback(async () => {
    if (disabled) return;
    setDenied(false);
    const {granted} = await requestRecordingPermissionsAsync();
    if (!granted) {
      setDenied(true);
      onPermissionDenied?.();
      return;
    }
    secondsRef.current = 0;
    await recorder.prepareToRecordAsync();
    recorder.record();
    setPhase('recording');
  }, [recorder, disabled, onPermissionDenied]);

  /** 重录：回到待录音 */
  const reset = useCallback(() => {
    setDraft(null);
    secondsRef.current = 0;
    setPhase('idle');
  }, []);

  /** 使用：上抛结果 */
  const confirm = useCallback(() => {
    if (draft) onChange?.(draft);
    setPhase('idle');
    setDraft(null);
  }, [draft, onChange]);

  // 录音中：计时 + 上限提示 + 停止
  if (phase === 'recording') {
    return (
      <View style={[styles.box, {backgroundColor: t.colorErrorBg, borderColor: t.colorErrorBg}]}>
        <View style={[styles.dot, {backgroundColor: t.colorError}]} />
        <Text style={[styles.timer, {color: t.colorError}]} allowFontScaling={false}>
          {fmt(seconds)}
        </Text>
        <Text style={[styles.tip, {color: t.colorTextSecondary}]} allowFontScaling={false}>
          {i18n('maxDurationTip', {n: max})}
        </Text>
        <XButton type='primary' danger size='small' onPress={finishRecording}>
          {i18n('stopRecord')}
        </XButton>
      </View>
    );
  }

  // 录完待确认：试听 + 重录 + 使用
  if (phase === 'done' && draft) {
    return <PreviewRow draft={draft} onRerecord={reset} onUse={confirm} disabled={disabled} />;
  }

  // 待录音（或受控回显）
  return (
    <View style={styles.wrap}>
      {value ? (
        <PreviewRow draft={value} onRerecord={reset} disabled={disabled} usedMode />
      ) : (
        <XButton type='default' block onPress={startRecording} disabled={disabled}>
          {i18n('tapToRecord')}
        </XButton>
      )}
      {denied && <Text style={[styles.denied, {color: t.colorError}]}>{i18n('micPermissionTip')}</Text>}
    </View>
  );
}

/** 完成态行：播放/暂停 + 时长 + 重录（+ 使用） */
function PreviewRow({
  draft,
  onRerecord,
  onUse,
  disabled,
  usedMode = false,
}: {
  draft: XRecordValue;
  onRerecord: () => void;
  onUse?: () => void;
  disabled: boolean;
  /** usedMode：受控 value 回显，隐藏"使用/重录"仅保留试听 */
  usedMode?: boolean;
}) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const player = useAudioPlayer({uri: draft.uri});
  const status = useAudioPlayerStatus(player);
  const playing = status?.playing ?? false;

  const togglePlay = () => {
    if (!player) return;
    if (playing) {
      player.pause();
    } else {
      player.seekTo(0);
      player.play();
    }
  };

  return (
    <View style={[styles.box, {borderColor: t.colorSplit}]}>
      <Text style={[styles.timer, {color: t.colorText}]} allowFontScaling={false}>
        {fmt(draft.duration)}
      </Text>
      <XButton size='small' type={playing ? 'primary' : 'default'} onPress={togglePlay} disabled={disabled}>
        {playing ? i18n('pause') : i18n('play')}
      </XButton>
      {!usedMode && (
        <>
          <XButton size='small' onPress={onRerecord} disabled={disabled}>
            {i18n('rerecord')}
          </XButton>
          <XButton size='small' type='primary' onPress={() => onUse?.()} disabled={disabled}>
            {i18n('useRecording')}
          </XButton>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timer: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  tip: {
    fontSize: 12,
    flex: 1,
  },
  denied: {
    fontSize: 12,
    marginTop: 6,
  },
});

export default XRecord;
