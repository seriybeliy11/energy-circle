'use client';

/**
 * Верхняя панель: логотип HQD x MIAMI CHASE (5 скрытых тапов открывают
 * админ-панель демо), бейдж Самокат Edition, шкала розыска из 5 звезд,
 * счетчики банок и баланса, переключатель звука.
 */

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Flame, Package, Star, Volume2, VolumeX, Wallet, Zap } from 'lucide-react';
import { selectBalance, useHeistStore } from '@/store/useHeistStore';
import { sfx } from '@/utils/soundEffects';
import { hapticImpact, hapticSelection } from '@/utils/telegram';

interface WantedHeaderProps {
  onSecretTap: () => void;
}

const SECRET_TAPS = 5;
const TAP_WINDOW_MS = 2500;

export default function WantedHeader({ onSecretTap }: WantedHeaderProps) {
  const stars = useHeistStore((s) => s.stars);
  const cansCount = useHeistStore((s) => s.usedCodes.length);
  const boostMultiplier = useHeistStore((s) => s.boostMultiplier);
  const boostDeadline = useHeistStore((s) => s.boostDeadline);
  const balance = useHeistStore(selectBalance);

  const [muted, setMuted] = useState(false);
  const [taps, setTaps] = useState(0);
  const tapsRef = useRef<number[]>([]);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMuted(sfx.isMuted());
    useHeistStore.getState().checkBoostExpiry();
  }, []);

  const handleLogoTap = () => {
    const now = Date.now();
    tapsRef.current = [...tapsRef.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    setTaps(tapsRef.current.length);
    sfx.click();
    hapticSelection();

    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => {
      tapsRef.current = [];
      setTaps(0);
    }, TAP_WINDOW_MS);

    if (tapsRef.current.length >= SECRET_TAPS) {
      tapsRef.current = [];
      setTaps(0);
      if (resetTimer.current) clearTimeout(resetTimer.current);
      hapticImpact('medium');
      onSecretTap();
    }
  };

  const toggleMute = () => {
    const next = !muted;
    sfx.setMuted(next);
    setMuted(next);
    if (!next) sfx.click();
  };

  const boosted = boostDeadline !== null && boostDeadline > Date.now();

  return (
    <header className="relative z-30 px-4 pt-3">
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={handleLogoTap}
          className="min-h-[44px] select-none text-left"
          aria-label="HQD MIAMI CHASE - логотип"
        >
          <motion.div
            key={taps}
            initial={{ scale: 0.94 }}
            animate={{ scale: 1 }}
            className="font-display text-[15px] leading-none tracking-wide"
          >
            <span className="neon-gold">HQD</span>
            <span className="mx-1 text-white/50">×</span>
            <span className="neon-pink">MIAMI CHASE</span>
          </motion.div>
          <div className="mt-1 text-[9px] uppercase tracking-[0.3em] text-white/35">
            heist lootbox
          </div>
          {taps > 0 && (
            <div className="mt-0.5 text-[10px] tracking-[0.4em] text-neon-cyan/80" aria-hidden>
              {'•'.repeat(taps)}
            </div>
          )}
        </button>

        <div className="flex items-center gap-1.5">
          <span className="chip flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider text-miami-orange">
            <Zap size={11} strokeWidth={2.5} className="text-neon-gold" />
            Самокат Edition
          </span>
          <button
            type="button"
            onClick={toggleMute}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition active:scale-90"
            aria-label={muted ? 'Включить звук' : 'Выключить звук'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} className="text-neon-cyan" />}
          </button>
        </div>
      </div>

      {/* Шкала розыска GTA */}
      <div className="mt-3 flex items-center justify-center gap-1.5" role="img" aria-label={`Уровень розыска: ${stars} из 5`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.15 + i * 0.07, type: 'spring', stiffness: 280, damping: 16 }}
          >
            <Star
              size={32}
              strokeWidth={1.6}
              className={i < stars ? 'star-lit' : 'star-dim'}
              fill={i < stars ? 'currentColor' : 'transparent'}
            />
          </motion.div>
        ))}
      </div>

      {stars >= 5 ? (
        <p className="neon-gold mt-1.5 text-center text-[11px] font-bold uppercase tracking-wider">
          Золотой сейф открыт — доступ к крупным дропам
        </p>
      ) : (
        <p className="mt-1.5 text-center text-[10.5px] leading-snug text-white/45">
          Уровень розыска: <span className="font-bold text-white/80">{stars}/5</span> • Собери 5 звезд
          для доступа к Золотому Сейфу
        </p>
      )}

      {/* Счетчики */}
      <div className="mt-2.5 flex items-center justify-center gap-2">
        <span className="chip flex items-center gap-1.5 px-3 py-1 text-[10.5px] font-semibold text-white/70">
          <Package size={12} className="text-neon-purple" />
          Банки: <span className="text-white">{cansCount}</span>
        </span>
        <span className="chip flex items-center gap-1.5 px-3 py-1 text-[10.5px] font-semibold text-white/70">
          <Wallet size={12} className="text-neon-green" />
          Баланс: <span className="text-white">{balance.toLocaleString('ru-RU')} ₽</span>
        </span>
        <span
          className={`chip flex items-center gap-1.5 px-3 py-1 text-[10.5px] font-bold ${
            boosted ? 'border-neon-gold/50 text-neon-gold' : 'text-white/70'
          }`}
        >
          <Flame size={12} />
          x{boostMultiplier}
        </span>
      </div>
    </header>
  );
}
