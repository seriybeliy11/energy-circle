'use client';

// Экран «Сундуки»: горизонтальная скролл-карусель крупных карточек.
// Скролл-снап по центру; активная карточка крупнее и ярче, сундук парит,
// свечение уровня мягко пульсирует. Открытие — тап по карточке.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MoveHorizontal, PackageOpen, ScanLine } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { ChestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ChestIcon, TierChip } from './bits';

const CARD_W = 272;

/* ============ КАРТОЧКА СУНДУКА ============ */

function ChestCard({
  chest,
  index,
  active,
}: {
  chest: ChestState;
  index: number;
  active: boolean;
}) {
  const tier = CHEST_TIERS[chest.tier];
  const openChestView = useRewardsStore((s) => s.openChestView);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.06 + index * 0.07, type: 'spring', stiffness: 200, damping: 22 }}
      className="shrink-0 snap-center"
      style={{ width: CARD_W }}
    >
      <motion.button
        type="button"
        onClick={() => openChestView(chest.id)}
        animate={{ scale: active ? 1 : 0.88, opacity: active ? 1 : 0.45 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        aria-label={`Открыть: ${tier.name}`}
        className="glass press relative flex h-[396px] w-full flex-col items-center overflow-hidden rounded-[32px] px-5 pb-5 pt-7 text-center"
      >
        {/* мягкое свечение уровня */}
        <span
          className="chest-glow pointer-events-none absolute left-1/2 top-[88px] h-44 w-44 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: tier.color }}
          aria-hidden="true"
        />

        <span className="relative flex flex-1 items-center justify-center">
          <span className={cn('chest-float', !active && '[animation-play-state:paused]')}>
            <ChestIcon tier={chest.tier} size={164} />
          </span>
        </span>

        <TierChip tier={chest.tier} />
        <h3 className="mt-2.5 text-[17px] font-bold text-slate-900">{tier.name}</h3>
        <p className="mt-1 line-clamp-1 min-h-[16px] w-full text-[12px] text-slate-400">
          {chest.questTitle ? `За «${chest.questTitle}»` : 'Демо-сундук'}
        </p>

        <span className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-[13.5px] font-semibold text-white">
          Открыть
          <ChevronRight size={15} />
        </span>
      </motion.button>
    </motion.div>
  );
}

/* ============ КАРУСЕЛЬ ============ */

function Carousel({ chests }: { chests: ChestState[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const [active, setActive] = useState(0);

  // Активной считаем карточку, чей центр ближе к центру трека.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const onScroll = () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const center = el.scrollLeft + el.clientWidth / 2;
        const kids = Array.from(el.children) as HTMLElement[];
        let best = 0;
        let bestDist = Infinity;
        kids.forEach((k, i) => {
          const d = Math.abs(k.offsetLeft + k.offsetWidth / 2 - center);
          if (d < bestDist) {
            bestDist = d;
            best = i;
          }
        });
        setActive(best);
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <>
      <div className="flex flex-1 flex-col justify-center">
        <div
          ref={trackRef}
          className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-136px)] py-5"
        >
          {chests.map((ch, i) => (
            <ChestCard key={ch.id} chest={ch} index={i} active={i === active} />
          ))}
        </div>

        {/* точки-индикатор */}
        {chests.length > 1 && (
          <div className="flex items-center justify-center gap-1.5" aria-hidden="true">
            {chests.map((ch, i) => (
              <span
                key={ch.id}
                className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  i === active ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-900/15',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ============ ЭКРАН ============ */

export function ChestsView() {
  const state = useRewardsStore((s) => s.state);
  const go = useRewardsStore((s) => s.go);

  if (!state) return null;

  const unopened = state.chests.filter((c) => c.status === 'UNOPENED');

  return (
    <div className="flex min-h-[calc(100dvh-168px)] flex-col gap-2">
      <div className="flex items-center justify-between px-1 pt-1">
        <h2 className="text-[15px] font-semibold text-slate-900">Сундуки</h2>
        {unopened.length > 1 && (
          <span className="flex items-center gap-1 pr-1 text-[11px] font-medium text-slate-400">
            <MoveHorizontal size={13} />
            свайп
          </span>
        )}
      </div>

      {unopened.length > 0 ? (
        <Carousel chests={unopened} />
      ) : (
        <div className="glass mt-10 flex flex-1 flex-col items-center justify-center rounded-[30px] px-6 py-14 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900/5 text-slate-300">
            <PackageOpen size={26} />
          </span>
          <h3 className="mt-4 text-[15px] font-semibold text-slate-700">Пока пусто</h3>
          <p className="mt-1.5 max-w-[250px] text-[12.5px] leading-relaxed text-slate-400">
            Сундуки дают за задания — сканируй банки и собирай вкусы
          </p>
          <button
            type="button"
            onClick={() => go('scan')}
            className="press mt-6 flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 text-[13.5px] font-semibold text-white"
          >
            <ScanLine size={15} />
            Сканировать банку
          </button>
          <button
            type="button"
            onClick={() => go('quests')}
            className="press mt-2 h-11 rounded-2xl px-6 text-[13px] font-semibold text-slate-500"
          >
            К заданиям
          </button>
        </div>
      )}
    </div>
  );
}
