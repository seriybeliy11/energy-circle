'use client';

/**
 * Скрытая панель управления демо (открывается 5 тапами по логотипу HQD):
 * смена бренда партнера, подкрутка следующего прокрута, тумблер
 * демо-скрипта, статистика выдач через шлюз и сброс прогресса.
 */

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, HandCoins, Radio, RotateCcw, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { ClaimHistoryEntry, ForcedDropId, PartnerBrandId } from '@/api/types';
import { FORCED_DROP_PRIZES, PARTNER_BRANDS, getPrizeById } from '@/api/mockData';
import { fetchClaimHistory, INTEGRATION_MODE } from '@/api/prizeProvider';
import { useHeistStore } from '@/store/useHeistStore';
import { sfx } from '@/utils/soundEffects';
import { hapticSelection } from '@/utils/telegram';

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
}

const FORCED_OPTIONS: { id: ForcedDropId | null; label: string }[] = [
  { id: null, label: 'Авто (Скрипт)' },
  { id: 'SKIN_CS2', label: 'Выбить Скин CS2' },
  { id: 'CASH_500', label: 'Выбить Кэш 500 ₽' },
  { id: 'JACKPOT_50K', label: 'Выбить Джекпот 50 000 ₽' },
];

export default function AdminDrawer({ open, onClose }: AdminDrawerProps) {
  const admin = useHeistStore((s) => s.admin);
  const stars = useHeistStore((s) => s.stars);
  const scansCount = useHeistStore((s) => s.scansCount);
  const setAdminPartner = useHeistStore((s) => s.setAdminPartner);
  const setForcedDrop = useHeistStore((s) => s.setForcedDrop);
  const setSafeType = useHeistStore((s) => s.setSafeType);
  const toggleDemoScripted = useHeistStore((s) => s.toggleDemoScripted);
  const resetProgress = useHeistStore((s) => s.resetProgress);
  const showToast = useHeistStore((s) => s.showToast);

  const [history, setHistory] = useState<ClaimHistoryEntry[]>([]);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleClose = () => {
    setConfirmReset(false);
    onClose();
  };

  /* Статистика выдач при каждом открытии. */
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchClaimHistory().then((claims) => {
      if (!cancelled) setHistory(claims);
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleForced = (id: ForcedDropId | null) => {
    sfx.click();
    hapticSelection();
    setForcedDrop(id);
    if (id) {
      const prize = getPrizeById(FORCED_DROP_PRIZES[id]);
      if (prize) setSafeType(prize.category);
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      sfx.click();
      return;
    }
    resetProgress();
    setConfirmReset(false);
    showToast('Прогресс сброшен до стартового состояния', 'success');
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="panel scroll-y-neon fixed inset-x-0 bottom-0 z-[150] mx-auto flex max-h-[88dvh] w-full max-w-[430px] flex-col overflow-y-auto rounded-t-3xl border-t-2 border-neon-purple/40 px-5 pb-7 pt-3"
            role="dialog"
            aria-modal="true"
            aria-label="Панель управления демо"
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-white/20" />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio size={16} className="text-miami" />
                <h2 className="font-display text-[13px] uppercase tracking-[0.15em] text-white/90">
                  Панель демо
                </h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition active:scale-90"
                aria-label="Закрыть панель"
              >
                <X size={16} />
              </button>
            </div>

            {/* Бренд партнера */}
            <section className="mt-5">
              <h3 className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/40">
                Бренд партнера в заглушке выдачи
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {PARTNER_BRANDS.map((brand) => {
                  const active = admin.partner === brand.id;
                  return (
                    <button
                      key={brand.id}
                      type="button"
                      onClick={() => {
                        sfx.click();
                        setAdminPartner(brand.id as PartnerBrandId);
                      }}
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                        active
                          ? 'border-miami/70 bg-miami/20 text-white shadow-[0_0_14px_rgba(255,42,133,0.3)]'
                          : 'border-white/12 bg-white/[0.03] text-white/50'
                      }`}
                    >
                      {brand.name}
                    </button>
                  );
                })}
              </div>
              {admin.partner === 'custom' && (
                <input
                  type="text"
                  value={admin.partnerCustomName}
                  onChange={(e) => setAdminPartner('custom', e.target.value)}
                  placeholder="Название партнера для показа"
                  maxLength={24}
                  className="mt-2 h-10 w-full rounded-xl border border-neon-cyan/30 bg-abyss-deep/60 px-3.5 text-[12.5px] text-white/85 outline-none placeholder:text-white/25 focus:border-neon-cyan/70"
                  aria-label="Своё название партнера"
                />
              )}
            </section>

            {/* Форс следующего прокрута */}
            <section className="mt-5">
              <h3 className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/40">
                Следующий прокрут
              </h3>
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                {FORCED_OPTIONS.map((option) => {
                  const active = admin.forcedDrop === option.id;
                  return (
                    <button
                      key={option.label}
                      type="button"
                      onClick={() => handleForced(option.id)}
                      className={`flex h-[42px] items-center justify-center rounded-xl border text-[11px] font-semibold transition active:scale-[0.97] ${
                        active
                          ? 'border-neon-gold/60 bg-neon-gold/15 text-neon-gold shadow-[0_0_16px_rgba(255,215,0,0.2)]'
                          : 'border-white/12 bg-white/[0.03] text-white/50'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
              {admin.forcedDrop && (
                <p className="mt-2 text-[10px] text-neon-gold/80">
                  Форс применится к следующему прокруту и будет снят после него
                </p>
              )}
            </section>

            {/* Тумблеры */}
            <section className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
                <div>
                  <p className="text-[12px] font-semibold text-white/80">Демо-скрипт</p>
                  <p className="text-[10px] text-white/40">
                    1-й прокрут: 150-300 ₽, 2-й: 500 ₽, 5-й: джекпот-шанс
                  </p>
                </div>
                <Switch
                  checked={admin.demoScripted}
                  onCheckedChange={() => {
                    sfx.click();
                    toggleDemoScripted();
                  }}
                  aria-label="Демо-скрипт"
                />
              </div>
            </section>

            {/* Статистика шлюза */}
            <section className="mt-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[9.5px] font-bold uppercase tracking-[0.22em] text-white/40">
                  Статистика шлюза
                </h3>
                <span className="chip px-2 py-0.5 text-[9px] font-bold uppercase text-white/45">
                  {INTEGRATION_MODE}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2.5">
                  <p className="font-display text-[16px] text-white">{history.length}</p>
                  <p className="mt-0.5 text-[8.5px] uppercase tracking-wider text-white/40">
                    выдач
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2.5">
                  <p className="font-display text-[16px] text-neon-gold">{stars}</p>
                  <p className="mt-0.5 text-[8.5px] uppercase tracking-wider text-white/40">
                    звезд
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] py-2.5">
                  <p className="font-display text-[16px] text-neon-cyan">{scansCount}</p>
                  <p className="mt-0.5 text-[8.5px] uppercase tracking-wider text-white/40">
                    сканов
                  </p>
                </div>
              </div>

              {history.length > 0 && (
                <div className="mt-2 space-y-1">
                  {history.slice(0, 4).map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-1.5 text-[10px]"
                    >
                      <span className="min-w-0 flex-1 truncate text-white/60">
                        {entry.prizeTitle}
                      </span>
                      <span className="ml-2 shrink-0 font-mono text-neon-cyan/70">
                        {entry.promoCode ?? 'СБП'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Сброс прогресса */}
            <section className="mt-6">
              {confirmReset ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn-danger h-11 flex-1 text-[11.5px] font-bold uppercase tracking-wider"
                  >
                    Да, снести все
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmReset(false)}
                    className="btn-cyber h-11 flex-1 text-[11.5px] font-bold uppercase tracking-wider"
                  >
                    Отмена
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-danger flex h-11 w-full items-center justify-center gap-2 text-[11.5px] font-bold uppercase tracking-wider"
                >
                  <RotateCcw size={14} />
                  Сбросить прогресс
                </button>
              )}
            </section>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[8.5px] uppercase tracking-[0.2em] text-white/25">
              <HandCoins size={10} />
              hqd miami chase • v1.0.0 • pitch build
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
