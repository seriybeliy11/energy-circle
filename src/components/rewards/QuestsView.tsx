'use client';

// Единый экран «Прогресс»: сверху — лутбоксы (drag-карусель на framer-motion:
// свайп с инерцией и пружинным до-подруливанием к центру, скроллбара нет),
// ниже — компактные строки заданий с кольцевым прогрессом. Лутбокс — награда
// за задание, поэтому обе части петли живут на одном экране.

import { useEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue, type PanInfo } from 'framer-motion';
import { Check, ChevronRight, PackageOpen, ScanLine } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { ChestState, QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ChestIcon, QUEST_ICONS, SectionTitle, TierChip } from './bits';

const CARD_W = 272;
const GAP = 16;
const STEP = CARD_W + GAP;

/* ============ КАРТОЧКА ЛУТБОКСА ============ */

function LootBoxCard({
  chest,
  index,
  active,
  onTap,
}: {
  chest: ChestState;
  index: number;
  active: boolean;
  onTap: (i: number) => void;
}) {
  const tier = CHEST_TIERS[chest.tier];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + index * 0.06, type: 'spring', stiffness: 200, damping: 22 }}
      className="shrink-0 select-none"
      style={{ width: CARD_W }}
    >
      <motion.button
        type="button"
        onClick={() => onTap(index)}
        animate={{ scale: active ? 1 : 0.9, opacity: active ? 1 : 0.5 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
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
          {chest.questTitle ? `За «${chest.questTitle}»` : 'Демо-лутбокс'}
        </p>

        <span className="mt-4 flex h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-slate-900 text-[13.5px] font-semibold text-white">
          Открыть
          <ChevronRight size={15} />
        </span>
      </motion.button>
    </motion.div>
  );
}

/* ============ КАРУСЕЛЬ (гладкий свайп без скроллбара) ============ */

function Carousel({ chests }: { chests: ChestState[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const openChestView = useRewardsStore((s) => s.openChestView);

  const [wrapW, setWrapW] = useState(0);
  const [active, setActive] = useState(0);
  const x = useMotionValue(0);

  const activeRef = useRef(0);
  const initedRef = useRef(false);
  const dragEndAt = useRef(0);

  // измеряем ширину контейнера
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const baseX = wrapW > 0 ? (wrapW - CARD_W) / 2 : 0;
  const minX = baseX - (chests.length - 1) * STEP;
  const offsetFor = (i: number) => baseX - i * STEP;

  // стартовая позиция: первый лутбокс по центру
  useEffect(() => {
    if (wrapW > 0 && !initedRef.current) {
      initedRef.current = true;
      x.set((wrapW - CARD_W) / 2);
    }
  }, [wrapW, x]);

  // активный — ближайший к центру во время жеста
  useEffect(() => {
    const unsub = x.on('change', (v) => {
      const i = Math.max(0, Math.min(chests.length - 1, Math.round((baseX - v) / STEP)));
      if (i !== activeRef.current) {
        activeRef.current = i;
        setActive(i);
      }
    });
    return unsub;
  }, [baseX, chests.length, x]);

  const goTo = (i: number) => {
    const clamped = Math.max(0, Math.min(chests.length - 1, i));
    activeRef.current = clamped;
    setActive(clamped);
    animate(x, offsetFor(clamped), { type: 'spring', stiffness: 320, damping: 34 });
  };

  // свайп окончен: до-подруливаем к ближайшей карточке (с учётом инерции)
  const handleDragEnd = (_: unknown, info: PanInfo) => {
    dragEndAt.current = Date.now();
    const projected = x.get() + info.velocity.x * 0.22;
    goTo(Math.round((baseX - projected) / STEP));
  };

  // тап: по соседней — подрулить, по активной — открыть
  const handleTap = (i: number) => {
    if (Date.now() - dragEndAt.current < 140) return;
    if (i !== activeRef.current) {
      goTo(i);
      return;
    }
    openChestView(chests[i].id);
  };

  return (
    <div>
      <div ref={wrapRef} className="relative overflow-visible py-4">
        <motion.div
          drag="x"
          dragConstraints={{ left: minX, right: baseX }}
          dragElastic={0.16}
          dragTransition={{ power: 0.16, timeConstant: 260, bounceStiffness: 320, bounceDamping: 32 }}
          onDragEnd={handleDragEnd}
          style={{ x }}
          className="flex w-max cursor-grab items-center gap-4 active:cursor-grabbing"
        >
          {chests.map((ch, i) => (
            <LootBoxCard key={ch.id} chest={ch} index={i} active={i === active} onTap={handleTap} />
          ))}
        </motion.div>
      </div>

      {/* точки-индикаторы */}
      {chests.length > 1 && (
        <div className="mt-1 flex items-center justify-center gap-1.5">
          {chests.map((ch, i) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Лутбокс ${i + 1}`}
              className="press p-1"
            >
              <span
                className={cn(
                  'block h-1.5 rounded-full transition-all duration-300',
                  i === active ? 'w-5 bg-slate-900' : 'w-1.5 bg-slate-900/15',
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============ СТРОКА ЗАДАНИЯ (компактная) ============ */

function QuestRow({ quest }: { quest: QuestState }) {
  const Icon = QUEST_ICONS[quest.icon] ?? ScanLine;
  const done = quest.completed;
  const pct = Math.min(1, quest.progress / Math.max(quest.target, 1));
  const R = 16;
  const CIRC = 2 * Math.PI * R;
  const tier = CHEST_TIERS[quest.rewardTier];

  return (
    <article className="glass flex items-center gap-3 rounded-2xl px-3.5 py-2.5">
      {/* кольцевой прогресс с иконкой внутри */}
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        <svg
          width="44"
          height="44"
          viewBox="0 0 44 44"
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle cx="22" cy="22" r={R} fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="3.5" />
          <circle
            cx="22"
            cy="22"
            r={R}
            fill="none"
            stroke={done ? '#059669' : '#0f172a'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.22, 0.88, 0.32, 1)' }}
          />
        </svg>
        {done ? (
          <Check size={16} strokeWidth={2.6} className="text-emerald-600" />
        ) : (
          <Icon size={16} className="text-slate-500" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13.5px] font-semibold text-slate-900">{quest.title}</h3>
        {quest.flavors ? (
          <div className="mt-1 flex items-center gap-1.5">
            {quest.flavors.map((f) => (
              <span
                key={f.name}
                title={f.name}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  f.scanned ? 'bg-emerald-500' : 'bg-slate-900/15',
                )}
              />
            ))}
          </div>
        ) : (
          <p className="mt-0.5 truncate text-[11px] leading-tight text-slate-400">{quest.desc}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className="text-[12px] font-bold tabular-nums leading-none text-slate-400">
          {quest.progress}/{quest.target}
        </span>
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: tier.color }}
          title={tier.name}
          aria-hidden="true"
        />
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
      {/* лутбоксы — награда за задания, поэтому сверху */}
      <section aria-label="Лутбоксы">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[15px] font-semibold text-slate-900">Лутбоксы</h2>
          {unopened.length > 1 && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
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
              Лутбоксы дают за задания — сканируй банки
            </p>
          </div>
        )}
      </section>

      {/* задания — компактные строки */}
      <section aria-label="Задания">
        <SectionTitle aside={`${doneQuests}/${state.quests.length}`}>Задания</SectionTitle>
        <div className="mt-2.5 space-y-2">
          {state.quests.map((q) => (
            <QuestRow key={q.id} quest={q} />
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
