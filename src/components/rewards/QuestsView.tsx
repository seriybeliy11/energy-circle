'use client';

// Экран «Задания»: компактные карточки заданий с прогрессом.
// Сундуки за задания живут в отдельном разделе («Сундуки» в навигации).
// Минимум текста — цифры и прогресс говорят сами.

import { Check, ScanLine } from 'lucide-react';
import type { QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { ProgressBar, QUEST_ICONS, SectionTitle, TierChip } from './bits';

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

  if (!state) return null;

  const doneQuests = state.quests.filter((q) => q.completed).length;

  return (
    <div className="flex flex-col gap-4">
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
