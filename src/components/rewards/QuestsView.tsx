'use client';

// Единый экран «Прогресс»: сверху — карусель невскрытых сундуков
// (горизонтальное листание свайпом, скроллбар полностью скрыт),
// ниже — компактные карточки заданий с прогрессом. Сундук — награда
// за задание, поэтому обе части петли живут на одном экране.

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronRight, MoveHorizontal, PackageOpen, ScanLine } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { ChestState, QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ChestIcon, ProgressBar, QUEST_ICONS, SectionTitle, TierChip } from './bits';

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

/* ============ КАРУСЕЛЬ (скроллбар скрыт, листание — свайпом) ============ */

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
    <div>
      <div
        ref={trackRef}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain px-[calc(50%-136px)] py-4"
      >
        {chests.map((ch, i) => (
          <ChestCard key={ch.id} chest={ch} index={i} active={i === active} />
        ))}
      </div>

      {/* точки-индикатор */}
      {chests.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-1.5" aria-hidden="true">
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
  );
}

/* ============ КАРТОЧКА ЗАДАНИЯ ============ */

function QuestCard({ quest }: { quest: QuestState }) {
  const Icon = QUEST_ICONS[quest.icon] ?? ScanLine;
  const done = quest.completed;

  return (
    <article className="glass rounded-3xl p-4">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            done ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-900/5 text-slate-600',
          )}
        >
          {done ? <Check size={18} strokeWidth={2.6} /> : <Icon size={18} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate text-[14px] font-semibold text-slate-900">{quest.title}</h3>
            <TierChip tier={quest.rewardTier} />
          </div>
        </div>
      </div>

      {quest.flavors && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {quest.flavors.map((f) => (
            <span
              key={f.name}
              className={cn(
                'rounded-full px-2 py-0.5 text-[10.5px] font-medium',
                f.scanned ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-900/5 text-slate-400',
              )}
            >
              {f.name}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <ProgressBar value={quest.progress} target={quest.target} done={done} />
        <span className="text-[11.5px] font-semibold tabular-nums text-slate-400">
          {quest.progress}/{quest.target}
        </span>
      </div>
    </article>
  );
}

/* ============ ЭКРАН ============ */

export function QuestsView() {
  const state = useRewardsStore((s) => s.state);

  if (!state) return null;

  const unopened = state.chests.filter((c) => c.status === 'UNOPENED');
  const doneQuests = state.quests.filter((q) => q.completed).length;

  return (
    <div className="flex flex-col gap-5">
      {/* сундуки — награда за задания, поэтому сверху */}
      <section aria-label="Сундуки">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] font-semibold text-slate-900">Сундуки</h2>
          {unopened.length > 1 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
              <MoveHorizontal size={13} />
              свайп
            </span>
          )}
        </div>

        {unopened.length > 0 ? (
          <Carousel chests={unopened} />
        ) : (
          <div className="mt-2.5 flex items-center gap-3 rounded-2xl border border-dashed border-slate-900/10 px-4 py-3.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900/5 text-slate-400">
              <PackageOpen size={17} />
            </span>
            <p className="text-[12.5px] font-medium leading-snug text-slate-400">
              Сундуки дают за задания — сканируй банки
            </p>
          </div>
        )}
      </section>

      {/* задания */}
      <section aria-label="Задания">
        <SectionTitle aside={`${doneQuests}/${state.quests.length}`}>Задания</SectionTitle>
        <div className="mt-2.5 space-y-2.5">
          {state.quests.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
          {state.quests.length === 0 && (
            <div className="glass-soft flex flex-col items-center rounded-3xl px-6 py-10 text-center">
              <ScanLine size={26} className="text-slate-300" />
              <p className="mt-2 text-[13px] font-semibold text-slate-500">Заданий пока нет</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
