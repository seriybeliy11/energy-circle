'use client';

/**
 * Обертка мобильного приложения: колонка 430px по центру экрана,
 * неоновый фон Synthwave, атмосферные свечения для десктопа.
 */

import type { ReactNode } from 'react';

export default function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex min-h-dvh w-full justify-center overflow-x-hidden bg-abyss-deep">
      {/* атмосферные свечения по бокам (только десктоп) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 hidden lg:block">
        <div className="absolute -left-24 top-1/4 h-[440px] w-[440px] rounded-full bg-miami/10 blur-[130px]" />
        <div className="absolute -right-24 bottom-1/4 h-[440px] w-[440px] rounded-full bg-neon-purple/10 blur-[130px]" />
      </div>

      <div className="app-shell-bg relative flex min-h-dvh w-full max-w-[430px] flex-col overflow-hidden lg:border-x lg:border-white/5 lg:shadow-[0_0_90px_rgba(255,42,133,0.08)]">
        {children}
      </div>
    </div>
  );
}
