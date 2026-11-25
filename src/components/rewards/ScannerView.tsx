'use client';

// Экран сканирования: камера (DataMatrix через @zxing/browser), под ней —
// схематичная инфографика «какой код сканировать», ручной ввод и демо-скан.
// Каждый успешный скан: +1 спин колеса + прогресс заданий.

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { CameraOff, Dices, FlaskConical, Keyboard, MoveRight, ScanLine, ShieldX, TriangleAlert } from 'lucide-react';
import { buildDemoCode, buildRetiredDemoCode } from '@/lib/rewards/codeParser';
import { useRewardsStore } from '@/store/useRewardsStore';
import { haptic } from '@/utils/telegram';
import { sound } from '@/utils/sound';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';
import { HqdLoader } from './HqdLoader';

type CamStatus = 'starting' | 'active' | 'denied';

/* ============ СХЕМАТИЧНЫЙ DATAMATRIX ============ */

/** Фиксированный рисунок 12×12: сплошные левая/нижняя кромки + чередование сверху/справа. */
const DM_PATTERN = [
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1],
  [1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0],
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1],
  [1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0],
  [1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0],
  [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1],
  [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1],
  [1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

function DataMatrixIcon({ size }: { size: number }) {
  const cell = size / 12;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" style={{ display: 'block' }}>
      {DM_PATTERN.flatMap((row, y) =>
        row.map((v, x) =>
          v ? (
            <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0f172a" />
          ) : null,
        ),
      )}
    </svg>
  );
}

/* ============ ИНФОГРАФИКА «ГДЕ КОД» ============ */

function WhereIsCodeHint() {
  return (
    <div className="glass-soft flex items-center gap-3 rounded-3xl px-4 py-3">
      {/* банка с кодом на дне */}
      <svg width="58" height="94" viewBox="0 0 64 100" className="shrink-0" aria-hidden="true">
        {/* крышка */}
        <rect x="15" y="6" width="34" height="8" rx="4" fill="rgba(255,255,255,0.6)" stroke="#94a3b8" strokeWidth="2.5" />
        {/* корпус */}
        <rect x="12" y="13" width="40" height="79" rx="10" fill="rgba(255,255,255,0.5)" stroke="#94a3b8" strokeWidth="2.5" />
        {/* «этикетка» */}
        <line x1="22" y1="32" x2="42" y2="32" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="26" y1="39" x2="38" y2="39" stroke="#cbd5e1" strokeWidth="2.5" strokeLinecap="round" />
        {/* код на дне */}
        <g transform="translate(24 71)">
          {DM_PATTERN.flatMap((row, y) =>
            row.map((v, x) =>
              v ? (
                <rect
                  key={`c-${x}-${y}`}
                  x={x * 1.33}
                  y={y * 1.33}
                  width={1.33}
                  height={1.33}
                  fill="#0f172a"
                  opacity={0.85}
                />
              ) : null,
            ),
          )}
        </g>
        {/* прицел вокруг кода */}
        <g className="hint-pulse" stroke="#059669" strokeWidth="2.5" fill="none" strokeLinecap="round">
          <path d="M18 66 v-4 a3 3 0 0 1 3 -3 h4" />
          <path d="M46 66 v-4 a3 3 0 0 0 -3 -3 h-4" />
          <path d="M18 92 v4 a3 3 0 0 0 3 3 h4" />
          <path d="M46 92 v4 a3 3 0 0 1 -3 3 h-4" />
        </g>
      </svg>

      <MoveRight size={18} className="shrink-0 text-slate-300" aria-hidden="true" />

      {/* увеличенный код + подпись */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span className="shrink-0 rounded-xl bg-white/70 p-2 shadow-sm">
          <DataMatrixIcon size={42} />
        </span>
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold leading-tight text-slate-800">Код на дне банки</p>
          <p className="mt-1 text-[11px] leading-tight text-slate-400">Квадратный · Честный знак</p>
        </div>
      </div>
    </div>
  );
}

function CameraScanner({
  onDetect,
  active,
}: {
  onDetect: (text: string) => void;
  active: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const [status, setStatus] = useState<CamStatus>('starting');
  const onDetectRef = useRef(onDetect);

  useEffect(() => {
    onDetectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([
          import('@zxing/browser'),
          import('@zxing/library'),
        ]);
        if (cancelled || !videoRef.current) return;

        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.DATA_MATRIX, BarcodeFormat.QR_CODE]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new BrowserMultiFormatReader(hints, {
          delayBetweenScanAttempts: 200,
          delayBetweenScanSuccess: 1800,
        });

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (!result) return;
            const text = result.getText();
            const now = Date.now();
            if (lastRef.current.text === text && now - lastRef.current.at < 2500) return;
            lastRef.current = { text, at: now };
            onDetectRef.current(text);
          },
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setStatus('active');
      } catch {
        if (!cancelled) setStatus('denied');
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
    };
  }, [active]);

  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[22px] bg-slate-900">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        className="h-full w-full object-cover"
        aria-label="Камера для сканирования кода"
      />

      {status !== 'active' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/95 px-8 text-center">
          {status === 'starting' ? (
            <HqdLoader tone="light" className="py-0" />
          ) : (
            <>
              <CameraOff className="h-7 w-7 text-white/40" />
              <p className="text-[12px] leading-relaxed text-white/55">
                Камера недоступна — введи код вручную
              </p>
            </>
          )}
        </div>
      )}

      {/* прицел: четыре уголка */}
      <div className="pointer-events-none absolute inset-6" aria-hidden="true">
        <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/85" />
        <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/85" />
        <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/85" />
        <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-white/85" />
      </div>
    </div>
  );
}

