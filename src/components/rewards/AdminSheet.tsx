'use client';

// Скрытая админ-панель (5 тапов по логотипу): гибкое управление квестами
// и розыгрышами без деплоя — прямо из приложения.

import { useEffect, useState } from 'react';
import { Crown, Loader2, Plus, RotateCcw, RotateCw, Ticket, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { CHEST_TIERS, TIER_ORDER } from '@/lib/rewards/catalog';
import type { AdminData, ChestTier } from '@/lib/rewards/types';
import { useRewardsStore } from '@/store/useRewardsStore';
import { cn } from '@/lib/utils';
import { formatDate } from './bits';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

type Tab = 'quests' | 'raffles' | 'demo';
type QuestMode = 'SCANS' | 'FLAVORS_LINE' | 'FLAVORS_ALL';

const TABS: { key: Tab; label: string }[] = [
  { key: 'quests', label: 'Квесты' },
  { key: 'raffles', label: 'Розыгрыши' },
  { key: 'demo', label: 'Демо' },
];

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="glass-soft flex gap-1 rounded-2xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'flex-1 rounded-xl px-2 py-2 text-[12px] font-semibold transition',
            value === o.value ? 'bg-slate-900 text-white' : 'text-slate-500',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const inputClass =
  'h-12 w-full rounded-2xl border border-slate-900/10 bg-white/70 px-4 text-[13.5px] text-slate-800 outline-none transition focus:border-slate-900/30';

/* ============ ВКЛАДКА: КВЕСТЫ ============ */

function QuestsTab({ data, onDone }: { data: AdminData | null; onDone: () => void }) {
  const admin = useRewardsStore((s) => s.admin);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<QuestMode>('SCANS');
  const [lineKey, setLineKey] = useState('');
  const [target, setTarget] = useState('3');
  const [tier, setTier] = useState<ChestTier>('SILVER');
  const [busy, setBusy] = useState(false);

  // Дефолтная линейка: первая доступная (без эффекта — чистый рендер-производная)
  const effectiveLineKey = data?.lines.some((l) => l.key === lineKey)
    ? lineKey
    : (data?.lines[0]?.key ?? '');

  const valid =
    title.trim().length >= 3 &&
    Number.isInteger(Number(target)) &&
    Number(target) >= 1 &&
    Number(target) <= 999 &&
    (mode !== 'FLAVORS_LINE' || Boolean(effectiveLineKey));

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await admin('create_quest', {
      title: title.trim(),
      type: mode === 'SCANS' ? 'SCANS' : 'FLAVORS',
      lineKey: mode === 'FLAVORS_LINE' ? effectiveLineKey : null,
      target: Number(target),
      rewardTier: tier,
    });
    setBusy(false);
    if (res?.ok) {
      toast.success('Квест создан');
      setTitle('');
      onDone();
    } else {
      toast.error('Не удалось создать квест');
    }
  };

  const remove = async (id: string) => {
    const res = await admin('delete_quest', { questId: id });
    if (res?.ok) {
      toast.success('Квест удалён');
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название квеста"
          maxLength={60}
          className={inputClass}
        />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'SCANS', label: 'Сканы' },
            { value: 'FLAVORS_LINE', label: 'Вкусы линейки' },
            { value: 'FLAVORS_ALL', label: 'Все вкусы' },
          ]}
        />
        {mode === 'FLAVORS_LINE' && (
          <Segmented
            value={effectiveLineKey}
            onChange={setLineKey}
            options={(data?.lines ?? []).map((l) => ({ value: l.key, label: l.name }))}
          />
        )}
        <div className="flex gap-2.5">
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode="numeric"
            placeholder="Цель"
            aria-label="Цель квеста"
            className={cn(inputClass, 'w-28 text-center font-semibold')}
          />
          <div className="glass-soft flex flex-1 gap-1 rounded-2xl p-1">
            {TIER_ORDER.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={cn(
                  'flex-1 rounded-xl text-[11.5px] font-semibold transition',
                  tier === t ? 'text-white' : 'text-slate-500',
                )}
                style={tier === t ? { background: CHEST_TIERS[t].color } : undefined}
              >
                {CHEST_TIERS[t].short}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void create()}
          disabled={!valid || busy}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Создать квест
        </button>
      </div>

      <div className="space-y-1.5">
        {data?.quests.map((q) => (
          <div key={q.id} className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: CHEST_TIERS[q.rewardTier].color }}
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800">
                {q.title}
              </span>
              <span className="block text-[11px] text-slate-400">
                {q.type === 'SCANS' ? 'сканы' : 'вкусы'}
                {q.lineKey ? ` · ${q.lineKey}` : ''} · цель {q.target}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void remove(q.id)}
              aria-label={`Удалить ${q.title}`}
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ ВКЛАДКА: РАФФЛЫ ============ */

