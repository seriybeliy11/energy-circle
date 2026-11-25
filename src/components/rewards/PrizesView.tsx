'use client';

// Экран «Призы»: сверху — 3D железная клетка Фарадея (стоит на углу,
// внутри лежат иконки потенциальных призов), ниже — карточка активного
// розыгрыша с обратным отсчётом и список выигранных подарков.

import { useEffect, useState } from 'react';
import { ChevronRight, Crown, Disc3, Gift, Ticket } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import type { PrizeSource } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { plural } from './bits';
import { FaradayCage } from './FaradayCage';

const SOURCE_ICON: Record<PrizeSource, { icon: typeof Gift; label: string }> = {
  CHEST: { icon: Gift, label: 'Лутбокс' },
  WHEEL: { icon: Disc3, label: 'Колесо' },
  JACKPOT: { icon: Crown, label: 'Джекпот' },
};

/** «3 д 14 ч» / «14 ч 05 м». */
function formatCountdown(endsAt: string, now: number): string {
  const diff = Math.max(0, new Date(endsAt).getTime() - now);
  const minutes = Math.floor(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `${days} ${plural(days, ['день', 'дня', 'дней'])} ${hours} ч`;
  if (hours > 0) return `${hours} ч ${String(mins).padStart(2, '0')} м`;
  return `${mins} м`;
}

function RaffleCard() {
  const raffle = useRewardsStore((s) => s.state?.raffle);
  const go = useRewardsStore((s) => s.go);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  if (!raffle) return null;

  return (
    <div className="glass relative overflow-hidden rounded-[26px] p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full blur-3xl"
        style={{ background: 'rgba(167, 139, 250, 0.35)' }}
        aria-hidden="true"
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-violet-500">
              Розыгрыш
            </p>
            <h2 className="mt-1 text-[17px] font-semibold leading-tight text-slate-900">
              {raffle.title}
            </h2>
            <p className="mt-0.5 text-[12.5px] leading-snug text-slate-500">{raffle.prize}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
            <Ticket size={20} />
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              до розыгрыша
            </p>
            <p className="mt-0.5 text-[16px] font-bold tabular-nums text-slate-900">
              {formatCountdown(raffle.endsAt, now)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
              мои билеты
            </p>
            <p className="mt-0.5 text-[22px] font-bold leading-none tabular-nums text-violet-600">
              {raffle.myTickets}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-slate-900/10 pt-3">
          <p className="text-[11px] text-slate-400">Билеты выпадают с колеса</p>
          <button
            type="button"
            onClick={() => go('wheel')}
            className="press flex items-center gap-1 text-[12px] font-semibold text-slate-700"
          >
            Крутить
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function PrizesView() {
  const state = useRewardsStore((s) => s.state);
  const go = useRewardsStore((s) => s.go);
  const openClaim = useRewardsStore((s) => s.openClaim);

  if (!state) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* потенциальные призы — в железной клетке Фарадея */}
      <section aria-label="Потенциальные призы" className="glass relative overflow-hidden rounded-[26px] pb-4 pt-5">
        <span
          className="pointer-events-none absolute left-1/2 top-10 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl"
          aria-hidden="true"
        />
        <FaradayCage />
        <div className="relative text-center">
          <h2 className="text-[15px] font-semibold text-slate-900">Что внутри</h2>
          <p className="mt-0.5 text-[11.5px] text-slate-400">Банки, мерч, билеты и джекпот</p>
        </div>
      </section>

      {state.raffle && <RaffleCard />}

      {state.prizes.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-[26px] px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900/5 text-slate-300">
            <Gift size={28} />
          </span>
          <h2 className="mt-4 text-[15.5px] font-semibold text-slate-800">Призов пока нет</h2>
          <p className="mt-1 text-[12.5px] text-slate-400">Открой лутбокс или крути колесо</p>
          <button
            type="button"
            onClick={() => go('scan')}
            className="press mt-5 h-12 rounded-2xl bg-slate-900 px-6 text-[13.5px] font-semibold text-white"
          >
            Сканировать банку
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {state.prizes.map((p) => {
            const tier = CHEST_TIERS[p.tier];
            const src = SOURCE_ICON[p.source] ?? SOURCE_ICON.CHEST;
            const SrcIcon = src.icon;
            const expired = new Date(p.expiresAt).getTime() < Date.now();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openClaim(p.id)}
                className="press glass flex w-full items-center gap-3.5 rounded-3xl p-4 text-left"
              >
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: tier.soft }}
                >
                  <SrcIcon size={19} style={{ color: tier.color }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-slate-900">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-slate-400">
                    {src.label} · {p.partnerName}
                  </span>
                </span>
                {expired ? (
                  <span className="shrink-0 rounded-full bg-slate-900/5 px-2.5 py-1 text-[10.5px] font-semibold text-slate-400">
                    Истёк
                  </span>
                ) : (
                  <ChevronRight size={17} className="shrink-0 text-slate-300" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
