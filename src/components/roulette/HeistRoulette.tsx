'use client';

/**
 * Экран рулетки: подтверждение кода ЧЗ, выбор сейфа, горизонтальная лента
 * из 45 карт. Взлом: CSS-переход 4.5c cubic-bezier + rAF-трекинг тиков и
 * вибрации, мигалки полиции, жесткий стоп в tape[38] с джиттером ±45px.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, Dices, Loader2 } from 'lucide-react';
import SafeSelector from '@/components/roulette/SafeSelector';
import PrizeIcon from '@/components/PrizeIcon';
import { FORCED_DROP_PRIZES, RARITY_META, getPool, getPrizeById } from '@/api/mockData';
import type { PrizeItem } from '@/api/types';
import { useHeistStore } from '@/store/useHeistStore';
import {
  SPIN_DURATION_MS,
  SPIN_EASING,
  WIN_INDEX,
  computeFinalTranslateX,
  generateRouletteTape,
  pointerCardIndex,
} from '@/utils/rouletteEngine';
import { sfx } from '@/utils/soundEffects';
import { hapticImpact, hapticSelection, hapticSuccess } from '@/utils/telegram';

interface HeistRouletteProps {
  onComplete: (result: { prize: PrizeItem; nearMiss: PrizeItem }) => void;
}

type Phase = 'READY' | 'SPINNING' | 'FINISHED';

/** Карточка приза на ленте. */
function RouletteCard({ prize }: { prize: PrizeItem }) {
  const meta = RARITY_META[prize.rarity];
  const isJackpot = prize.rarity === 'JACKPOT';
  return (
    <div
      className={`prize-card rc-${prize.rarity.toLowerCase()} ${
        isJackpot ? 'prize-card--jackpot' : ''
      } flex h-[168px] w-[130px] shrink-0 flex-col items-center px-2 pb-3.5 pt-3`}
    >
      {isJackpot && <div className="shimmer" />}
      <span
        className="mt-1 flex h-[46px] items-center"
        style={{ color: meta.color, filter: `drop-shadow(0 0 10px ${meta.glow})` }}
      >
        <PrizeIcon iconKey={prize.image} size={40} />
      </span>
      <span className="mt-2 line-clamp-2 min-h-[26px] px-0.5 text-center text-[10px] font-medium leading-tight text-white/85">
        {prize.title}
      </span>
      <span
        className="font-display mt-auto text-[14.5px]"
        style={{ color: meta.color, textShadow: `0 0 10px ${meta.glow}` }}
      >
        {prize.valueRub.toLocaleString('ru-RU')} ₽
      </span>
      <div className="rarity-bar absolute bottom-0 left-0 right-0" />
    </div>
  );
}

