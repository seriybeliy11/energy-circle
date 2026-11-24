'use client';

/**
 * Главный контроллер экранов (аналог App.tsx из ТЗ):
 * Splash -> HUB -> SCAN -> SPIN -> WIN (модалка) -> PartnerGate.
 * Управляет модалками, тостами, скрытой админ-панелью и футером.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Info, TriangleAlert } from 'lucide-react';
import MobileFrame from '@/components/layout/MobileFrame';
import WantedHeader from '@/components/layout/WantedHeader';
import HubScreen from '@/components/hub/HubScreen';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import HeistRoulette from '@/components/roulette/HeistRoulette';
import WinModal from '@/components/modals/WinModal';
import PartnerGateModal from '@/components/modals/PartnerGateModal';
import AdminDrawer from '@/components/modals/AdminDrawer';
import type { PrizeItem } from '@/api/types';
import { useHeistStore } from '@/store/useHeistStore';
import { sfx } from '@/utils/soundEffects';
import { initTelegram } from '@/utils/telegram';

interface WinData {
  prize: PrizeItem;
  nearMiss: PrizeItem;
  uid: string;
}

const SCREEN_TRANSITION = {
  initial: { opacity: 0, x: 42 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -42 },
  transition: { duration: 0.22, ease: 'easeOut' as const },
};

const subscribeNoop = () => () => {};

/** Брендированный сплэш: SSR-совместим, скрывает гидрацию стора. */
function SplashScreen() {
  return (
    <MobileFrame>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-8">
        <motion.div
          animate={{ opacity: [0.55, 1, 0.55] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          className="text-center"
        >
          <p className="font-display text-[26px] leading-tight">
            <span className="neon-gold">HQD</span>
            <span className="mx-1.5 text-white/40">×</span>
            <span className="neon-pink">MIAMI</span>
          </p>
          <p className="neon-cyan font-display mt-1 text-[26px] leading-tight">CHASE</p>
        </motion.div>
        <div className="h-1 w-44 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full w-1/3 rounded-full bg-gradient-to-r from-miami to-miami-orange"
            animate={{ x: ['-120%', '360%'] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="text-[9px] uppercase tracking-[0.3em] text-white/30">
          samokat edition • heist lootbox
        </p>
      </div>
    </MobileFrame>
  );
}

export default function HeistApp() {
  /* Флаг гидратации без эффекта: на сервере false, на клиенте true. */
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );
  const screen = useHeistStore((s) => s.screen);
  const setScreen = useHeistStore((s) => s.setScreen);
  const toast = useHeistStore((s) => s.toast);
  const clearToast = useHeistStore((s) => s.clearToast);

  const [winData, setWinData] = useState<WinData | null>(null);
  const [claimUid, setClaimUid] = useState<string | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const safeType = useHeistStore((s) => s.safeType);

  const claimItem = useHeistStore((s) =>
    claimUid ? s.inventory.find((item) => item.uid === claimUid) ?? null : null
  );

  /* Telegram Mini App init + разблокировка аудио на первом жесте. */
  useEffect(() => {
    initTelegram();
    const unlock = () => sfx.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  /* Автоскрытие тостов. */
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, 2600);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!mounted) {
    return <SplashScreen />;
  }

  const handleSpinComplete = ({ prize, nearMiss }: { prize: PrizeItem; nearMiss: PrizeItem }) => {
    const uid = useHeistStore.getState().completeSpin(prize);
    setWinData({ prize, nearMiss, uid });
  };

  const handleCloseWin = () => {
    sfx.click();
    setWinData(null);
    setScreen('HUB');
  };

  return (
    <MobileFrame>
      <WantedHeader onSecretTap={() => setAdminOpen(true)} />

      <main className="relative flex flex-1 flex-col">
        <AnimatePresence mode="wait" initial={false}>
          {screen === 'HUB' && (
            <motion.div key="hub" {...SCREEN_TRANSITION} className="flex flex-1 flex-col">
              <HubScreen onOpenClaim={setClaimUid} />
            </motion.div>
          )}
          {screen === 'SCAN' && (
            <motion.div key="scan" {...SCREEN_TRANSITION} className="flex flex-1 flex-col">
              <BarcodeScanner />
            </motion.div>
          )}
          {screen === 'SPIN' && (
            <motion.div key="spin" {...SCREEN_TRANSITION} className="flex flex-1 flex-col">
              <HeistRoulette key={safeType} onComplete={handleSpinComplete} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Синтвейв-сетка у подножия */}
      <div className="synthwave-grid" aria-hidden />

      <footer className="relative z-10 mt-auto border-t border-white/5 bg-abyss/70 px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <p className="text-center text-[9px] uppercase tracking-[0.22em] text-white/25">
          hqd miami chase • demo build v1.0 • mock integration
        </p>
        <p className="mt-0.5 text-center text-[8.5px] leading-relaxed text-white/20">
          18+ • Демонстрация механики для питча. Не является азартной игрой или публичной офертой
        </p>
      </footer>

      {/* Модалки и оверлеи */}
      <WinModal
        open={winData !== null}
        prize={winData?.prize ?? null}
        nearMiss={winData?.nearMiss ?? null}
        onClose={handleCloseWin}
        onClaim={() => setClaimUid(winData?.uid ?? null)}
      />

      <AnimatePresence>
        {claimUid !== null && claimItem !== null && (
          <PartnerGateModal
            key={claimItem.uid}
            item={claimItem}
            onClose={() => {
              sfx.click();
              setClaimUid(null);
            }}
          />
        )}
      </AnimatePresence>

      <AdminDrawer open={adminOpen} onClose={() => setAdminOpen(false)} />

      {/* Тосты */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            className={`fixed inset-x-0 bottom-24 z-[320] mx-auto flex w-[85%] max-w-[380px] items-center gap-2.5 rounded-xl border px-4 py-3 text-[12px] font-semibold backdrop-blur-md ${
              toast.kind === 'error'
                ? 'border-red-400/50 bg-red-950/85 text-red-200'
                : toast.kind === 'success'
                  ? 'border-neon-green/50 bg-emerald-950/85 text-neon-green'
                  : 'border-neon-cyan/40 bg-cyan-950/80 text-cyan-100'
            }`}
            role="status"
          >
            {toast.kind === 'error' ? (
              <TriangleAlert size={16} className="shrink-0" />
            ) : toast.kind === 'success' ? (
              <Check size={16} className="shrink-0" strokeWidth={3} />
            ) : (
              <Info size={16} className="shrink-0" />
            )}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </MobileFrame>
  );
}
