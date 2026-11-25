'use client';

// Экран «Задания»: готовые сундуки сверху, компактные карточки заданий.
// Минимум текста — цифры и прогресс говорят сами.

import { Check, ChevronRight, ScanLine } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ChestIcon, ProgressBar, QUEST_ICONS, SectionTitle, TierChip } from './bits';

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

export function QuestsView() {
  const state = useRewardsStore((s) => s.state);
  const go = useRewardsStore((s) => s.go);
  const openChestView = useRewardsStore((s) => s.openChestView);

  if (!state) return null;

  const unopened = state.chests.filter((c) => c.status === 'UNOPENED');
  const doneQuests = state.quests.filter((q) => q.completed).length;

  return (
    <div className="flex flex-col gap-4">
      {/* сундуки, готовые к открытию */}
      {unopened.length > 0 && (
        <section aria-label="Сундуки" className="space-y-2.5">
          {unopened.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => openChestView(ch.id)}
              className="press glass flex w-full items-center gap-3.5 rounded-3xl p-4 text-left"
            >
              <span
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: CHEST_TIERS[ch.tier].soft }}
              >
                <ChestIcon tier={ch.tier} size={46} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-semibold text-slate-900">
                  {CHEST_TIERS[ch.tier].name}
                </span>
                <span className="mt-0.5 block truncate text-[12px] text-slate-400">
                  За задание «{ch.questTitle}»
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-slate-900 px-3.5 py-2 text-[12px] font-semibold text-white">
                Открыть
                <ChevronRight size={14} />
              </span>
            </button>
          ))}
        </section>
      )}

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
