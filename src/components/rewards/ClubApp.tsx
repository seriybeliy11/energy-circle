'use client';

// Каркас приложения: фон-сцена, шапка, переключение экранов, глобальные шторки.

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Loader2 } from 'lucide-react';
import { Toaster } from 'sonner';
import { useRewardsStore } from '@/store/useRewardsStore';
import { HomeView } from './HomeView';
import { ScannerView } from './ScannerView';
import { ChestOpenView } from './ChestOpenView';
import { PrizesView } from './PrizesView';
import { ScanResultSheet } from './ScanResultSheet';
import { ClaimSheet } from './ClaimSheet';
import { AdminSheet } from './AdminSheet';

function AppHeader() {
  const go = useRewardsStore((s) => s.go);
  const setAdminOpen = useRewardsStore((s) => s.setAdminOpen);
  const prizesCount = useRewardsStore((s) => s.state?.prizes.length ?? 0);

  const tapsRef = useRef<number[]>([]);

  const handleLogoTap = () => {
    const now = Date.now();
    const taps = tapsRef.current.filter((t) => now - t < 1600);
    taps.push(now);
    tapsRef.current = taps;
    if (taps.length >= 5) {
      tapsRef.current = [];
      setAdminOpen(true);
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-white/60 bg-[#f4f5f7]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center justify-between px-4">
        <button
          type="button"
          onClick={handleLogoTap}
          aria-label="HQD Клуб"
          className="press flex items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-[10px] font-black tracking-tight text-white">
            HQD
          </span>
          <span className="text-[13px] font-bold uppercase tracking-[0.24em] text-slate-800">
            Клуб
          </span>
        </button>
        <button
          type="button"
          onClick={() => go('prizes')}
          aria-label="Мои призы"
          className="press glass relative flex h-10 w-10 items-center justify-center rounded-full text-slate-700"
        >
          <Gift size={18} />
          {prizesCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-none text-white">
              {prizesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

export default function ClubApp() {
  const hydrated = useRewardsStore((s) => s.hydrated);
  const view = useRewardsStore((s) => s.view);
  const activeChestId = useRewardsStore((s) => s.activeChestId);

  useEffect(() => {
    void useRewardsStore.getState().init();
  }, []);

  // При смене экрана возвращаемся наверх.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  return (
    <div className="relative min-h-dvh">
      {/* фоновая сцена со статичными пастельными пятнами */}
      <div className="stage" aria-hidden="true">
        <span className="orb-a" />
        <span className="orb-b" />
        <span className="orb-c" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col sm:border-x sm:border-white/60">
        <AppHeader />

        <main className="flex-1 px-4 pb-4 pt-4">
          {!hydrated ? (
            <div className="flex flex-col items-center justify-center gap-5 py-28">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-[13px] font-black tracking-tight text-white">
                HQD
              </span>
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" aria-label="Загрузка" />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {view === 'home' && <HomeView />}
                {view === 'scan' && <ScannerView />}
                {view === 'chest' && activeChestId && <ChestOpenView key={activeChestId} />}
                {view === 'prizes' && <PrizesView />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>

        <footer className="mt-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center text-[11px] text-slate-400">
          Демо для партнёров · HQD × Самокат
        </footer>
      </div>

      <ScanResultSheet />
      <ClaimSheet />
      <AdminSheet />
      <Toaster position="top-center" theme="light" duration={2200} />
    </div>
  );
}
