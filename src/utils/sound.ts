// Лёгкий синтез звуков на WebAudio: тики колеса, скан, выигрыш, джекпот.
// Никаких внешних файлов; безопасен без жеста пользователя и в SSR.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; delay?: number } = {},
) {
  const audio = getCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    const t0 = audio.currentTime + (opts.delay ?? 0);
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(opts.gain ?? 0.05, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp);
    amp.connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  } catch {
    /* звук не критичен */
  }
}

export const sound = {
  /** Тик прокрутки колеса. */
  tick: () => tone(1750, 0.03, { type: 'square', gain: 0.02 }),
  /** Успешный скан. */
  scan: () => {
    tone(660, 0.09, { gain: 0.045 });
    tone(880, 0.12, { delay: 0.08, gain: 0.045 });
  },
  /** Выигрыш. */
  win: () => {
    tone(523, 0.1, { gain: 0.05 });
    tone(659, 0.12, { delay: 0.09, gain: 0.05 });
    tone(784, 0.16, { delay: 0.18, gain: 0.05 });
  },
  /** Промах. */
  miss: () => tone(150, 0.16, { type: 'triangle', gain: 0.05 }),
  /** Джекпот. */
  jackpot: () => {
    [523, 659, 784, 1046, 1318].forEach((f, i) =>
      tone(f, 0.18, { delay: i * 0.09, gain: 0.055 }),
    );
  },
  /** Открытие сундука. */
  chest: () => {
    tone(392, 0.08, { gain: 0.05 });
    tone(523, 0.12, { delay: 0.07, gain: 0.05 });
  },
};