export default function HeistRoulette({ onComplete }: HeistRouletteProps) {
  const safeType = useHeistStore((s) => s.safeType);
  const setSafeType = useHeistStore((s) => s.setSafeType);
  const lastScan = useHeistStore((s) => s.lastScan);
  const demoScripted = useHeistStore((s) => s.admin.demoScripted);
  const forcedDrop = useHeistStore((s) => s.admin.forcedDrop);
  const boostMultiplier = useHeistStore((s) => s.boostMultiplier);

  const containerRef = useRef<HTMLDivElement>(null);
  const tapeRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishedRef = useRef(false);
  const spinningRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });

  const [phase, setPhase] = useState<Phase>('READY');
  const [tape, setTape] = useState<PrizeItem[]>(() => {
    const state = useHeistStore.getState();
    const result = generateRouletteTape({
      pool: getPool(state.safeType),
      safeType: state.safeType,
      spinIndex: state.inventory.length,
      boostMultiplier: state.boostMultiplier,
      demoScripted: state.admin.demoScripted,
    });
    return result.tape;
  });

  /* Уборка rAF/таймеров при размонтировании. */
  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
    },
    []
  );

  const startTickWatch = () => {
    const tapeEl = tapeRef.current;
    const container = containerRef.current;
    if (!tapeEl || !container) return;

    const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
    let lastIdx = pointerCardIndex(tapeEl.getBoundingClientRect().left, containerCenter);

    const step = () => {
      const idx = pointerCardIndex(tapeEl.getBoundingClientRect().left, containerCenter);
      if (idx !== lastIdx) {
        lastIdx = idx;
        sfx.tick();
        hapticSelection();
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const handleSpinStart = () => {
    if (spinningRef.current) return;
    spinningRef.current = true;
    finishedRef.current = false;
    setPhase('SPINNING');
    sfx.click();
    sfx.siren();
    hapticImpact('medium');

    const state = useHeistStore.getState();
    const forcedPrize = forcedDrop ? getPrizeById(FORCED_DROP_PRIZES[forcedDrop]) ?? null : null;
    const result = generateRouletteTape({
      pool: getPool(safeType),
      safeType,
      spinIndex: state.inventory.length,
      forcedPrize,
      boostMultiplier: state.boostMultiplier,
      demoScripted: state.admin.demoScripted,
    });

    setTape(result.tape);

    // Ждем коммита новой ленты в DOM, затем сброс позиции и запуск перехода.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const tapeEl = tapeRef.current;
        const container = containerRef.current;
        if (!tapeEl || !container) return;

        const finalX = computeFinalTranslateX(container.clientWidth, result.offset);

        tapeEl.style.transition = 'none';
        tapeEl.style.transform = 'translateX(0px)';
        void tapeEl.offsetWidth; // принудительный reflow для старта перехода с нуля

        tapeEl.style.transition = `transform ${SPIN_DURATION_MS}ms ${SPIN_EASING}`;
        tapeEl.style.transform = `translateX(${finalX}px)`;

        startTickWatch();

        const finish = () => {
          if (finishedRef.current) return;
          finishedRef.current = true;
          tapeEl.removeEventListener('transitionend', onTransitionEnd);
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          if (safetyTimerRef.current) {
            clearTimeout(safetyTimerRef.current);
            safetyTimerRef.current = null;
          }
          spinningRef.current = false;
          setPhase('FINISHED');
          hapticSuccess();
          onCompleteRef.current({ prize: result.targetPrize, nearMiss: result.nearMissPrize });
        };

        const onTransitionEnd = (event: TransitionEvent) => {
          if (event.target !== tapeEl || event.propertyName !== 'transform') return;
          finish();
        };

        tapeEl.addEventListener('transitionend', onTransitionEnd);
        safetyTimerRef.current = setTimeout(finish, SPIN_DURATION_MS + 500);
      });
    });
  };

  const spinning = phase === 'SPINNING';
  const batchLabel = lastScan?.isSamokatBatch ? 'Самокат' : 'Розница';

  return (
    <div className="relative flex flex-1 flex-col px-5 pb-5">
      {/* Плашка подтверждения банки */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="panel mt-3 flex items-center gap-2.5 px-3.5 py-2.5"
      >
        <BadgeCheck size={19} className="shrink-0 text-neon-green" />
        <p className="text-[11px] leading-snug text-white/75">
          Код ЧЗ подтвержден <span className="text-white/40">(Партия: {batchLabel})</span> •{' '}
          <span className="neon-gold font-bold">+1 Звезда розыска!</span>
        </p>
      </motion.div>

      <SafeSelector
        value={safeType}
        onChange={setSafeType}
        disabled={spinning}
        className="mt-4"
      />

      {/* Окно рулетки */}
      <motion.div
        animate={spinning ? { x: [0, -2, 2, -1, 1, 0] } : { x: 0 }}
        transition={{ duration: 0.55 }}
        className="relative mt-4"
      >
        <div
          ref={containerRef}
          className="tape-mask relative h-[192px] overflow-hidden rounded-2xl border border-white/10 bg-abyss-deep/70"
          aria-label="Лента рулетки с призами"
        >
          <div
            ref={tapeRef}
            className="absolute left-0 top-3 flex will-change-transform"
            style={{ transform: 'translateX(0px)', gap: '10px' }}
          >
            {tape.map((prize, index) => (
              <RouletteCard key={`${prize.id}-${index}`} prize={prize} />
            ))}
          </div>

          <div className={`police-overlay ${spinning ? 'on' : ''}`} aria-hidden />

          <div className="tape-pointer" aria-hidden />
        </div>
      </motion.div>

      <p className="mt-2 text-center text-[9px] uppercase tracking-[0.22em] text-white/25">
        {demoScripted ? 'demo script включен • прокрут по сценарию' : 'честный рандом • weighted drop'}
      </p>

      {/* Кнопка взлома */}
      <div className="mt-auto pt-4">
        <button
          type="button"
          onClick={handleSpinStart}
          disabled={phase !== 'READY'}
          className="btn-heist flex h-14 w-full items-center justify-center gap-2.5 font-display text-[14px] uppercase tracking-wider"
        >
          {spinning ? (
            <>
              <Loader2 size={19} className="animate-spin" />
              Взлом замка...
            </>
          ) : (
            <>
              <Dices size={20} strokeWidth={2.1} />
              Взломать сейф
            </>
          )}
        </button>
        <p className="mt-2 text-center text-[9.5px] text-white/25">
          Лента разгонится и замрет под золотым прицелом. Один взлом — один приз
        </p>
      </div>
    </div>
  );
}
