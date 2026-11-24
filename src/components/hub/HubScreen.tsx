'use client';

/**
 * Главный хаб: ретро-солнце, левитирующая банка, CTA-кнопки сканирования
 * и тест-скана, лента инвентаря.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ShieldCheck, Zap } from 'lucide-react';
import HqdCan from '@/components/layout/HqdCan';
import InventoryStrip from '@/components/hub/InventoryStrip';
import { useHeistStore } from '@/store/useHeistStore';
import { cleanGs1String, generateDemoCode, parseDatamatrix } from '@/utils/datamatrixParser';
import { sfx } from '@/utils/soundEffects';
import { hapticSuccess } from '@/utils/telegram';

interface HubScreenProps {
  onOpenClaim: (uid: string) => void;
}

export default function HubScreen({ onOpenClaim }: HubScreenProps) {
  const stars = useHeistStore((s) => s.stars);
  const boostMultiplier = useHeistStore((s) => s.boostMultiplier);
  const boostDeadline = useHeistStore((s) => s.boostDeadline);
  const setScreen = useHeistStore((s) => s.setScreen);
  const registerScan = useHeistStore((s) => s.registerScan);

  const [demoChecking, setDemoChecking] = useState(false);
  const boosted = boostDeadline !== null && boostDeadline > Date.now();

  const handleScan = () => {
    sfx.click();
    setScreen('SCAN');
  };

  /** Тест-скан без банки: демо-код ЧЗ + мгновенная проверка за 0.3 c. */
  const handleDemoScan = () => {
    if (demoChecking) return;
    setDemoChecking(true);
    sfx.click();

    const rawCode = generateDemoCode();
    const parsed = parseDatamatrix(rawCode, useHeistStore.getState().usedCodes);

    window.setTimeout(() => {
      if (parsed.valid) {
        sfx.scanSuccess();
        hapticSuccess();
        registerScan({
          code: cleanGs1String(rawCode),
          gtin: parsed.gtin ?? '',
          isSamokatBatch: parsed.isSamokatBatch ?? true,
        });
      } else {
        sfx.error();
        setDemoChecking(false);
      }
    }, 300);
  };

  return (
    <div className="relative flex flex-1 flex-col">
      {/* Hero-зона с ретро-солнцем */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 pb-2 pt-6">
        <div className="retro-sun top-4" aria-hidden />

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 160, damping: 18 }}
          className="relative z-10 mt-6"
        >
          <HqdCan boostMultiplier={boostMultiplier} boosted={boosted} />
        </motion.div>

        {stars >= 5 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative z-10 mt-5 flex items-center gap-1.5 rounded-full border border-neon-gold/50 bg-neon-gold/10 px-4 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-neon-gold shadow-[0_0_22px_rgba(255,215,0,0.25)]"
          >
            <ShieldCheck size={13} />
            Золотой Сейф: разблокирован
          </motion.div>
        )}

        <p className="relative z-10 mt-4 max-w-[290px] text-center text-[11px] leading-relaxed text-white/45">
          Каждая банка HQD Energy = +1 звезда розыска = один взлом сейфа с кейками
          CS2 или кэшем по СБП
        </p>
      </div>

      {/* Панель действий */}
      <div className="relative z-10 px-5">
        <button
          type="button"
          onClick={handleScan}
          className="btn-heist flex h-14 w-full items-center justify-center gap-2.5 font-display text-[14px] uppercase tracking-wider"
        >
          <Camera size={20} strokeWidth={2.2} />
          Сканировать код с банки
        </button>

        <button
          type="button"
          onClick={handleDemoScan}
          disabled={demoChecking}
          className="btn-cyber mt-3 flex h-12 w-full items-center justify-center gap-2 text-[12.5px] font-bold uppercase tracking-wider"
        >
          <Zap size={16} className="text-neon-cyan" strokeWidth={2.4} />
          {demoChecking ? 'Проверка кода...' : 'Тест-скан (демо без банки)'}
        </button>

        <p className="mt-2.5 text-center text-[9.5px] uppercase tracking-[0.18em] text-white/25">
          честный знак • gs1 datamatrix • партия самокат
        </p>
      </div>

      <div className="mt-3">
        <InventoryStrip onOpenClaim={onOpenClaim} />
      </div>
    </div>
  );
}
