'use client';

// Главный экран: герой с CTA, «как это работает», сундуки, задания.

import { Check, ChevronRight, ScanLine } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ChestIcon, ProgressBar, QUEST_ICONS, SectionTitle, TierChip } from './bits';

const STEPS = [
  { title: 'Найди код', sub: 'DataMatrix на дне банки' },
  { title: 'Отсканируй', sub: 'Каждая банка — в зачёт' },
  { title: 'Открой сундук', sub: 'Подарок за задание' },
];

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-[19px] font-bold tabular-nums text-slate-900">{value}</span>
      <span className="text-[11px] text-slate-400">{label}</span>
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestState }) {
  const Icon = QUEST_ICONS[quest.icon] ?? ScanLine;
  const done = quest.completed;

  return (
    <article className="glass rounded-3xl p-4">
      <div className="flex items-start gap-3">
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
            <h3 className="text-[14px] font-semibold text-slate-900">{quest.title}</h3>
            <TierChip tier={quest.rewardTier} />
          </div>
          <p className="mt-0.5 text-[12px] leading-snug text-slate-400">{quest.desc}</p>
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

export function HomeView() {
  const state = useRewardsStore((s) => s.state);
  const loadState = useRewardsStore((s) => s.loadState);
  const go = useRewardsStore((s) => s.go);
  const openChestView = useRewardsStore((s) => s.openChestView);

  if (!state) {
    return (
      <div className="glass flex flex-col items-center rounded-[26px] px-6 py-12 text-center">
        <h2 className="text-[15.5px] font-semibold text-slate-800">Не удалось загрузить</h2>
        <p className="mt-1 text-[12.5px] text-slate-400">Проверь соединение и попробуй снова</p>
        <button
          type="button"
          onClick={() => void loadState()}
          className="press mt-5 h-12 rounded-2xl bg-slate-900 px-6 text-[13.5px] font-semibold text-white"
        >
          Повторить
        </button>
      </div>
    );
  }

  const unopened = state.chests.filter((c) => c.status === 'UNOPENED');
  const openedCount = state.chests.length - unopened.length;
  const doneQuests = state.quests.filter((q) => q.completed).length;

  return (
    <div className="flex flex-col gap-5">
      {/* герой */}
      <section className="glass rounded-[26px] p-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Акция · Честный знак
        </p>
        <h1 className="mt-2 text-[21px] font-semibold leading-snug text-slate-900">
          Сканируй банки — открывай сундуки
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
          Каждый код с банки HQD идёт в зачёт заданий. Выполнил задание — получил сундук с
          подарком.
        </p>
        <button
          type="button"
          onClick={() => go('scan')}
          className="press mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white"
        >
          <ScanLine size={18} />
          Сканировать код
        </button>
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-900/10 border-t border-slate-900/10 pt-3.5">
          <Stat label="Банок" value={state.scansCount} />
          <Stat label="Сундуков" value={state.chests.length} />
          <Stat label="Призов" value={state.prizes.length} />
        </div>
      </section>

      {/* как это работает */}
      <section className="grid grid-cols-3 gap-2" aria-label="Как это работает">
        {STEPS.map((s, i) => (
          <div key={s.title} className="glass-soft rounded-2xl p-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-[11px] font-bold text-white">
              {i + 1}
            </span>
            <p className="mt-2 text-[12px] font-semibold leading-tight text-slate-800">{s.title}</p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-slate-400">{s.sub}</p>
          </div>
        ))}
      </section>

      {/* сундуки */}
      {unopened.length > 0 && (
        <section aria-label="Сундуки">
          <SectionTitle aside={`${unopened.length} ждут`}>Сундуки</SectionTitle>
          <div className="mt-2.5 space-y-2.5">
            {unopened.map((ch) => {
              const tier = CHEST_TIERS[ch.tier];
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => openChestView(ch.id)}
                  className="press glass flex w-full items-center gap-3.5 rounded-3xl p-4 text-left"
                >
                  <span
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                    style={{ background: tier.soft }}
                  >
                    <ChestIcon tier={ch.tier} size={46} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14.5px] font-semibold text-slate-900">
                      {tier.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-slate-400">
                      {ch.questTitle ? `За задание «${ch.questTitle}»` : 'Демо-сундук'}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3.5 py-2 text-[12px] font-semibold text-white">
                    Открыть
                    <ChevronRight size={14} />
                  </span>
                </button>
              );
            })}
          </div>
          {openedCount > 0 && (
            <p className="mt-2.5 px-1 text-[11.5px] text-slate-400">
              Открыто сундуков: {openedCount}
            </p>
          )}
        </section>
      )}

      {/* задания */}
      <section aria-label="Задания">
        <SectionTitle aside={`${doneQuests}/${state.quests.length}`}>Задания</SectionTitle>
        <div className="mt-2.5 space-y-2.5">
          {state.quests.map((q) => (
            <QuestCard key={q.id} quest={q} />
          ))}
        </div>
      </section>
    </div>
  );
}
