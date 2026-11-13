/**
 * ============================================================================
 * XWheel / XCardStack —— 每过一格的回馈：清脆「咔哒」声 + 极短清脆震动
 * ============================================================================
 * 声音：见 ./sound.ts（内嵌 22ms WAV，expo-audio 播放）
 * 震动：
 * - Android → expo-haptics 的 performAndroidHapticsAsync(Clock_Tick)，
 *   直接对应系统 HapticFeedbackConstants.CLOCK_TICK（时钟滴答，极短、清脆、
 *   不需要 VIBRATE 权限）。比旧版 selectionAsync 在安卓上用 Vibrator 模拟的
 *   "闷一下"短得多、脆得多。
 * - iOS → selectionAsync()（UISelectionFeedbackGenerator，原生 picker 手感）。
 *
 * 所有依赖都是可选：宿主没装 expo-haptics / expo-audio、或原生模块没编进 APK，
 * 一律静默降级，滚动和翻卡不受任何影响。
 */
import {Platform} from 'react-native';
import {playWheelTick} from './sound';

type HapticsModule = {
  selectionAsync?: () => Promise<void>;
  performAndroidHapticsAsync?: (type: string) => void | Promise<void>;
};

let enabled = true;
let haptics: HapticsModule | null | undefined;

/** 打开/关闭触感（声音与震动一起关） */
export function setXWheelHapticsEnabled(value: boolean) {
  enabled = value;
}
export function isXWheelHapticsEnabled(): boolean {
  return enabled;
}

function loadHaptics(): HapticsModule | null {
  if (haptics !== undefined) return haptics;
  try {
    // require 而非 import：没装时要在运行期安全降级，不能让 import 阶段炸掉
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    haptics = require('expo-haptics') as HapticsModule;
  } catch {
    haptics = null;
  }
  return haptics;
}

function tickVibrate(): void {
  const m = loadHaptics();
  if (!m) return;
  Promise.resolve()
    .then(() => {
      if (Platform.OS === 'android' && m.performAndroidHapticsAsync) {
        // 'clock-tick' = Android CLOCK_TICK，极短清脆的系统级触感
        return m.performAndroidHapticsAsync('clock-tick');
      }
      return m.selectionAsync?.();
    })
    .catch(() => {});
}

/** 一格一次：声音 + 震动，由 worklet 通过 runOnJS 调用（JS 线程执行）。 */
export function tickWheelHaptic(): void {
  if (!enabled) return;
  playWheelTick();
  tickVibrate();
}
