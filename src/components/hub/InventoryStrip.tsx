'use client';

/**
 * Горизонтальная лента инвентаря выигранных призов с неоновым скроллбаром.
 * Незабранный приз пульсирует и открывает окно выдачи по тапу.
 */

import { Lock, PackageOpen } from 'lucide-react';
import { RARITY_META } from '@/api/mockData';
import PrizeIcon from '@/components/PrizeIcon';
import { useHeistStore } from '@/store/useHeistStore';

interface InventoryStripProps {
  onOpenClaim: (uid: string) => void;
}

export default function InventoryStrip({ onOpenClaim }: InventoryStripProps) {
  const inventory = useHeistStore((s) => s.inventory);

  return (
    <section aria-label="Мой лут - инвентарь" className="relative z-10 px-5 pb-5 pt-2">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="font-display text-[13px] uppercase tracking-[0.2em] text-white/85">
          Мой лут
        </h2>
        <span className="text-[11px] text-white/40">{inventory.length} приз(ов)</span>
      </div>

      {inventory.length === 0 ? (
        <div className="flex h-[84px] items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-[11.5px] text-white/40">
          <PackageOpen size={15} />
          Пусто. Сканируй банки и взламывай сейфы
        </div>
      ) : (
        <div className="scroll-x-neon -mx-1 flex snap-x gap-2.5 overflow-x-auto px-1 pb-2.5">
          {inventory.map((item) => {
            const meta = RARITY_META[item.rarity];
            const unclaimed = item.claimStatus === 'UNCLAIMED';
            return (
              <button
                key={item.uid}
                type="button"
                onClick={() => onOpenClaim(item.uid)}
                className="prize-card relative flex w-[104px] shrink-0 snap-start flex-col items-center px-2 pb-2 pt-2.5 transition active:scale-95"
                style={
                  {
                    borderColor: meta.color + (unclaimed ? '99' : '44'),
                    boxShadow: `0 0 ${unclaimed ? '18px' : '8px'} ${meta.glow}`,
                  } as React.CSSProperties
                }
                aria-label={`${item.title}, ${item.valueRub} рублей`}
              >
                <PrizeIcon
                  iconKey={item.image}
                  size={26}
                  className={unclaimed ? 'animate-pulse' : 'opacity-70'}
                />
                <span className="mt-1 line-clamp-1 w-full text-center text-[9.5px] leading-tight text-white/80">
                  {item.title}
                </span>
                <span
                  className="font-display mt-0.5 text-[12px]"
                  style={{ color: meta.color, textShadow: `0 0 8px ${meta.glow}` }}
                >
                  {item.valueRub.toLocaleString('ru-RU')} ₽
                </span>
                {unclaimed ? (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center">
                    <span className="absolute h-full w-full animate-ping rounded-full bg-miami/60" />
                    <span className="h-2 w-2 rounded-full bg-miami shadow-[0_0_8px_rgba(255,42,133,0.9)]" />
                  </span>
                ) : (
                  <Lock size={10} className="absolute right-1.5 top-1.5 text-neon-green/70" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
