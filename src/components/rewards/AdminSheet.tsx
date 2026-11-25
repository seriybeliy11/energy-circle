'use client';

// Скрытая демо-панель (5 тапов по логотипу): выдать сундуки, сбросить прогресс.

import { useState } from 'react';
import { Gift, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { useRewardsStore } from '@/store/useRewardsStore';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

export function AdminSheet() {
  const adminOpen = useRewardsStore((s) => s.adminOpen);
  const setAdminOpen = useRewardsStore((s) => s.setAdminOpen);
  const grantDemoChests = useRewardsStore((s) => s.grantDemoChests);
  const resetProgress = useRewardsStore((s) => s.resetProgress);

  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleGrant = async () => {
    if (busy) return;
    setBusy(true);
    await grantDemoChests();
    setBusy(false);
    toast.success('Сундуки выданы');
    setAdminOpen(false);
  };

  const handleReset = async () => {
    if (busy) return;
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    setBusy(true);
    await resetProgress();
    setBusy(false);
    toast.success('Прогресс сброшен');
    setAdminOpen(false);
  };

  return (
    <Drawer open={adminOpen} onOpenChange={setAdminOpen}>
      <DrawerContent className="rounded-t-[28px]">
        <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-3">
          <DrawerTitle className="text-[16px] font-semibold text-slate-900">
            Демо-панель
          </DrawerTitle>
          <DrawerDescription className="text-[12.5px] leading-relaxed text-slate-400">
            Скрытый инструмент для показов партнёрам. Обычные пользователи её не видят.
          </DrawerDescription>

          <button
            type="button"
            onClick={() => void handleGrant()}
            disabled={busy}
            className="press glass-soft mt-4 flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left"
          >
            <span>
              <span className="block text-[13.5px] font-semibold text-slate-800">
                Выдать сундуки
              </span>
              <span className="block text-[11.5px] text-slate-400">
                По одному каждого уровня
              </span>
            </span>
            <Gift size={17} className="shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={busy}
            className="press mt-2.5 flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200/80 bg-red-50/60 px-4 py-3.5 text-left"
          >
            <span>
              <span className="block text-[13.5px] font-semibold text-red-600">
                {confirmReset ? 'Точно сбросить? Нажми ещё раз' : 'Сбросить прогресс'}
              </span>
              <span className="block text-[11.5px] text-red-400">
                Сканы, сундуки и призы будут удалены
              </span>
            </span>
            <RotateCcw size={17} className="shrink-0 text-red-400" />
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
