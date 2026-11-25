'use client';

// Базовые визуальные элементы: сундук, чип уровня, прогресс-бар, топбар, форматтеры.

import { motion } from 'framer-motion';
import { ChevronLeft, CupSoda, Disc3, Flag, ScanLine } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { ChestTier } from '@/lib/rewards/types';
import { cn } from '@/lib/utils';

/* ============ ИКОНКИ ЗАДАНИЙ ============ */

export const QUEST_ICONS: Record<string, typeof ScanLine> = {
  scan: ScanLine,
  cup: CupSoda,
  disc: Disc3,
  flag: Flag,
};

/* ============ СУНДУК (минималистичный линейный SVG) ============ */

export function ChestIcon({
  tier,
  size = 96,
  open = false,
}: {
  tier: ChestTier;
  size?: number;
  open?: boolean;
}) {
  const def = CHEST_TIERS[tier];
  return (
    <svg
      width={size}
      height={size * 0.92}
      viewBox="0 0 120 108"
      fill="none"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* тень */}
      <ellipse cx="60" cy="103" rx="36" ry="4.5" fill={def.color} opacity="0.12" />
      {/* ножки */}
      <rect x="22" y="90" width="16" height="7" rx="3.5" fill={def.color} opacity="0.55" />
      <rect x="82" y="90" width="16" height="7" rx="3.5" fill={def.color} opacity="0.55" />
      {/* корпус */}
      <rect
        x="16"
        y="46"
        width="88"
        height="46"
        rx="13"
        fill="#ffffff"
        fillOpacity="0.72"
        stroke={def.color}
        strokeWidth="5"
      />
      {/* крышка — анимируется при открытии */}
      <motion.g
        initial={false}
        animate={open ? { y: -15, rotate: -17, opacity: 0.85 } : { y: 0, rotate: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 210, damping: 19 }}
        style={{ transformBox: 'fill-box', transformOrigin: '12% 100%' }}
      >
        <rect
          x="16"
          y="16"
          width="88"
          height="33"
          rx="13"
          fill={def.color}
          fillOpacity="0.16"
          stroke={def.color}
          strokeWidth="5"
        />
      </motion.g>
      {/* замочная пластина */}
      <rect
        x="51"
        y="42"
        width="18"
        height="23"
        rx="6"
        fill={def.color}
        fillOpacity="0.2"
        stroke={def.color}
        strokeWidth="4.5"
      />
      <circle cx="60" cy="50" r="3.2" fill={def.color} />
      <rect x="58.6" y="53" width="2.8" height="6" rx="1.4" fill={def.color} />
    </svg>
  );
}

/* ============ ЧИП УРОВНЯ СУНДУКА ============ */

export function TierChip({ tier, className }: { tier: ChestTier; className?: string }) {
  const def = CHEST_TIERS[tier];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
        className,
      )}
      style={{ background: def.soft, color: def.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: def.color }} />
      {def.short}
    </span>
  );
}

/* ============ ПРОГРЕСС-БАР ============ */

export function ProgressBar({
  value,
  target,
  done,
}: {
  value: number;
  target: number;
  done?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, Math.round((value / Math.max(target, 1)) * 100)));
  return (
    <div
      className="bar-track flex-1"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={target}
    >
      <div className={cn('bar-fill', done && 'bar-fill-done')} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ============ ЗАГОЛОВОК СЕКЦИИ ============ */

export function SectionTitle({
  children,
  aside,
}: {
  children: React.ReactNode;
  aside?: string;
}) {
  return (
    <div className="flex items-baseline justify-between px-1">
      <h2 className="text-[15px] font-semibold text-slate-900">{children}</h2>
      {aside && <span className="text-[12px] font-medium tabular-nums text-slate-400">{aside}</span>}
    </div>
  );
}

/* ============ ВЕРХНЯЯ ПАНЕЛЬ ЭКРАНА ============ */

export function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onBack}
        aria-label="Назад"
        className="press glass flex h-10 w-10 items-center justify-center rounded-full text-slate-700"
      >
        <ChevronLeft size={20} />
      </button>
      <h1 className="text-[16px] font-semibold text-slate-900">{title}</h1>
    </div>
  );
}

/* ============ ФОРМАТТЕРЫ ============ */

export function formatRub(value: number): string {
  return `${value.toLocaleString('ru-RU')} ₽`;
}

/** Русская плюрализация: plural(3, ['спин', 'спина', 'спинов']). */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (d > 1 && d < 5) return forms[1];
  if (d === 1) return forms[0];
  return forms[2];
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'd MMMM', { locale: ru });
}

export function formatDateFull(iso: string): string {
  return format(new Date(iso), 'd MMMM yyyy', { locale: ru });
}
