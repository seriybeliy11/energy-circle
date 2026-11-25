'use client';

// Нижняя шторка с результатом скана: засчитанная банка, прогресс заданий,
// полученные сундуки с кнопкой мгновенного открытия.

import { Check, ChevronRight } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { ChestState, QuestState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { ChestIcon, ProgressBar } from './bits';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

function QuestProgressRow({ quest }: { quest: QuestState }) {
  return (
    <div className="glass-soft rounded-2xl px-4 py-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-800">{quest.title}</span>
        <span className="text-[11.5px] font-semibold tabular-nums text-slate-400">
          {quest.progress}/{quest.target}
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={quest.progress} target={quest.target} done={quest.completed} />
      </div>
      {quest.completed && (
        <p className="mt-2 text-[11.5px] font-semibold text-emerald-600">Задание выполнено</p>
      )}
    </div>
  );
}

export function ScanResultSheet() {
  const scanSuccess = useRewardsStore((s) => s.scanSuccess);
  const state = useRewardsStore((s) => s.state);
  const clearScanFeedback = useRewardsStore((s) => s.clearScanFeedback);
  const go = useRewardsStore((s) => s.go);
  const openChestView = useRewardsStore((s) => s.openChestView);

  const open = scanSuccess !== null;

  const progressedQuests: QuestState[] = scanSuccess
    ? scanSuccess.progressedQuestIds
        .map((id) => state?.quests.find((q) => q.id === id))
        .filter((q): q is QuestState => Boolean(q))
    : [];

  const newChests: ChestState[] = scanSuccess
    ? scanSuccess.newChestIds
        .map((id) => state?.chests.find((c) => c.id === id))
        .filter((c): c is ChestState => Boolean(c))
    : [];

  const firstChest = newChests[0] ?? null;

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) clearScanFeedback();
      }}
    >
      <DrawerContent className="rounded-t-[28px]">
        <div className="mx-auto max-h-[85vh] w-full max-w-[430px] overflow-y-auto scroll-slim px-5 pb-8 pt-3">
          <DrawerTitle className="sr-only">Банка засчитана</DrawerTitle>
          <DrawerDescription className="sr-only">
            {scanSuccess
              ? `${scanSuccess.flavorName}, ${scanSuccess.lineName}. Прогресс заданий обновлён.`
              : ''}
          </DrawerDescription>

          <div className="flex flex-col items-center pt-1 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <Check size={26} strokeWidth={2.6} />
            </span>
            <h2 className="mt-3 text-[18px] font-semibold text-slate-900">Банка засчитана</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              {scanSuccess?.flavorName} · {scanSuccess?.lineName}
            </p>
          </div>

          {progressedQuests.length > 0 && (
            <div className="mt-5 space-y-2.5">
              {progressedQuests.map((q) => (
                <QuestProgressRow key={q.id} quest={q} />
              ))}
            </div>
          )}

          {firstChest && (
            <div className="mt-3 rounded-3xl border bg-white/80 p-4 backdrop-blur" style={{ borderColor: `${CHEST_TIERS[firstChest.tier].color}55` }}>
              <div className="flex items-center gap-3.5">
                <span
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: CHEST_TIERS[firstChest.tier].soft }}
                >
                  <ChestIcon tier={firstChest.tier} size={46} />
                </span>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                    Сундук получен
                  </p>
                  <p className="mt-0.5 text-[14.5px] font-semibold text-slate-900">
                    {CHEST_TIERS[firstChest.tier].name}
                  </p>
                  {newChests.length > 1 && (
                    <p className="text-[11.5px] text-slate-400">
                      И ещё {newChests.length - 1} сундук
                      {newChests.length - 1 === 1 ? '' : 'а'} ждут на главной
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  clearScanFeedback();
                  openChestView(firstChest.id);
                }}
                className="press mt-3.5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14px] font-semibold text-white"
              >
                Открыть сундук
                <ChevronRight size={16} />
              </button>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => clearScanFeedback()}
              className="press glass h-12 rounded-2xl text-[13px] font-semibold text-slate-700"
            >
              Сканировать ещё
            </button>
            <button
              type="button"
              onClick={() => {
                clearScanFeedback();
                go('home');
              }}
              className="press h-12 rounded-2xl border border-slate-900/10 text-[13px] font-semibold text-slate-500"
            >
              На главную
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
