'use client';

/**
 * Экран выигрыша: конфетти, пружинная карточка приза, блок "Почти выиграл"
 * (Near Miss), прогресс до 5-й звезды, живой FOMO-таймер буста и три
 * кнопки дожима: забрать приз, заказать в Самокате, собрать банду.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Clock, ShoppingBag, TriangleAlert, Users, X, Zap } from 'lucide-react';
import PrizeIcon from '@/components/PrizeIcon';
import { RARITY_META, SAMOKAT_SHOP_URL } from '@/api/mockData';
import type { PrizeItem } from '@/api/types';
import { useHeistStore } from '@/store/useHeistStore';
import { sfx } from '@/utils/soundEffects';
import { hapticSuccess, openExternal, openShare } from '@/utils/telegram';

interface WinModalProps {
  open: boolean;
  prize: PrizeItem | null;
  nearMiss: PrizeItem | null;
  onClose: () => void;
  onClaim: () => void;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function fireConfetti() {
  const colors = ['#FFD700', '#FF2A85', '#00F0FF', '#A855F7'];
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors,
    zIndex: 400,
    disableForReducedMotion: true,
  });
  window.setTimeout(() => {
    confetti({
      particleCount: 45,
      spread: 110,
      origin: { y: 0.5 },
      colors,
      zIndex: 400,
      scalar: 0.85,
      disableForReducedMotion: true,
    });
  }, 280);
}

const INVITE_TEXT =
  'Ограбляю сейфы в HQD MIAMI CHASE! Кейсы CS2 и кэш по СБП за коды Честного знака с банок HQD Energy. Заходи в банду — дам бесплатный кейс!';

export default function WinModal({ open, prize, nearMiss, onClose, onClaim }: WinModalProps) {
  const stars = useHeistStore((s) => s.stars);
  const boostDeadline = useHeistStore((s) => s.boostDeadline);
  const claimFreeCase = useHeistStore((s) => s.claimFreeCase);
  const showToast = useHeistStore((s) => s.showToast);

  const [timer, setTimer] = useState('24:00:00');

  /* Конфетти + победный звук при открытии. */
  useEffect(() => {
    if (!open) return;
    fireConfetti();
    sfx.win();
    hapticSuccess();
  }, [open]);

  /* Живой FOMO-таймер буста. */
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const deadline = useHeistStore.getState().boostDeadline;
      if (!deadline) {
        setTimer('00:00:00');
        return;
      }
      const diff = Math.max(0, deadline - Date.now());
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setTimer(`${pad2(h)}:${pad2(m)}:${pad2(s)}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const handleClaim = () => {
    sfx.click();
    onClaim();
  };

  const handleSamokat = () => {
    sfx.click();
    openExternal(SAMOKAT_SHOP_URL);
  };

  const handleInviteGang = () => {
    sfx.click();
    openShare(INVITE_TEXT);
    const granted = claimFreeCase();
    showToast(
      granted
        ? 'Бесплатный кейс добавлен в твой лут!'
        : 'Бесплатный кейс уже забран ранее',
      granted ? 'success' : 'info'
    );
  };

  const meta = prize ? RARITY_META[prize.rarity] : null;

  return (
    <AnimatePresence>
      {open && prize && meta && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label="Выигрыш"
        >
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.92 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="panel scroll-y-neon relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-4 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3.5 top-3.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition active:scale-90"
              aria-label="Закрыть"
            >
              <X size={17} />
            </button>

            <p className="text-center text-[10px] uppercase tracking-[0.35em] text-neon-cyan/80">
              ограбление удалось
            </p>

            {/* Карточка приза */}
            <motion.div
              initial={{ scale: 0.5, rotate: -4 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 15, delay: 0.1 }}
              className={`prize-card rc-${prize.rarity.toLowerCase()} ${
                prize.rarity === 'JACKPOT' ? 'prize-card--jackpot' : ''
              } mx-auto mt-4 flex w-full max-w-[300px] flex-col items-center px-5 pb-5 pt-6`}
            >
              {prize.rarity === 'JACKPOT' && <div className="shimmer" />}
              <span
                className="mb-1 text-[9.5px] font-bold uppercase tracking-[0.25em]"
                style={{ color: meta.color, textShadow: `0 0 10px ${meta.glow}` }}
              >
                {meta.label}
              </span>
              <span
                className="my-2 flex h-[74px] items-center"
                style={{ color: meta.color, filter: `drop-shadow(0 0 16px ${meta.glow})` }}
              >
                <PrizeIcon iconKey={prize.image} size={68} />
              </span>
              <h2 className="text-center font-display text-[16px] leading-snug text-white">
                {prize.title}
              </h2>
              <p
                className="font-display mt-1.5 text-[26px]"
                style={{ color: meta.color, textShadow: `0 0 16px ${meta.glow}` }}
              >
                {prize.valueRub.toLocaleString('ru-RU')} ₽
              </p>
              <div className="rarity-bar absolute bottom-0 left-0 right-0" />
            </motion.div>

            {/* Near Miss: обязательный блок "почти взял джекпот" */}
            {nearMiss && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="mt-4 rounded-xl border border-miami/45 bg-miami/[0.07] px-3.5 py-3"
              >
                <div className="flex items-start gap-2.5">
                  <TriangleAlert size={17} className="mt-0.5 shrink-0 text-miami" />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-miami">
                      Охрана была в шаге!
                    </p>
                    <p className="mt-1 text-[11.5px] leading-snug text-white/75">
                      Рядом лежал приз:{' '}
                      <span className="font-semibold text-white">{nearMiss.title}</span> (
                      {nearMiss.valueRub.toLocaleString('ru-RU')} ₽)
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Прогресс до 5-й звезды + буст */}
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              <div className="flex items-center justify-between text-[10.5px] font-semibold text-white/70">
                <span>
                  До 5-й звезды:{' '}
                  <span className="neon-gold">{Math.max(0, 5 - stars)} банк(и)</span>
                </span>
                <span>
                  {stars}/5
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                <div className="gold-progress h-full" style={{ width: `${(stars / 5) * 100}%` }} />
              </div>
              <p className="mt-2.5 text-[11px] leading-snug text-white/60">
                Закажи еще 1 банку HQD Miami Chase в Самокате в течение 24 часов и получи{' '}
                <span className="neon-gold font-bold">буст x2.5</span> к шансу на джекпот!
              </p>
            </div>

            {/* FOMO-таймер */}
            <div className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-neon-gold/30 bg-neon-gold/[0.06] px-4 py-2.5">
              <Clock size={14} className="text-neon-gold" />
              <span className="text-[11px] text-white/65">Буст сгорит через:</span>
              <span className="fomo-timer font-display text-[15px] text-neon-gold">{timer}</span>
            </div>

            {/* Кнопки дожима */}
            <div className="mt-5 space-y-2.5">
              <button
                type="button"
                onClick={handleClaim}
                className="btn-heist flex h-[52px] w-full items-center justify-center gap-2 font-display text-[13.5px] uppercase tracking-wider"
              >
                <Zap size={17} strokeWidth={2.3} />
                Забрать приз
              </button>
              <button
                type="button"
                onClick={handleSamokat}
                className="btn-cyber flex h-[46px] w-full items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider"
              >
                <ShoppingBag size={15} className="text-neon-cyan" />
                Заказать еще в Самокате
              </button>
              <button
                type="button"
                onClick={handleInviteGang}
                className="btn-cyber flex h-[46px] w-full items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider"
              >
                <Users size={15} className="text-neon-purple" />
                Собрать банду (+1 бесплатный кейс)
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
