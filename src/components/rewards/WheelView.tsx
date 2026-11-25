'use client';

// Экран «Колесо»: 1 скан = 1 спин. Свежие азартные механики:
// near-miss («победа близка» — промах рядом с джекпотом), джекпот-бар с гарантией,
// золотой спин x2, pity (два промаха подряд — без промаха), билеты в розыгрыш.
// Колесо — крупное, по центру экрана, в стеклянном стиле; прокрутка с лёгким
// 3D-эффектом (наклон-«взлёт» с затухающим покачиванием) и щелчком стрелки.

import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  ChevronRight,
  Crown,
  Gift,
  Minus,
  RotateCw,
  ScanLine,
  Sparkles,
  Ticket,
  Zap,
} from 'lucide-react';
import type { SpinOkResponse, WheelSegmentState } from '@/lib/rewards/types';
import { ERROR_TEXT, useRewardsStore } from '@/store/useRewardsStore';
import { haptic } from '@/utils/telegram';
import { sound } from '@/utils/sound';
import { cn } from '@/lib/utils';
import { formatRub, plural } from './bits';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

const SPIN_DURATION_MS = 5000;
const TICK_COUNT = 26;

/* ============ SVG-КОЛЕСО (стеклянный pure-дизайн) ============ */

function polar(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, start: number, end: number) {
  const p1 = polar(cx, cy, r, start);
  const p2 = polar(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
}

function WheelSvg({ segments }: { segments: WheelSegmentState[] }) {
  const c = 180;
  const r = 172;
  const segAngle = 360 / Math.max(segments.length, 1);

  return (
    <svg viewBox="0 0 360 360" className="h-full w-full" role="img" aria-label="Колесо призов">
      <defs>
        <linearGradient id="jackpotGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8a92c" />
          <stop offset="100%" stopColor="#f8d472" />
        </linearGradient>
      </defs>

      {/* стеклянное основание */}
      <circle cx={c} cy={c} r={r} fill="#ffffff" opacity={0.4} />

      {segments.map((s, i) => {
        const start = i * segAngle;
        const end = start + segAngle;
        const mid = start + segAngle / 2;
        const isJackpot = s.kind === 'JACKPOT';
        // стеклянные сектора: чередуем прозрачность для лёгкого разделения
        const fillOpacity = isJackpot ? 1 : i % 2 === 0 ? 0.55 : 0.28;
        const fill = isJackpot ? 'url(#jackpotGrad)' : s.color;
        const textColor = isJackpot ? '#ffffff' : s.kind === 'EMPTY' ? '#8a94a8' : '#0f172a';

        return (
          <g key={s.id}>
            <path
              d={segmentPath(c, c, r - 9, start, end)}
              fill={fill}
              fillOpacity={fillOpacity}
              stroke="#ffffff"
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <g transform={`rotate(${mid} ${c} ${c})`}>
              <text
                x={c}
                y={c - r + 48}
                textAnchor="middle"
                fontSize={isJackpot ? 17 : 15.5}
                fontWeight={800}
                fill={textColor}
              >
                {s.labelTop}
              </text>
              <text
                x={c}
                y={c - r + 61}
                textAnchor="middle"
                fontSize={8}
                fontWeight={700}
                fill={textColor}
                opacity={isJackpot ? 1 : 0.85}
                style={{ letterSpacing: '0.07em' }}
              >
                {s.labelSub.toUpperCase()}
              </text>
            </g>
          </g>
        );
      })}

      {/* внутреннее тонкое кольцо */}
      <circle
        cx={c}
        cy={c}
        r={r - 78}
        fill="none"
        stroke="#ffffff"
        strokeOpacity={0.9}
        strokeWidth={1.5}
      />

      {/* внешнее стеклянное кольцо */}
      <circle
        cx={c}
        cy={c}
        r={r - 4.5}
        fill="none"
        stroke="#ffffff"
        strokeWidth={9}
        strokeOpacity={0.96}
      />

      {/* штырьки-разделители на кольце */}
      {segments.map((s, i) => {
        const p = polar(c, c, r - 12, i * segAngle);
        return (
          <circle
            key={`peg-${s.id}`}
            cx={p.x}
            cy={p.y}
            r={3.4}
            fill="#ffffff"
            stroke="rgba(15, 23, 42, 0.16)"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

/* ============ РЕЗУЛЬТАТ ПРОКРУТКИ ============ */

function MiniJackpotBar({ pct }: { pct: number }) {
  return (
    <div className="bar-track mx-auto mt-4 h-2 w-full max-w-[240px]">
      <div className="jackpot-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

function ResultBody({
  r,
  onClose,
  onAgain,
}: {
  r: SpinOkResponse;
  onClose: () => void;
  onAgain: () => void;
}) {
  const state = useRewardsStore((s) => s.state);
  const openClaim = useRewardsStore((s) => s.openClaim);
  const go = useRewardsStore((s) => s.go);
  const jackpotPct = state
    ? Math.round((state.player.jackpotFill / state.wheel.threshold) * 100)
    : 0;
  const hasSpins = (state?.player.spins ?? 0) + (state?.player.goldenSpins ?? 0) > 0;
  const prize = r.prize;

  let icon = <Minus size={26} />;
  let iconClass = 'bg-slate-100 text-slate-400';
  let title = '';
  let sub = '';

  switch (r.kind) {
    case 'JACKPOT':
      icon = <Crown size={26} strokeWidth={2.4} />;
      iconClass = 'bg-gradient-to-b from-amber-300 to-amber-500 text-white';
      title = 'ДЖЕКПОТ!';
      sub = prize?.title ?? '';
      break;
    case 'PRIZE':
      icon = <Gift size={26} />;
      iconClass = 'bg-rose-100 text-rose-500';
      title = 'Приз с колеса';
      sub = prize?.title ?? '';
      break;
    case 'SPIN':
      icon = <RotateCw size={26} />;
      iconClass = 'bg-emerald-100 text-emerald-600';
      title = `+${r.value} ${plural(r.value, ['спин', 'спина', 'спинов'])}`;
      sub = 'Крути ещё';
      break;
    case 'GOLDEN_SPIN':
      icon = <Sparkles size={26} />;
      iconClass = 'bg-amber-100 text-amber-600';
      title = `+${r.value} ${plural(r.value, ['золотой спин', 'золотых спина', 'золотых спинов'])}`;
      sub = 'Эффекты следующей прокрутки x2';
      break;
    case 'TICKET':
      icon = <Ticket size={26} />;
      iconClass = 'bg-violet-100 text-violet-600';
      title = `+${r.value} ${plural(r.value, ['билет', 'билета', 'билетов'])}`;
      sub = state?.raffle ? `Розыгрыш: ${state.raffle.title}` : 'В розыгрыш';
      break;
    case 'FILL':
      icon = <Zap size={26} />;
      iconClass = 'bg-orange-100 text-orange-600';
      title = `+${r.value} к джекпоту`;
      sub = 'Джекпот всё ближе';
      break;
    case 'EMPTY':
    default:
      icon = <Minus size={26} strokeWidth={2.6} />;
      iconClass = 'bg-slate-100 text-slate-400';
      title = r.nearMiss ? 'Совсем чуть-чуть!' : 'Мимо';
      sub = 'Джекпот всё ближе';
      break;
  }

  return (
    <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-3">
      <DrawerTitle className="sr-only">Результат прокрутки</DrawerTitle>
      <DrawerDescription className="sr-only">{title}</DrawerDescription>

      <div className="flex flex-col items-center pt-2 text-center">
        <motion.span
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 18 }}
          className={cn('flex h-16 w-16 items-center justify-center rounded-full', iconClass)}
        >
          {icon}
        </motion.span>
        <h2 className="mt-3.5 text-[20px] font-bold text-slate-900">{title}</h2>
        {sub && (
          <p className="mt-1 max-w-[300px] text-[13px] leading-snug text-slate-500">{sub}</p>
        )}
        {r.golden && (
          <span className="mt-2.5 inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">
            <Sparkles size={12} /> Золотой спин x2
          </span>
        )}
        {prize && prize.valueRub != null && (
          <p className="mt-2.5 text-[18px] font-bold tabular-nums text-slate-900">
            {formatRub(prize.valueRub)}
          </p>
        )}
        {(r.kind === 'EMPTY' || r.kind === 'FILL') && <MiniJackpotBar pct={jackpotPct} />}
      </div>

      {prize && (
        <button
          type="button"
          onClick={() => openClaim(prize.id)}
          className="press mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white"
        >
          Забрать подарок
          <ChevronRight size={16} />
        </button>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {hasSpins ? (
          <button
            type="button"
            onClick={onAgain}
            className="press h-12 rounded-2xl bg-slate-900 text-[13px] font-semibold text-white"
          >
            Крутить ещё
          </button>
        ) : (
          <button
            type="button"
            onClick={() => go('scan')}
            className="press flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[13px] font-semibold text-white"
          >
            <ScanLine size={15} />
            Сканировать
          </button>
        )}
        <button
          type="button"
          onClick={prize ? () => go('prizes') : onClose}
          className="press glass h-12 rounded-2xl text-[13px] font-semibold text-slate-700"
        >
          {prize ? 'Мои призы' : 'Закрыть'}
        </button>
      </div>
    </div>
  );
}

/* ============ ЭКРАН ============ */

export function WheelView() {
  const state = useRewardsStore((s) => s.state);
  const spinWheelAction = useRewardsStore((s) => s.spinWheel);
  const go = useRewardsStore((s) => s.go);

  const segments = useMemo(() => state?.wheel.segments ?? [], [state]);
  const threshold = state?.wheel.threshold ?? 100;
  const player = state?.player;

  const [rotation, setRotation] = useState(0);
  const rotationRef = useRef(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<SpinOkResponse | null>(null);
  const timersRef = useRef<number[]>([]);

  // Чистим таймеры тиков при размонтировании вкладки
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      timers.length = 0;
    };
  }, []);

  if (!state || !player) {
    return null;
  }

  const jackpotPct = Math.min(100, Math.round((player.jackpotFill / threshold) * 100));
  const jackpotReady = player.jackpotFill >= threshold;
  const totalSpins = player.spins + player.goldenSpins;

  const spin = async () => {
    if (spinning) return;
    if (segments.length === 0 || totalSpins <= 0) {
      go('scan');
      return;
    }
    setSpinning(true);
    setResult(null);
    haptic('light');

    const json = await spinWheelAction();
    if (!json || !json.ok) {
      setSpinning(false);
      toast.error(!json ? ERROR_TEXT.SERVER_ERROR : ERROR_TEXT[json.error]);
      return;
    }

    // --- анимация посадки на landIndex с near-miss-смещением ---
    const n = segments.length;
    const segAngle = 360 / n;
    const jackpotIndex = segments.findIndex((s) => s.kind === 'JACKPOT');
    const jitterMax = segAngle * 0.36;
    let jitter = (Math.random() * 2 - 1) * jitterMax;
    if (json.nearMiss && jackpotIndex >= 0) {
      // смещаемся к границе с джекпотом — «стрелка почти на нём»
      const diff = (json.landIndex - jackpotIndex + n) % n;
      jitter = diff === 1 ? -jitterMax : jitterMax;
    }
    const targetCenter = json.landIndex * segAngle + segAngle / 2 + jitter;
    const neededNorm = (360 - (((targetCenter % 360) + 360) % 360)) % 360;
    const currentNorm = ((rotationRef.current % 360) + 360) % 360;
    let delta = neededNorm - currentNorm;
    if (delta <= 0) delta += 360;
    const full = (6 + Math.floor(Math.random() * 2)) * 360;
    const next = rotationRef.current + full + delta;
    rotationRef.current = next;
    setRotation(next);

    // тики с замедлением (кривая t = D * (i/N)^2.1)
    for (let i = 1; i <= TICK_COUNT; i += 1) {
      const t = SPIN_DURATION_MS * Math.pow(i / TICK_COUNT, 2.1);
      timersRef.current.push(window.setTimeout(() => sound.tick(), t));
    }

    timersRef.current.push(
      window.setTimeout(() => {
        setSpinning(false);
        if (json.kind === 'JACKPOT') {
          sound.jackpot();
          haptic('success');
          void confetti({
            particleCount: 80,
            spread: 80,
            origin: { y: 0.4 },
            colors: ['#f2b632', '#f8d472', '#ffffff', '#cf9f3d'],
            ticks: 200,
            scalar: 0.9,
            disableForReducedMotion: true,
          });
        } else if (json.prize) {
          sound.win();
          haptic('success');
        } else if (json.kind === 'EMPTY') {
          sound.miss();
          haptic('error');
        } else {
          sound.win();
          haptic('medium');
        }
        setResult(json);
      }, SPIN_DURATION_MS + 150),
    );
  };

  return (
    <div className="flex min-h-[calc(100dvh-168px)] flex-col gap-3">
      {/* джекпот-бар */}
      <div className={cn('glass rounded-3xl px-4 py-3.5', jackpotReady && 'jackpot-ready')}>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-slate-500">
            <Crown size={14} className="text-amber-500" />
            Джекпот
          </span>
          <span className="text-[11.5px] font-bold tabular-nums text-slate-400">
            {player.jackpotFill} / {threshold}
          </span>
        </div>
        <div className="bar-track mt-2.5 h-2.5">
          <div className="jackpot-fill" style={{ width: `${jackpotPct}%` }} />
        </div>
        {jackpotReady ? (
          <p className="mt-2 text-center text-[12.5px] font-bold text-amber-600">
            Следующий спин — джекпот
          </p>
        ) : (
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Каждый спин приближает джекпот
          </p>
        )}
      </div>

      {/* колесо — по центру оставшейся высоты */}
      <div className="flex flex-1 items-center justify-center py-3">
        <div className="relative w-full max-w-[372px]" style={{ perspective: '1100px' }}>
          {/* стрелка со «щелчком» на старте */}
          <motion.div
            className="absolute -top-2.5 left-1/2 z-20 -translate-x-1/2"
            style={{ transformOrigin: '50% 85%' }}
            animate={spinning ? 'kick' : 'idle'}
            variants={{
              idle: { rotate: 0 },
              kick: {
                rotate: [0, -17, 7, 0],
                transition: { duration: 0.55, ease: 'easeOut' },
              },
            }}
            aria-hidden="true"
          >
            <svg width="36" height="26" viewBox="0 0 34 24">
              <path
                d="M3 3 L17 20 L31 3"
                fill="#0f172a"
                stroke="#ffffff"
                strokeWidth="3.5"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>

          {/* 3D-обёртка: «взлёт» с наклоном и затухающим покачиванием */}
          <motion.div
            className="relative"
            style={{ transformStyle: 'preserve-3d' }}
            animate={spinning ? 'spin' : 'idle'}
            variants={{
              idle: { rotateX: 0, scale: 1 },
              spin: {
                rotateX: [0, 13, -7, 3.5, -1.5, 0],
                scale: [1, 1.055, 1.025, 1.008, 1, 1],
                transition: {
                  duration: SPIN_DURATION_MS / 1000,
                  times: [0, 0.1, 0.32, 0.58, 0.8, 1],
                  ease: 'easeOut',
                },
              },
            }}
          >
            <div
              className="glass rounded-full p-3"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.1, 0.8, 0.05, 1)`,
              }}
            >
              <WheelSvg segments={segments} />
            </div>

            {/* стеклянный блик поверх (не вращается) */}
            <span className="wheel-gloss" aria-hidden="true" />
          </motion.div>

          {/* центральная кнопка */}
          <button
            type="button"
            onClick={() => void spin()}
            disabled={spinning}
            aria-label={
              totalSpins > 0
                ? `Крутить колесо, спинов: ${totalSpins}`
                : 'Спинов нет — сканировать банку'
            }
            className={cn(
              'press absolute left-1/2 top-1/2 z-10 flex h-[96px] w-[96px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-[4px] border-white shadow-xl',
              player.goldenSpins > 0 ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white',
            )}
          >
            {spinning ? (
              <span className="spin-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            ) : totalSpins <= 0 ? (
              <>
                <ScanLine size={21} />
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider opacity-80">
                  Скан
                </span>
              </>
            ) : (
              <>
                <span className="text-[13px] font-extrabold tracking-wide">КРУТИТЬ</span>
                <span className="mt-1 flex items-center gap-1 text-[12px] font-semibold tabular-nums text-white/75">
                  <RotateCw size={11} />
                  {totalSpins}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* метрики */}
      <div className="grid grid-cols-3 gap-2">
        <div className="glass-soft flex flex-col items-center rounded-2xl py-3">
          <RotateCw size={15} className="text-slate-400" />
          <span className="mt-1 text-[17px] font-bold tabular-nums leading-none text-slate-900">
            {player.spins}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            спины
          </span>
        </div>
        <div
          className={cn(
            'flex flex-col items-center rounded-2xl py-3',
            player.goldenSpins > 0 ? 'border border-amber-200 bg-amber-50/70' : 'glass-soft',
          )}
        >
          <Sparkles
            size={15}
            className={player.goldenSpins > 0 ? 'text-amber-500' : 'text-slate-400'}
          />
          <span
            className={cn(
              'mt-1 text-[17px] font-bold tabular-nums leading-none',
              player.goldenSpins > 0 ? 'text-amber-700' : 'text-slate-900',
            )}
          >
            {player.goldenSpins}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            золотые
          </span>
        </div>
        <button
          type="button"
          onClick={() => go('prizes')}
          className="glass-soft press flex flex-col items-center rounded-2xl py-3"
        >
          <Ticket size={15} className="text-slate-400" />
          <span className="mt-1 text-[17px] font-bold tabular-nums leading-none text-slate-900">
            {state.raffle?.myTickets ?? 0}
          </span>
          <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            билеты
          </span>
        </button>
      </div>

      {totalSpins <= 0 && !spinning && (
        <button
          type="button"
          onClick={() => go('scan')}
          className="press flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[14.5px] font-semibold text-white"
        >
          <ScanLine size={17} />
          Сканировать банку — +1 спин
        </button>
      )}

      {/* результат */}
      <Drawer
        open={result !== null}
        onOpenChange={(o) => {
          if (!o) setResult(null);
        }}
      >
        <DrawerContent className="rounded-t-[28px]">
          {result && (
            <ResultBody
              r={result}
              onClose={() => setResult(null)}
              onAgain={() => void spin()}
            />
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
