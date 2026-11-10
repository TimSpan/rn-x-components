/**
 * 滚轮每一格的触感回馈。
 *
 * 用 expo-haptics 的 selectionAsync()（最接近 iOS 原生 picker 的"哒"）。
 * 关键点：**必须能在没装/没编进原生包时静默降级** ——
 * expo-haptics 是原生模块，宿主如果还没重新打包，调用会抛
 * "Cannot find native module 'ExpoHaptics'"，这里全部吞掉，不影响滚动。
 */
type HapticsModule = {selectionAsync: () => Promise<void>};

/** 全局开关（宿主可关掉，比如省电场景） */
let enabled = true;
/** undefined = 还没试过加载；null = 加载失败（没装） */
let haptics: HapticsModule | null | undefined;

/** 打开/关闭滚轮触感 */
export function setXWheelHapticsEnabled(value: boolean) {
  enabled = value;
}

export function isXWheelHapticsEnabled(): boolean {
  return enabled;
}

function loadHaptics(): HapticsModule | null {
  if (haptics !== undefined) return haptics;
  try {
    // 用 require 而不是 import：没装的时候要在运行期安全降级，
    // 不能因为一个可选依赖让整包 import 阶段就炸掉。
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    haptics = require('expo-haptics') as HapticsModule;
  } catch {
    haptics = null;
  }
  return haptics;
}

/** 一格一次。由滚轮在 worklet 里 runOnJS 调用（JS 线程执行）。 */
export function tickWheelHaptic(): void {
  if (!enabled) return;
  const module = loadHaptics();
  if (!module?.selectionAsync) return;
  // selectionAsync 在缺原生模块时是 reject，不是同步抛错
  Promise.resolve()
    .then(() => module.selectionAsync())
    .catch(() => {});
}
