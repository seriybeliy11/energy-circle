'use client';

/**
 * Переключатель сейфов: кейсы CS2/Steam против кэша по СБП.
 * При смене таба лента рулетки мгновенно перестраивается.
 */

import { Banknote, Gamepad2 } from 'lucide-react';
import type { PrizeCategory } from '@/api/types';
import { sfx } from '@/utils/soundEffects';
import { hapticSelection } from '@/utils/telegram';

interface SafeSelectorProps {
  value: PrizeCategory;
  onChange: (value: PrizeCategory) => void;
  disabled?: boolean;
  className?: string;
}

const TABS: { id: PrizeCategory; label: string; icon: typeof Gamepad2 }[] = [
  { id: 'GAMING', label: 'Кейсы CS2 / Steam', icon: Gamepad2 },
  { id: 'CASH', label: 'Кэш в Майами (СБП)', icon: Banknote },
];

export default function SafeSelector({ value, onChange, disabled, className }: SafeSelectorProps) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${className ?? ''}`} role="tablist" aria-label="Выбор сейфа">
      {TABS.map((tab) => {
        const active = value === tab.id;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => {
              if (active || disabled) return;
              sfx.click();
              hapticSelection();
              onChange(tab.id);
            }}
            className={`flex h-[52px] items-center justify-center gap-2 rounded-xl border font-display text-[10px] uppercase leading-tight tracking-wide transition-all duration-200 ${
              active
                ? 'border-miami/70 bg-gradient-to-b from-miami/25 to-neon-purple/15 text-white shadow-[0_0_22px_rgba(255,42,133,0.35)]'
                : 'border-white/10 bg-white/[0.03] text-white/45'
            } ${disabled ? 'opacity-60' : 'active:scale-[0.97]'}`}
          >
            <Icon size={17} className={active ? 'text-miami' : 'text-white/35'} />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
