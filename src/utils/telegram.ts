/**
 * Безопасные обертки над Telegram Mini App WebApp SDK с веб-фолбэками.
 * Без внешних пакетов: доступ через window.Telegram?.WebApp. В обычном
 * браузере все функции тихо деградируют (no-op, navigator.vibrate, window.open).
 */

export interface TelegramHapticFeedback {
  impactOccurred(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void;
  notificationOccurred(type: 'error' | 'success' | 'warning'): void;
  selectionChanged(): void;
}

export interface TelegramWebApp {
  ready(): void;
  expand(): void;
  openLink(url: string, options?: { try_instant_view?: boolean }): void;
  openTelegramLink(url: string): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  disableVerticalSwipes?(): void;
  HapticFeedback?: TelegramHapticFeedback;
  initDataUnsafe?: { user?: { first_name?: string } };
}

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

/** Цвет неоновой темы приложения для шапки и фона Telegram. */
const THEME_BG = '#080312';

export function getWebApp(): TelegramWebApp | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.Telegram?.WebApp;
}

export function isTelegramEnv(): boolean {
  return getWebApp() !== undefined;
}

/** Запуск Mini App: ready + expand + цвета шапки/фона, каждый шаг под защитой. */
export function initTelegram(): void {
  const wa = getWebApp();
  if (!wa) return;
  safe(() => wa.ready());
  safe(() => wa.expand());
  safe(() => wa.setHeaderColor(THEME_BG));
  safe(() => wa.setBackgroundColor(THEME_BG));
  safe(() => wa.disableVerticalSwipes?.());
}

export function hapticSelection(): void {
  const haptic = getWebApp()?.HapticFeedback;
  if (haptic) {
    let handled = false;
    try {
      haptic.selectionChanged();
      handled = true;
    } catch {
      // старый SDK - падаем на вибрацию браузера
    }
    if (handled) return;
  }
  vibrate(8);
}

export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft'): void {
  const haptic = getWebApp()?.HapticFeedback;
  if (haptic) {
    let handled = false;
    try {
      haptic.impactOccurred(style);
      handled = true;
    } catch {
      // старый SDK - падаем на вибрацию браузера
    }
    if (handled) return;
  }
  vibrate(10);
}

export function hapticSuccess(): void {
  const haptic = getWebApp()?.HapticFeedback;
  if (haptic) {
    let handled = false;
    try {
      haptic.notificationOccurred('success');
      handled = true;
    } catch {
      // старый SDK - падаем на вибрацию браузера
    }
    if (handled) return;
  }
  vibrate([15, 40, 25]);
}

export function hapticError(): void {
  const haptic = getWebApp()?.HapticFeedback;
  if (haptic) {
    let handled = false;
    try {
      haptic.notificationOccurred('error');
      handled = true;
    } catch {
      // старый SDK - падаем на вибрацию браузера
    }
    if (handled) return;
  }
  vibrate([60, 40, 60]);
}

/** Внешняя ссылка: внутри Telegram - через SDK, иначе window.open. */
export function openExternal(url: string): void {
  const wa = getWebApp();
  if (wa) {
    let handled = false;
    try {
      wa.openLink(url);
      handled = true;
    } catch {
      // падаем на window.open ниже
    }
    if (handled) return;
  }
  safe(() => {
    window.open(url, '_blank', 'noopener');
  });
}

/** Шеринг: t.me/share/url с закодированными параметрами, фолбэк - window.open. */
export function openShare(text: string, url?: string): void {
  const link = url ?? (typeof window !== 'undefined' ? window.location.href : '');
  const urlPart = link ? `url=${encodeURIComponent(link)}&` : '';
  const target = `https://t.me/share/url?${urlPart}text=${encodeURIComponent(text)}`;

  const wa = getWebApp();
  if (wa) {
    let handled = false;
    try {
      wa.openTelegramLink(target);
      handled = true;
    } catch {
      // падаем на window.open ниже
    }
    if (handled) return;
  }
  safe(() => {
    window.open(target, '_blank', 'noopener');
  });
}

/** Выполнить колбэк, проглотив любое исключение (старые версии SDK). */
function safe(fn: () => void): void {
  try {
    fn();
  } catch {
    // тихий фолбэк
  }
}

/** Вибрация браузера, если API доступен. */
function vibrate(pattern: number | number[]): void {
  safe(() => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  });
}