function RafflesTab({ data, onDone }: { data: AdminData | null; onDone: () => void }) {
  const admin = useRewardsStore((s) => s.admin);
  const [title, setTitle] = useState('');
  const [prize, setPrize] = useState('');
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  const valid = title.trim().length >= 3 && prize.trim().length >= 3 && Boolean(date);

  const create = async () => {
    if (!valid || busy) return;
    setBusy(true);
    const res = await admin('create_raffle', {
      title: title.trim(),
      prize: prize.trim(),
      endsAt: new Date(`${date}T21:00:00`).toISOString(),
    });
    setBusy(false);
    if (res?.ok) {
      toast.success('Розыгрыш создан');
      setTitle('');
      setPrize('');
      setDate('');
      onDone();
    } else {
      toast.error('Не удалось создать розыгрыш');
    }
  };

  const remove = async (id: string) => {
    const res = await admin('delete_raffle', { raffleId: id });
    if (res?.ok) {
      toast.success('Розыгрыш удалён');
      onDone();
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Название розыгрыша"
          maxLength={60}
          className={inputClass}
        />
        <input
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="Приз"
          maxLength={120}
          className={inputClass}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Дата окончания"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => void create()}
          disabled={!valid || busy}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[13.5px] font-semibold text-white disabled:opacity-40"
        >
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Ticket size={16} />}
          Создать розыгрыш
        </button>
      </div>

      <div className="space-y-1.5">
        {data?.raffles.map((r) => (
          <div key={r.id} className="glass-soft flex items-center gap-3 rounded-2xl px-4 py-3">
            <Ticket size={15} className="shrink-0 text-violet-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold text-slate-800">
                {r.title}
              </span>
              <span className="block text-[11px] text-slate-400">
                до {formatDate(r.endsAt)} · {r.totalTickets} билетов
                {r.active ? '' : ' · неактивен'}
              </span>
            </span>
            <button
              type="button"
              onClick={() => void remove(r.id)}
              aria-label={`Удалить ${r.title}`}
              className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============ ВКЛАДКА: ДЕМО ============ */

function DemoTab({ onDone }: { onDone: () => void }) {
  const demoAction = useRewardsStore((s) => s.demoAction);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (action: Parameters<typeof demoAction>[0], okText: string) => {
    if (busy) return;
    setBusy(action);
    const ok = await demoAction(action);
    setBusy(null);
    if (ok) {
      toast.success(okText);
      onDone();
    } else {
      toast.error('Ошибка');
    }
  };

  const [confirmReset, setConfirmReset] = useState(false);

  const reset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      setTimeout(() => setConfirmReset(false), 3000);
      return;
    }
    await run('reset', 'Прогресс сброшен');
  };

  const btn = 'press glass-soft flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left';

  return (
    <div className="space-y-2.5">
      <button type="button" onClick={() => void run('grant_spins', '+5 спинов')} className={btn}>
        <span className="flex items-center gap-3">
          <RotateCw size={17} className="text-slate-400" />
          <span className="text-[13.5px] font-semibold text-slate-800">+5 спинов</span>
        </span>
        {busy === 'grant_spins' && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </button>

      <button type="button" onClick={() => void run('fill_jackpot', 'Джекпот-бар заполнен')} className={btn}>
        <span className="flex items-center gap-3">
          <Crown size={17} className="text-amber-500" />
          <span className="text-[13.5px] font-semibold text-slate-800">
            Джекпот-бар на 100%
          </span>
        </span>
        {busy === 'fill_jackpot' && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </button>

      <button type="button" onClick={() => void run('grant_chests', 'Лутбоксы выданы')} className={btn}>
        <span className="flex items-center gap-3">
          <Plus size={17} className="text-slate-400" />
          <span className="text-[13.5px] font-semibold text-slate-800">
            Лутбоксы всех уровней
          </span>
        </span>
        {busy === 'grant_chests' && <Loader2 size={16} className="animate-spin text-slate-400" />}
      </button>

      <button
        type="button"
        onClick={() => void reset()}
        className="press flex w-full items-center justify-between gap-3 rounded-2xl border border-red-200/80 bg-red-50/60 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-3">
          <RotateCcw size={17} className="text-red-400" />
          <span className="text-[13.5px] font-semibold text-red-600">
            {confirmReset ? 'Точно? Нажми ещё раз' : 'Сбросить прогресс'}
          </span>
        </span>
        {busy === 'reset' && <Loader2 size={16} className="animate-spin text-red-400" />}
      </button>
    </div>
  );
}

/* ============ ПАНЕЛЬ ============ */

export function AdminSheet() {
  const adminOpen = useRewardsStore((s) => s.adminOpen);
  const setAdminOpen = useRewardsStore((s) => s.setAdminOpen);
  const admin = useRewardsStore((s) => s.admin);

  const [tab, setTab] = useState<Tab>('quests');
  const [data, setData] = useState<AdminData | null>(null);

  // Загружаем список квестов/раффлов при открытии панели (async — setState после await)
  useEffect(() => {
    if (!adminOpen) return;
    let cancelled = false;
    void (async () => {
      const res = await useRewardsStore.getState().admin('list');
      if (!cancelled && res?.ok) setData(res.admin);
    })();
    return () => {
      cancelled = true;
    };
  }, [adminOpen]);

  const reload = async () => {
    const res = await admin('list');
    if (res?.ok) setData(res.admin);
  };

  return (
    <Drawer open={adminOpen} onOpenChange={setAdminOpen}>
      <DrawerContent className="rounded-t-[28px]">
        <div className="mx-auto max-h-[85vh] w-full max-w-[430px] overflow-y-auto scroll-slim px-5 pb-8 pt-3">
          <DrawerTitle className="text-[16px] font-semibold text-slate-900">
            Админ-панель
          </DrawerTitle>
          <DrawerDescription className="text-[12.5px] text-slate-400">
            Управление квестами и розыгрышами. Скрыта от пользователей (5 тапов по логотипу).
          </DrawerDescription>

          <div className="glass-soft mt-4 flex gap-1 rounded-2xl p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex-1 rounded-xl px-2 py-2 text-[12.5px] font-semibold transition',
                  tab === t.key ? 'bg-slate-900 text-white' : 'text-slate-500',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-4">
            {tab === 'quests' && <QuestsTab data={data} onDone={() => void reload()} />}
            {tab === 'raffles' && <RafflesTab data={data} onDone={() => void reload()} />}
            {tab === 'demo' && <DemoTab onDone={() => void reload()} />}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
