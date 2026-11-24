/**
 * Синтезированные звуковые эффекты через Web Audio API (без аудиофайлов).
 * Модуль-синглтон sfx: SSR-safe (все браузерные API под защитой), контекст
 * создается лениво при unlock() или первой попытке воспроизведения,
 * состояние mute восстанавливается из localStorage на первом обращении.
 */

export interface SfxController {
  unlock(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  tick(): void;
  click(): void;
  scanSuccess(): void;
  error(): void;
  siren(): void;
  win(): void;
  coin(): void;
}

const MUTED_STORAGE_KEY = 'hqd-sfx-muted';

type AudioContextCtor = typeof AudioContext;

interface AudioWindow {
  AudioContext?: AudioContextCtor;
  webkitAudioContext?: AudioContextCtor;
}

class SfxEngine implements SfxController {
  private ctx: AudioContext | null = null;
  private muted = false;
  private mutedLoaded = false;

  /** Вызывать один раз на первом пользовательском жесте: будим AudioContext. */
  unlock(): void {
    try {
      if (typeof window === 'undefined') return;
      this.isMuted();
      const ctx = this.getContext();
      if (ctx && ctx.state === 'suspended') {
        void ctx.resume().catch(() => undefined);
      }
    } catch {
      // аудио недоступно - тихо игнорируем
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.mutedLoaded = true;
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(MUTED_STORAGE_KEY, muted ? '1' : '0');
      }
    } catch {
      // приватный режим без localStorage - состояние живет только в памяти
    }
  }

  isMuted(): boolean {
    try {
      if (!this.mutedLoaded && typeof window !== 'undefined') {
        this.muted = window.localStorage.getItem(MUTED_STORAGE_KEY) === '1';
        this.mutedLoaded = true;
      }
      return this.muted;
    } catch {
      return this.muted;
    }
  }

  /** Тик рулетки: короткий тихий щелчок при пересечении картой указки. */
  tick(): void {
    this.play(() => this.beep(1250, 0.035, 'square', 0.05, 0));
  }

  /** Тап по UI-кнопке. */
  click(): void {
    this.play(() => this.beep(300, 0.025, 'square', 0.08, 0));
  }

  /** Успешный скан DataMatrix: две восходящие синус-гудка. */
  scanSuccess(): void {
    this.play(() => {
      this.beep(880, 0.1, 'sine', 0.1, 0);
      this.beep(1320, 0.16, 'sine', 0.1, 0.11);
    });
  }

  /** Ошибка: низкий пилообразный зуммер. */
  error(): void {
    this.play(() => this.beep(140, 0.25, 'sawtooth', 0.1, 0, 100));
  }

  /** Полицейская сирена ~1.6 c: 4 цикла 600/900 Гц, тихо. */
  siren(): void {
    this.play(() => {
      for (let cycle = 0; cycle < 4; cycle += 1) {
        this.beep(600, 0.2, 'triangle', 0.06, cycle * 0.4);
        this.beep(900, 0.2, 'triangle', 0.06, cycle * 0.4 + 0.2);
      }
    });
  }

  /** Победа: восходящее арпеджио до-ми-соль-до с финальным аккордом, ~1 c. */
  win(): void {
    this.play(() => {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        this.beep(freq, 0.12, 'triangle', 0.1, i * 0.11);
      });
      notes.forEach((freq) => {
        this.beep(freq, 0.5, 'triangle', 0.055, 0.48);
      });
    });
  }

  /** Обналичивание приза: двойной высокий блип. */
  coin(): void {
    this.play(() => {
      this.beep(1568, 0.07, 'square', 0.07, 0);
      this.beep(1568, 0.1, 'square', 0.07, 0.1);
    });
  }

  /** Ленивое создание AudioContext с webkit-фолбэком. */
  private getContext(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (typeof window === 'undefined') return null;
    const audioWindow = window as unknown as AudioWindow;
    const Ctor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;
    if (!Ctor) return null;
    try {
      this.ctx = new Ctor();
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  /** Единая защита воспроизведения: SSR, mute, отсутствие контекста, исключения. */
  private play(fn: () => void): void {
    try {
      if (typeof window === 'undefined' || this.isMuted()) return;
      if (!this.getContext()) return;
      fn();
    } catch {
      // автоплей-политики и заблокированный контекст - просто тишина
    }
  }

  /** Осциллятор + ADSR-подобная огибающая с экспоненциальным затуханием. */
  private beep(
    freq: number,
    duration: number,
    type: OscillatorType,
    gain: number,
    when: number,
    freqEnd?: number
  ): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    const start = ctx.currentTime + when;

    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, start + duration);
    }

    gainNode.gain.setValueAtTime(gain, start);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }
}

export const sfx: SfxController = new SfxEngine();
