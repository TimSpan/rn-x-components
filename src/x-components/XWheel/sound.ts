/**
 * ============================================================================
 * XWheel / XCardStack —— 每格一次的「咔哒」声
 * ============================================================================
 * 22ms 的机械棘轮音：前 2ms 撞击噪声（咔）+ 2.8kHz 快速衰减正弦（哒）。
 * 直接内嵌 PCM WAV 的 base64（1KB），不依赖 asset 打包 / require(图片)，
 * 所以作为 npm 包发布时不会丢文件。
 *
 * 首次调用时用 expo-file-system 写到 cache，再用 expo-audio 建一个常驻 player；
 * 之后每格只 seekTo(0) + play()，没有文件 IO、没有创建开销。
 *
 * 两个包都是「可选」：宿主没装 / 没编进原生包时静默降级为无声，滚动不受影响。
 * ============================================================================
 */

/** 22ms / 22050Hz / 16bit mono 的咔哒声 */
const TICK_WAV_BASE64 =
  'UklGRu4DAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YcoDAAAz5/XPSRTmx5gEPO89yuEAssqR+CzRwNRE+HQg2ttK5m4LvCZsBrn3pCSQ3koZ1PEs6bLo7/RCEZfv7wNABqr62AGC8M3xdveqBFz+YvxkAWT/Bf75AbIA7P8VzSjUQPqmH38vNS4ZA4fhwdLq1i77VBm6L88k8wI95T7SnuLXACIfoCkcH6IBYuFX2RvjcQVaH5MpJRno+D7hPd1+6M4GbRt+Hy8PQfmz4JLesO+nCy4avB3XDW/3yuW55VDzCwt2Gg4c1gs58jbkY+bd9sYM5hnAFXAEVvLW5j7rwvxxDtMXxhMcBHTwdOoa7/D+Mw+UFfoP7P/28dXp/u84/5YNkRNMDMj9r/AI7JHzwgA9D00SFgrT/G3xou6U9QwEBw8SEH8IQPtz8YbwIfgbBf8Mfw0vBwT7NPKx8sj5fgWYDQEN5wTf+Unz7/OL/CUGfgyYCrYCA/rR9Gf2Av7jBpAL7giwASr5q/QV97r+kwaYCiYIdgCE+XL2U/nk/6oGSwkpBlH/Nvk/93v63gDzBskI5ATZ/nv5DPiP+5UBgQbXB/YDRf6t+bf4ZvxkApAGoQbkAnH94/nH+Tj9vAJZBgIGJAJC/eP5R/pf/vYCygVLBWwBHP2I+ib70P4MA0wFaQS4AMv8ufoY/HT/OAP7BMoDOADY/EP7qPwBACkDggT3Aqv/y/yg+0H9dwBEAwwEdQJq/9T8EPzU/bYAJQOzA+4BHP/q/KH8Tv4LARIDOwN9Adv+Av35/ND+QgH4AuICBAGy/jj9af0Z/1YBvgJlAqkAhf5d/cX9hP9yAZQCGQJYAIb+lf0Q/s3/hwFbAsoBJABs/r79aP79/4kBIwJ2Ad3/c/7z/av+MACOAfEBJAG//3z+MP7x/lkAfQHAAegAjv+C/mP+N/96AHEBjgGyAHj/j/6L/mr/lQBfAVwBgQBj/6P+w/6U/6sATgEoAVQAVf+7/ur+wP+yADQB+wAqAEb/1P4W/+X/ugAfAdMADQBA/+z+O/8BAL4ABAGwAPb/Qf8J/2H/GAC+AOwAjgDf/0j/IP+D/ywAuQDTAG8Ayv9K/zj/oP86ALAAuQBVAMD/U/9Q/7f/RgCpAKIAPAC0/13/af/P/08AoACNACcArP9m/33/4v9VAJQAdwAVAKj/cv+R//L/WACIAGUABgCn/37/pP8AAFoAfABUAPr/p/+K/7T/DABaAHAARADw/6f/lv/E/xUAWABlADUA6P+q/6L/0v8bAFQAWAAnAOH/rv+t/97/IgBQAE0AHQDc/7L/uP/p/yUASwBDABIA';

type TickPlayer = {seekTo: (seconds: number) => void; play: () => void};

let player: TickPlayer | null = null;
let tried = false;

function ensurePlayer(): TickPlayer | null {
  if (tried) return player;
  tried = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {File, Paths} = require('expo-file-system');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const {createAudioPlayer} = require('expo-audio');
    const file = new File(Paths.cache, 'x-wheel-tick.wav');
    // ⚠️ encoding 必须写字面量 'base64'：
    // expo-file-system 19 的包出口只导出 File/Paths/Directory，**没有 EncodingType**，
    // 解构出来是 undefined → 默认按 utf8 写入 → WAV 字节被破坏 → 播放没声音（踩过）。
    file.write(TICK_WAV_BASE64, {encoding: 'base64'});
    player = createAudioPlayer(file.uri) as TickPlayer;
    // 首次创建是异步加载，加载完成后才能 seek/play；先预热一次避免第一格没声
    try {
      (player as unknown as {volume?: number}).volume = 1;
    } catch {}
  } catch {
    player = null;
  }
  return player;
}

/** 全局开关（与触感共用一个开关） */
let soundEnabled = true;
export function setXWheelSoundEnabled(value: boolean) {
  soundEnabled = value;
}
export function isXWheelSoundEnabled(): boolean {
  return soundEnabled;
}

/** 一格一次，快速连滚时会从头重播，不会叠加成噪音 */
export function playWheelTick(): void {
  if (!soundEnabled) return;
  const p = ensurePlayer() as (TickPlayer & {isLoaded?: boolean}) | null;
  if (!p) return;

  const fire = () => {
    try {
      p.seekTo(0);
      p.play();
    } catch {
      // 音频未就绪 / 被系统打断，忽略即可
    }
  };

  // 首次调用时本地文件还在异步加载，直接 play 会被丢掉 → 稍微等一下再放，
  // 保证"第一格"就能听到咔哒声
  if (p.isLoaded === false) {
    setTimeout(fire, 80);
  } else {
    fire();
  }
}
