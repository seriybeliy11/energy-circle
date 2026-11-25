'use client';

// Каркас приложения: фон-сцена, шапка со счётчиком спинов, вкладки-экраны,
// нижняя стеклянная навигация, глобальные шторки.

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Disc3, Gift, RotateCw, ScanLine, Sparkles, Target } from 'lucide-react';
import { Toaster } from 'sonner';
import { useRewardsStore, type View } from '@/store/useRewardsStore';
import { ScannerView } from './ScannerView';
import { QuestsView } from './QuestsView';
import { WheelView } from './WheelView';
import { PrizesView } from './PrizesView';
import { ChestOpenView } from './ChestOpenView';
import { ScanResultSheet } from './ScanResultSheet';
import { ClaimSheet } from './ClaimSheet';
import { AdminSheet } from './AdminSheet';
import { HqdLoader } from './HqdLoader';

function AppHeader() {
  const go = useRewardsStore((s) => s.go);
  const setAdminOpen = useRewardsStore((s) => s.setAdminOpen);
  const spins = useRewardsStore((s) => s.state?.player.spins ?? 0);
  const golden = useRewardsStore((s) => s.state?.player.goldenSpins ?? 0);

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

        <div className="flex items-center gap-2">
          {golden > 0 && (
            <span className="flex h-9 items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50/80 px-3 text-[13px] font-bold tabular-nums text-amber-700 backdrop-blur">
              <Sparkles size={14} />
              {golden}
            </span>
          )}
          <button
            type="button"
            onClick={() => go('wheel')}
            aria-label="Спины колеса"
            className="press glass flex h-9 items-center gap-1.5 rounded-full px-3.5 text-slate-800"
          >
            <RotateCw size={14} className="text-slate-500" />
            <span className="text-[13.5px] font-bold tabular-nums">{spins}</span>
          </button>
        </div>
      </div>
    </header>
  );
}

// Один экран «Прогресс» объединяет задания и сундуки-награды за них.
const NAV: { view: View; icon: typeof ScanLine; label: string }[] = [
  { view: 'scan', icon: ScanLine, label: 'Скан' },
  { view: 'quests', icon: Target, label: 'Прогресс' },
  { view: 'wheel', icon: Disc3, label: 'Колесо' },
  { view: 'prizes', icon: Gift, label: 'Призы' },
];

function BottomNav() {
  const view = useRewardsStore((s) => s.view);
  const go = useRewardsStore((s) => s.go);
  const state = useRewardsStore((s) => s.state);

  const unopenedChests = state?.chests.filter((c) => c.status === 'UNOPENED').length ?? 0;
  const spins = state?.player.spins ?? 0;
  const prizesCount = state?.prizes.length ?? 0;

  const badgeFor = (v: View): number | null => {
    if (v === 'quests') return unopenedChests;
    if (v === 'wheel') return spins;
    if (v === 'prizes') return prizesCount;
    return null;
  };

  return (
    <nav
      aria-label="Разделы"
      className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 px-3 pb-[max(0.625rem,env(safe-area-inset-bottom))]"
    >
      <div className="glass flex items-center justify-between gap-1 rounded-full p-1.5">
        {NAV.map(({ view: v, icon: Icon, label }) => {
          const active = view === v || (v === 'quests' && view === 'chest');
          const badge = badgeFor(v);
          return (
            <button
              key={v}
              type="button"
              onClick={() => go(v)}
              aria-current={active ? 'page' : undefined}
              className={`press relative flex min-h-[44px] flex-1 flex-col items-center justify-center gap-0.5 rounded-full py-1.5 ${
                active ? 'bg-slate-900 text-white' : 'text-slate-500'
              }`}
            >
              <span className="relative">
                <Icon size={19} strokeWidth={active ? 2.4 : 2} />
                {badge != null && badge > 0 && (
                  <span
                    className={`absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9.5px] font-bold leading-none ${
                      active ? 'bg-white text-slate-900' : 'bg-rose-500 text-white'
                    }`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </span>
              <span className="text-[9.5px] font-bold tracking-wide">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
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

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[430px] flex-col sm:border-x sm:border-slate-900/10">
        <AppHeader />

        <main className="flex-1 px-4 pb-24 pt-4">
          {!hydrated ? (
            <HqdLoader className="min-h-[60dvh]" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={view}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {view === 'scan' && <ScannerView />}
                {view === 'quests' && <QuestsView />}
                {view === 'wheel' && <WheelView />}
                {view === 'prizes' && <PrizesView />}
                {view === 'chest' && activeChestId && <ChestOpenView key={activeChestId} />}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <BottomNav />
      <ScanResultSheet />
      <ClaimSheet />
      <AdminSheet />
      <Toaster position="top-center" theme="light" duration={2200} />
    </div>
  );
}
