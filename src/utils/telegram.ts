'use client';

// Обёртки над Telegram Mini App WebApp: безопасны и в обычном браузере.

function tg(): any | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as any).Telegram?.WebApp;
}

export function initTelegram() {
  try {
    const app = tg();
    app?.ready?.();
    app?.expand?.();
  } catch {
    /* обычный браузер — ничего не делаем */
  }
}

export function haptic(kind: 'light' | 'medium' | 'success' | 'error') {
  try {
    const app = tg();
    if (!app?.HapticFeedback) return;
    if (kind === 'success' || kind === 'error') {
      app.HapticFeedback.notificationOccurred(kind === 'success' ? 'success' : 'error');
    } else {
      app.HapticFeedback.impactOccurred(kind);
    }
  } catch {
    /* без Telegram — без вибрации */
  }
}
