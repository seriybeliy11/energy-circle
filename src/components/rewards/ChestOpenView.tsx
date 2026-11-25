'use client';

// Экран открытия сундука: спокойная анимация (крышка пружинит вверх, карточка
// приза выезжает на спринге), без конфетти и мигалок.
// Компонент монтируется заново на каждый сундук (key = id в ClubApp).

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight, Loader2, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { PrizeState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { haptic } from '@/utils/telegram';
import { ChestIcon, formatRub, TopBar, TierChip } from './bits';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Уже открытый сундук — сразу показываем его приз. */
function findExistingPrize(chestId: string): PrizeState | null {
  const st = useRewardsStore.getState();
  const chest = st.state?.chests.find((c) => c.id === chestId);
  if (!chest || chest.status !== 'OPENED' || !chest.prizeId) return null;
  return st.state?.prizes.find((p) => p.id === chest.prizeId) ?? null;
}

export function ChestOpenView() {
  const activeChestId = useRewardsStore((s) => s.activeChestId);
  const openChestAction = useRewardsStore((s) => s.openChest);
  const openClaim = useRewardsStore((s) => s.openClaim);
  const go = useRewardsStore((s) => s.go);

  const [initialPrize] = useState<PrizeState | null>(() =>
    activeChestId ? findExistingPrize(activeChestId) : null,
  );
  const [prize, setPrize] = useState<PrizeState | null>(initialPrize);
  const [phase, setPhase] = useState<'idle' | 'opening' | 'revealed'>(
    initialPrize ? 'revealed' : 'idle',
  );
  const [error, setError] = useState(false);

  const state = useRewardsStore((s) => s.state);
  const chest = state?.chests.find((c) => c.id === activeChestId);

  if (!chest) {
    return (
      <div className="flex flex-col gap-4">
        <TopBar title="Сундук" onBack={() => go('quests')} />
        <div className="glass flex flex-col items-center rounded-[26px] px-6 py-10 text-center">
          <h2 className="text-[15px] font-semibold text-slate-800">Сундук не найден</h2>
          <button
            type="button"
            onClick={() => go('quests')}
            className="press mt-4 h-11 rounded-2xl bg-slate-900 px-5 text-[13px] font-semibold text-white"
          >
            К заданиям
          </button>
        </div>
      </div>
    );
  }

  const tier = CHEST_TIERS[chest.tier];

  const handleOpen = async () => {
    if (phase !== 'idle') return;
    setPhase('opening');
    const [result] = await Promise.all([openChestAction(chest.id), sleep(650)]);
    if (!result) {
      setPhase('idle');
      setError(true);
      toast.error('Не удалось открыть сундук. Попробуй ещё раз');
      return;
    }
    haptic('success');
    setPrize(result);
    setPhase('revealed');
  };

  return (
    <div className="flex min-h-[calc(100dvh-190px)] flex-col gap-5">
      <TopBar title="Сундук" onBack={() => go('quests')} />

      <div className="flex flex-1 flex-col items-center justify-center pb-2">
        <AnimatePresence mode="wait">
          {phase !== 'revealed' ? (
            <motion.div
              key="chest"
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              transition={{ duration: 0.26, ease: 'easeIn' }}
              className="flex w-full flex-col items-center pt-6"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.32, ease: 'easeOut' }}
              >
                <ChestIcon tier={chest.tier} size={190} open={phase === 'opening'} />
              </motion.div>

              <h2 className="mt-3 text-[19px] font-semibold text-slate-900">{tier.name}</h2>
              <p className="mt-1 text-[12.5px] text-slate-400">
                {chest.questTitle ? `За задание «${chest.questTitle}»` : 'Демо-сундук'}
              </p>

              <button
                type="button"
                onClick={() => void handleOpen()}
                disabled={phase === 'opening'}
                className="press mt-7 flex h-[52px] w-[240px] items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white disabled:opacity-60"
              >
                {phase === 'opening' ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Открываем…
                  </>
                ) : (
                  <>
                    <PackageOpen size={17} />
                    Открыть сундук
                  </>
                )}
              </button>

              {error && (
                <p className="mt-3 text-[12px] text-red-500">
                  Не удалось открыть. Попробуй ещё раз
                </p>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="prize"
              initial={{ opacity: 0, scale: 0.9, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 24 }}
              className="w-full"
            >
              <div className="glass relative overflow-hidden rounded-[26px] p-6 text-center">
                {/* мягкое свечение уровня сундука */}
                <div
                  className="pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl"
                  style={{ background: tier.color, opacity: 0.16 }}
                  aria-hidden="true"
                />
                <div className="relative flex flex-col items-center">
                  <TierChip tier={chest.tier} />
                  <h2 className="mt-3 text-[20px] font-semibold leading-tight text-slate-900">
                    {prize?.title}
                  </h2>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                    {prize?.description}
                  </p>
                  {prize?.valueRub != null && (
                    <p className="mt-3 text-[16px] font-bold tabular-nums text-slate-900">
                      {formatRub(prize.valueRub)}
                    </p>
                  )}
                  <p className="mt-3 text-[11.5px] text-slate-400">
                    от партнёра «{prize?.partnerName}»
                  </p>

                  <button
                    type="button"
                    onClick={() => prize && openClaim(prize.id)}
                    className="press mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white"
                  >
                    Забрать подарок
                    <ChevronRight size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => go('prizes')}
                    className="press mt-2.5 h-11 w-full rounded-2xl text-[13px] font-semibold text-slate-500"
                  >
                    Мои призы
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
