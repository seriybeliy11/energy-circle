'use client';

// Экран «Мои призы»: список выигранных подарков, тап открывает шторку получения.

import { ChevronRight, Gift } from 'lucide-react';
import { CHEST_TIERS } from '@/lib/rewards/catalog';
import { useRewardsStore } from '@/store/useRewardsStore';
import { formatDate, TopBar } from './bits';

export function PrizesView() {
  const state = useRewardsStore((s) => s.state);
  const go = useRewardsStore((s) => s.go);
  const openClaim = useRewardsStore((s) => s.openClaim);

  if (!state) return null;

  return (
    <div className="flex flex-col gap-4">
      <TopBar title="Мои призы" onBack={() => go('home')} />

      {state.prizes.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-[26px] px-6 py-12 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900/5 text-slate-300">
            <Gift size={28} />
          </span>
          <h2 className="mt-4 text-[15.5px] font-semibold text-slate-800">Призов пока нет</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">
            Отсканируй банку, выполни задание и открой первый сундук
          </p>
          <button
            type="button"
            onClick={() => go('scan')}
            className="press mt-5 h-12 rounded-2xl bg-slate-900 px-6 text-[13.5px] font-semibold text-white"
          >
            Сканировать код
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {state.prizes.map((p) => {
            const tier = CHEST_TIERS[p.tier];
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
                  <Gift size={19} style={{ color: tier.color }} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold text-slate-900">
                    {p.title}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-slate-400">
                    {p.partnerName} · {formatDate(p.createdAt)}
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