export function ScannerView() {
  const submitCode = useRewardsStore((s) => s.submitCode);
  const scanBusy = useRewardsStore((s) => s.scanBusy);
  const scanError = useRewardsStore((s) => s.scanError);
  const scanSuccess = useRewardsStore((s) => s.scanSuccess);
  const state = useRewardsStore((s) => s.state);

  const [manualOpen, setManualOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');

  const handleCode = async (code: string) => {
    const ok = await submitCode(code);
    haptic(ok ? 'success' : 'error');
    if (ok) sound.scan();
  };

  const submitManual = async () => {
    const value = manualValue.trim();
    if (!value) return;
    setManualOpen(false);
    setManualValue('');
    await handleCode(value);
  };

  const pickDemoFlavor = async (gtin: string | null) => {
    setDemoOpen(false);
    const flavors = state?.lines.flatMap((l) => l.flavors) ?? [];
    const gtinToUse =
      gtin ?? (flavors.length > 0 ? flavors[Math.floor(Math.random() * flavors.length)].gtin : null);
    if (!gtinToUse) return;
    await handleCode(buildDemoCode(gtinToUse));
  };

  const scanRetired = async () => {
    setDemoOpen(false);
    const flavors = state?.lines.flatMap((l) => l.flavors) ?? [];
    const gtin = flavors.length > 0 ? flavors[Math.floor(Math.random() * flavors.length)].gtin : null;
    if (!gtin) return;
    await handleCode(buildRetiredDemoCode(gtin));
  };

  const cameraActive = !scanBusy && !scanSuccess && !manualOpen && !demoOpen;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass rounded-[30px] p-2.5">
        <CameraScanner onDetect={(text) => void handleCode(text)} active={cameraActive} />
      </div>

      {/* какой код сканировать — схематично */}
      <WhereIsCodeHint />

      {scanError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 backdrop-blur"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-[12.5px] leading-snug text-red-600">{scanError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="press glass-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-slate-700"
        >
          <Keyboard size={16} />
          Ввести код
        </button>
        <button
          type="button"
          onClick={() => setDemoOpen(true)}
          className="press glass-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-slate-700"
        >
          <FlaskConical size={16} />
          Демо-скан
        </button>
      </div>

      {/* ручной ввод */}
      <Drawer open={manualOpen} onOpenChange={setManualOpen}>
        <DrawerContent className="rounded-t-[28px]">
          <div className="mx-auto w-full max-w-[430px] px-5 pb-8 pt-3">
            <DrawerTitle className="text-[16px] font-semibold text-slate-900">
              Ввести код
            </DrawerTitle>
            <DrawerDescription className="text-[12.5px] text-slate-400">
              Код на дне банки, начинается с 01
            </DrawerDescription>
            <input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitManual();
              }}
              placeholder="010467003300011921…"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              aria-label="Код Честного знака"
              className="mt-4 h-12 w-full rounded-2xl border border-slate-900/10 bg-white/70 px-4 font-mono text-[13px] uppercase tracking-wide text-slate-800 outline-none transition focus:border-slate-900/30"
            />
            <button
              type="button"
              onClick={() => void submitManual()}
              disabled={!manualValue.trim()}
              className="press mt-3 h-12 w-full rounded-2xl bg-slate-900 text-[14px] font-semibold text-white disabled:opacity-40"
            >
              Проверить код
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* демо-скан */}
      <Drawer open={demoOpen} onOpenChange={setDemoOpen}>
        <DrawerContent className="rounded-t-[28px]">
          <div className="mx-auto max-h-[70vh] w-full max-w-[430px] overflow-y-auto scroll-slim px-5 pb-8 pt-3">
            <DrawerTitle className="text-[16px] font-semibold text-slate-900">
              Демо-скан
            </DrawerTitle>
            <DrawerDescription className="text-[12.5px] text-slate-400">
              Выбери вкус — приложение сгенерирует валидный код
            </DrawerDescription>

            <button
              type="button"
              onClick={() => void pickDemoFlavor(null)}
              className="press mt-4 flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 text-left"
            >
              <Dices size={18} className="shrink-0 text-white/80" />
              <span className="text-[13.5px] font-semibold text-white">Случайный вкус</span>
            </button>

            {state?.lines.map((line) => (
              <div key={line.key} className="mt-4">
                <p className="px-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {line.name}
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {line.flavors.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => void pickDemoFlavor(f.gtin)}
                      className="press glass-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                    >
                      <span className="text-[13.5px] font-medium text-slate-800">{f.name}</span>
                      <ScanLine size={15} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => void scanRetired()}
              className="press mt-5 flex w-full items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/60 px-4 py-3 text-left"
            >
              <ShieldX size={17} className="shrink-0 text-red-400" />
              <span className="text-[13px] font-semibold text-red-600">
                Выбывший из оборота код
              </span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
