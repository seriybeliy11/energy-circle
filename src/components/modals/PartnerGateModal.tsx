'use client';

/**
 * ЗАГЛУШКА ИНТЕГРАЦИИ (PartnerGate): выдача промокода гейминговым партнером
 * (Case-Battle / Kupikod / Forcedrop / свой) или кэш-выплата по СБП с маской
 * телефона, верификацией чека от 500 руб и подтверждением заявки.
 * Режим интеграции: MOCK_DEMO (SANDBOX).
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import type { ClaimResult, InventoryItem } from '@/api/types';
import { claimPrize, resolvePartnerName } from '@/api/prizeProvider';
import { useHeistStore } from '@/store/useHeistStore';
import { sfx } from '@/utils/soundEffects';
import { hapticSelection, hapticSuccess } from '@/utils/telegram';

interface PartnerGateModalProps {
  item: InventoryItem;
  onClose: () => void;
}

type ViewKind = 'connecting' | 'promo' | 'sbp-form' | 'sbp-pending' | 'sbp-done' | 'error';

/** Маска телефона +7 (XXX) XXX-XX-XX из сырого ввода. */
function formatPhone(input: string): string {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (digits.length > 0 && !digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += ')';
  if (rest.length > 3) out += ` ${rest.slice(3, 6)}`;
  if (rest.length > 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length > 8) out += `-${rest.slice(8, 10)}`;
  return out;
}

function pad2(value: number): string {
  return value.toString().padStart(2, '0');
}

function claimLifeLeft(claim: ClaimResult): string {
  const deadline = claim.expiresAt ?? Date.now() + claim.expiresInSeconds * 1000;
  const diff = Math.max(0, deadline - Date.now());
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

export default function PartnerGateModal({ item, onClose }: PartnerGateModalProps) {
  const adminPartner = useHeistStore((s) => s.admin.partner);
  const adminCustomName = useHeistStore((s) => s.admin.partnerCustomName);
  const markClaimed = useHeistStore((s) => s.markClaimed);

  const isCash = item.deliveryType === 'SBP_PAYOUT';
  const partnerName = resolvePartnerName(item, adminPartner, adminCustomName);

  /* Каждое открытие шлюза - новая сессия: начальное состояние выводится из предмета. */
  const [view, setView] = useState<ViewKind>(() => {
    if (item.claim) return isCash ? 'sbp-done' : 'promo';
    return isCash ? 'sbp-form' : 'connecting';
  });
  const [claim, setClaim] = useState<ClaimResult | null>(item.claim ?? null);
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('+7');
  const [receiptName, setReceiptName] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [gateError, setGateError] = useState('');
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Запуск выдачи промокода (гейминговый шлюз). */
  const runPromoClaim = async (target: InventoryItem) => {
    setView('connecting');
    try {
      const [result] = await Promise.all([
        claimPrize({
          prizeId: target.prizeId,
          partnerName,
          deliveryType: target.deliveryType,
        }),
        new Promise((resolve) => setTimeout(resolve, 700)),
      ]);
      markClaimed(target.uid, result);
      setClaim(result);
      setView('promo');
      sfx.coin();
      hapticSuccess();
    } catch (e) {
      setGateError(e instanceof Error ? e.message : 'Шлюз партнера недоступен');
      setView('error');
      sfx.error();
    }
  };

  /* Запуск выдачи промокода для незабранного гейминг-приза (один раз на сессию). */
  useEffect(() => {
    if (item.claim || isCash) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void runPromoClaim(item);
    }, 50);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  useEffect(
    () => () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    },
    []
  );

  const handleCopy = async () => {
    const code = claim?.promoCode;
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const area = document.createElement('textarea');
      area.value = code;
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand('copy');
      } catch {
        /* некоторые вебвью без execCommand */
      }
      document.body.removeChild(area);
    }
    sfx.click();
    hapticSelection();
    setCopied(true);
    if (copiedTimer.current) clearTimeout(copiedTimer.current);
    copiedTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitPayout = async () => {
    if (view !== 'sbp-form') return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11 || !digits.startsWith('7')) {
      setFormError('Введи номер полностью: +7 (XXX) XXX-XX-XX');
      sfx.error();
      return;
    }
    if (item.valueRub >= 500 && !receiptName) {
      setFormError('Для защиты от считывания кодов прикрепи скриншот чека из Самоката');
      sfx.error();
      return;
    }

    setFormError(null);
    setView('sbp-pending');

    try {
      const [result] = await Promise.all([
        claimPrize({
          prizeId: item.prizeId,
          partnerName,
          deliveryType: item.deliveryType,
          phone: `+${digits}`,
          receiptUploaded: Boolean(receiptName),
        }),
        new Promise((resolve) => setTimeout(resolve, 1200)),
      ]);
      markClaimed(item.uid, result);
      setClaim(result);
      sfx.coin();
      hapticSuccess();
      setView('sbp-done');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Шлюз недоступен';
      setGateError(message);
      setFormError(message);
      sfx.error();
      setView('sbp-form');
    }
  };

  const handleOpenPartner = () => {
    sfx.coin();
    hapticSuccess();
    setConfirmed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Партнерский шлюз"
    >
          <motion.div
            initial={{ y: 90, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 70, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 270, damping: 26 }}
            className="panel scroll-y-neon relative max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl px-5 pb-6 pt-4 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-3.5 top-3.5 z-10 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/50 transition active:scale-90"
              aria-label="Закрыть"
            >
              <X size={17} />
            </button>

            {/* Шапка шлюза */}
            <div className="flex items-center gap-2 pr-10">
              <ShieldCheck size={18} className="shrink-0 text-neon-cyan" />
              <h2 className="font-display text-[13px] uppercase leading-tight tracking-wide text-white/90">
                Партнерский шлюз
              </h2>
            </div>
            <p className="mt-1 text-[12.5px] font-bold text-neon-cyan">{partnerName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full border border-neon-green/40 bg-neon-green/10 px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-neon-green">
                <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-neon-green" />
                status: ready (sandbox)
              </span>
              <span className="chip px-2.5 py-1 text-[9.5px] font-bold uppercase tracking-wider text-white/50">
                mock_demo
              </span>
            </div>

            <div className="mt-4">
              {/* === Подключение к шлюзу === */}
              {view === 'connecting' && (
                <div className="flex flex-col items-center gap-3 py-8">
                  <Loader2 size={30} className="animate-spin text-neon-cyan" />
                  <p className="text-center text-[12px] text-white/60">
                    Установка защищенного канала с {partnerName}...
                  </p>
                </div>
              )}

              {/* === Ошибка шлюза === */}
              {view === 'error' && (
                <div className="flex flex-col items-center gap-3 py-6">
                  <p className="text-center text-[12.5px] text-red-300">{gateError}</p>
                  <button
                    type="button"
                    onClick={() => void runPromoClaim(item)}
                    className="btn-cyber px-5 py-2 text-[11.5px] font-bold uppercase tracking-wider"
                  >
                    Повторить попытку
                  </button>
                </div>
              )}

              {/* === Промокод / Deep-link === */}
              {view === 'promo' && claim && (
                <div>
                  <p className="text-center text-[11px] text-white/50">
                    Приз: <span className="font-semibold text-white/85">{item.title}</span> •{' '}
                    {item.valueRub.toLocaleString('ru-RU')} ₽
                  </p>

                  <div className="code-box mt-3 px-4 py-4 text-center">
                    <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">
                      твой ключ активации
                    </p>
                    <p className="mt-1.5 break-all font-display text-[17px] text-neon-cyan">
                      {claim.promoCode}
                    </p>
                    {claim.expiresAt && (
                      <p className="mt-1.5 text-[10px] text-white/40">
                        Код активен 24 часа • осталось {claimLifeLeft(claim)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="btn-heist mt-3 flex h-12 w-full items-center justify-center gap-2 text-[13px] font-bold uppercase tracking-wider"
                  >
                    {copied ? (
                      <>
                        <Check size={17} strokeWidth={3} />
                        Скопировано!
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        Скопировать
                      </>
                    )}
                  </button>

                  {/* Три шага активации */}
                  <ol className="mt-4 space-y-2">
                    {claim.instructions.map((step, index) => (
                      <li key={index} className="flex items-start gap-2.5">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-neon-purple/50 bg-neon-purple/15 font-display text-[10px] text-neon-purple">
                          {index + 1}
                        </span>
                        <span className="text-[11.5px] leading-snug text-white/70">{step}</span>
                      </li>
                    ))}
                  </ol>

                  <button
                    type="button"
                    onClick={handleOpenPartner}
                    disabled={confirmed}
                    className="btn-cyber mt-4 flex h-12 w-full items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider"
                  >
                    <ExternalLink size={15} className="text-neon-cyan" />
                    {item.deliveryType === 'DEEP_LINK'
                      ? 'Перейти на площадку партнера'
                      : 'Открыть кейс у партнера'}
                  </button>

                  <AnimatePresence>
                    {confirmed && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-3 flex items-start gap-2.5 rounded-xl border border-neon-green/40 bg-neon-green/[0.07] px-3.5 py-3"
                      >
                        <Check size={16} className="mt-0.5 shrink-0 text-neon-green" />
                        <p className="text-[11px] leading-snug text-white/75">
                          <span className="font-bold text-neon-green">SANDBOX:</span> переход
                          подтвержден. В продакшене кнопка откроет {partnerName} с меткой{' '}
                          <span className="font-mono text-[10px] text-neon-cyan">
                            utm_source=hqd_samokat
                          </span>
                          {claim.redirectUrl ? (
                            <>
                              {' '}
                              <span className="block break-all font-mono text-[9.5px] text-white/40">
                                {claim.redirectUrl}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {item.claim && (
                    <p className="mt-3 text-center text-[10px] text-white/35">
                      Код уже был выдан ранее и сохранен в инвентаре
                    </p>
                  )}
                </div>
              )}

              {/* === СБП: форма выплаты === */}
              {view === 'sbp-form' && (
                <div>
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5">
                    <span className="text-[11.5px] text-white/70">{item.title}</span>
                    <span className="font-display text-[14px] text-neon-green">
                      {item.valueRub.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>

                  <label className="mt-4 block text-[10px] font-bold uppercase tracking-wider text-white/50">
                    Номер телефона для выплаты
                  </label>
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      setPhone(formatPhone(e.target.value));
                      if (formError) setFormError(null);
                    }}
                    placeholder="+7 (___) ___-__-__"
                    className="mt-1.5 h-12 w-full rounded-xl border border-neon-cyan/30 bg-abyss-deep/60 px-4 font-display text-[16px] tracking-wider text-neon-cyan outline-none transition placeholder:text-white/20 focus:border-neon-cyan/70 focus:shadow-[0_0_18px_rgba(0,240,255,0.15)]"
                    aria-label="Номер телефона"
                  />

                  {item.valueRub >= 500 && (
                    <div className="mt-3">
                      <label
                        className="upload-box flex cursor-pointer items-center gap-3 px-3.5 py-3"
                        aria-label="Загрузить скриншот чека"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReceiptName(file.name);
                              if (formError) setFormError(null);
                            }
                          }}
                        />
                        {receiptName ? (
                          <>
                            <Check size={18} className="shrink-0 text-neon-green" />
                            <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-neon-green">
                              Чек прикреплен: {receiptName}
                            </span>
                          </>
                        ) : (
                          <>
                            <Receipt size={18} className="shrink-0 text-miami" />
                            <span className="text-[11px] leading-snug text-white/60">
                              Для защиты от считывания кодов в магазине прикрепите скриншот чека
                              из Самоката
                            </span>
                          </>
                        )}
                      </label>
                    </div>
                  )}

                  {formError && (
                    <p className="mt-3 rounded-lg border border-red-400/40 bg-red-950/60 px-3 py-2 text-[11px] font-semibold text-red-300">
                      {formError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleSubmitPayout()}
                    className="btn-heist mt-4 flex h-[52px] w-full items-center justify-center gap-2 font-display text-[13.5px] uppercase tracking-wider"
                  >
                    Вывести на карту
                  </button>
                  <p className="mt-2 text-center text-[9.5px] text-white/30">
                    Выплата через СБП Шлюз • зачисление до 2 минут
                  </p>
                </div>
              )}

              {/* === СБП: отправка заявки === */}
              {view === 'sbp-pending' && (
                <div className="flex flex-col items-center gap-3 py-9">
                  <Loader2 size={30} className="animate-spin text-neon-green" />
                  <p className="text-center text-[12px] text-white/60">
                    Отправляем заявку в СБП Шлюз...
                  </p>
                </div>
              )}

              {/* === СБП: заявка принята === */}
              {view === 'sbp-done' && claim && (
                <div className="flex flex-col items-center py-4">
                  <motion.div
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 16 }}
                    className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-neon-green/60 bg-neon-green/10 shadow-[0_0_30px_rgba(46,255,154,0.35)]"
                  >
                    <Check size={30} className="text-neon-green" strokeWidth={3} />
                  </motion.div>
                  <p className="mt-4 text-center font-display text-[15px] text-white">
                    Заявка #{claim.claimId ?? '4092'} принята!
                  </p>
                  <p className="mt-1.5 max-w-[280px] text-center text-[11.5px] leading-snug text-white/60">
                    {claim.message ??
                      'Выплата по СБП поступит в течение 2 минут на указанный номер телефона'}
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="btn-cyber mt-5 px-6 py-2.5 text-[12px] font-bold uppercase tracking-wider"
                  >
                    Отлично!
                  </button>
                </div>
              )}
            </div>
          </motion.div>
    </motion.div>
  );
}
