'use client';

// Лоадер «HQD ENERGY»: зацикленная чистая волна по буквам.
// tone="dark" — на светлом фоне, tone="light" — на тёмном (камера).

import { cn } from '@/lib/utils';

const WORD = 'HQD ENERGY';

export function HqdLoader({
  tone = 'dark',
  className,
}: {
  tone?: 'dark' | 'light';
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label="Загрузка HQD Energy"
      className={cn('flex flex-col items-center justify-center gap-6 py-24', className)}
    >
      <span className="flex select-none items-center" aria-hidden="true">
        {WORD.split('').map((ch, i) => (
          <span
            key={i}
            className={cn(
              'loader-letter',
              tone === 'light' ? 'text-white' : 'text-slate-900',
            )}
            style={{ animationDelay: `${i * 0.09}s` }}
          >
            {ch === ' ' ? '\u00A0' : ch}
          </span>
        ))}
      </span>
      <span className="sr-only">Загрузка…</span>
    </div>
  );
}
