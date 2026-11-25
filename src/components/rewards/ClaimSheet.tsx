'use client';

// Шторка получения приза: промокод с копированием, инструкции,
// deep-link на партнёра или выплата по СБП с маской телефона.

import { useState } from 'react';
import { BadgeCheck, Check, Copy, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PrizeState } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { haptic } from '@/utils/telegram';
import { formatDateFull, formatRub } from './bits';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      return true;
    } catch {
      return false;
    }
  }
}

/** Маска +7 (XXX) XXX-XX-XX. */
function formatPhone(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits[0] === '8') digits = `7${digits.slice(1)}`;
  if (digits[0] !== '7') digits = `7${digits}`;
  digits = digits.slice(0, 11);
  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length > 0) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 4) out += `) ${rest.slice(3, 6)}`;
  if (rest.length >= 7) out += `-${rest.slice(6, 8)}`;
  if (rest.length >= 9) out += `-${rest.slice(8, 10)}`;
  return out;
}

function StepsList({ steps }: { steps: string[] }) {
  return (
    <ol className="mt-4 space-y-1">
      {steps.map((s, i) => (
        <li key={i} className="flex items-start gap-3 px-1 py-1.5">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-[10.5px] font-bold text-slate-500">
            {i + 1}
          </span>
          <span className="text-[12.5px] leading-snug text-slate-600">{s}</span>
        </li>
      ))}
    </ol>
  );
}

function ClaimBody({ prize }: { prize: PrizeState }) {
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('');
  const [payout, setPayout] = useState<'idle' | 'processing' | 'done'>('idle');

  const phoneComplete = phone.replace(/\D/g, '').length === 11;

  const handleCopy = async () => {
    if (!prize.promoCode) return;
    const ok = await copyText(prize.promoCode);
    if (ok) {
      setCopied(true);
      haptic('success');
      toast.success('Промокод скопирован');
      setTimeout(() => setCopied(false), 2200);
    } else {
      toast.error('Не удалось скопировать');
    }
  };

  const handlePayout = async () => {
    if (!phoneComplete || payout !== 'idle') return;
    setPayout('processing');
    await sleep(1300);
    setPayout('done');
    haptic('success');
  };

  return (
    <div className="mx-auto max-h-[88vh] w-full max-w-[430px] overflow-y-auto scroll-slim px-5 pb-8 pt-3">
      <DrawerTitle className="text-[16.5px] font-semibold text-slate-900">
        {prize.title}
      </DrawerTitle>
      <DrawerDescription className="text-[12.5px] leading-relaxed text-slate-400">
        {prize.description}
      </DrawerDescription>
      {prize.valueRub != null && (
        <p className="mt-2 text-[15px] font-bold tabular-nums text-slate-900">
          {formatRub(prize.valueRub)}
        </p>
      )}

      {/* промокод */}
      {prize.deliveryType === 'PROMO_CODE' && prize.promoCode && (
        <>
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="press mt-4 flex w-full flex-col items-center gap-1.5 rounded-2xl border-2 border-dashed border-slate-900/15 bg-white/60 px-4 py-5 backdrop-blur"
          >
            <span className="font-mono text-[19px] font-semibold tracking-[0.12em] text-slate-900">
              {prize.promoCode}
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-slate-400">
              {copied ? (
                <Check size={13} className="text-emerald-600" />
              ) : (
                <Copy size={13} />
              )}
              {copied ? 'Скопировано' : 'Нажми, чтобы скопировать'}
            </span>
          </button>
          <StepsList steps={prize.instructions} />
          {prize.link && (
            <a
              href={prize.link}
              target="_blank"
              rel="noreferrer"
              className="press mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[13.5px] font-semibold text-white"
            >
              {prize.linkLabel}
              <ExternalLink size={15} />
            </a>
          )}
        </>
      )}

      {/* переход к партнёру */}
      {prize.deliveryType === 'DEEP_LINK' && (
        <>
          <StepsList steps={prize.instructions} />
          <a
            href={prize.link}
            target="_blank"
            rel="noreferrer"
            className="press mt-4 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14px] font-semibold text-white"
          >
            {prize.linkLabel}
            <ExternalLink size={16} />
          </a>
        </>
      )}

      {/* выплата по СБП */}
      {prize.deliveryType === 'SBP_PAYOUT' &&
        (payout === 'done' ? (
          <div className="mt-4 flex flex-col items-center rounded-3xl border border-emerald-200 bg-emerald-50/70 px-4 py-7">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <BadgeCheck size={26} />
            </span>
            <p className="mt-3 text-[14.5px] font-semibold text-emerald-800">Заявка принята</p>
            <p className="mt-1 text-center text-[12px] leading-relaxed text-emerald-700/80">
              Деньги придут на карту в течение 5 минут
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <label htmlFor="sbp-phone" className="text-[11.5px] font-semibold text-slate-500">
              Номер телефона для выплаты по СБП
            </label>
            <input
              id="sbp-phone"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder="+7 (___) ___-__-__"
              inputMode="tel"
              autoComplete="tel"
              className="mt-1.5 h-[52px] w-full rounded-2xl border border-slate-900/10 bg-white/70 px-4 text-[15px] tabular-nums text-slate-800 outline-none transition focus:border-slate-900/30"
            />
            <button
              type="button"
              onClick={() => void handlePayout()}
              disabled={!phoneComplete || payout === 'processing'}
              className="press mt-3 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white disabled:opacity-40"
            >
              {payout === 'processing' ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Отправляем…
                </>
              ) : (
                'Получить выплату'
              )}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              Демо-режим: выплата через партнёрский шлюз СБП
            </p>
          </div>
        ))}

      <p className="mt-5 text-center text-[11px] text-slate-400">
        Действует до {formatDateFull(prize.expiresAt)}
      </p>
    </div>
  );
}

export function ClaimSheet() {
  const claimPrizeId = useRewardsStore((s) => s.claimPrizeId);
  const setClaimPrize = useRewardsStore((s) => s.setClaimPrize);
  const state = useRewardsStore((s) => s.state);

  const prize = state?.prizes.find((p) => p.id === claimPrizeId) ?? null;

  return (
    <Drawer
      open={prize !== null}
      onOpenChange={(o) => {
        if (!o) setClaimPrize(null);
      }}
    >
      <DrawerContent className="rounded-t-[28px]">
        {prize && <ClaimBody key={prize.id} prize={prize} />}
      </DrawerContent>
    </Drawer>
  );
}
