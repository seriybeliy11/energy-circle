'use client';

// Экран сканирования: камера (DataMatrix через @zxing/browser), ручной ввод и демо-скан.

import { useEffect, useRef, useState } from 'react';
import type { IScannerControls } from '@zxing/browser';
import { CameraOff, Dices, FlaskConical, Keyboard, Loader2, ScanLine, TriangleAlert } from 'lucide-react';
import { FLAVORS, LINES } from '@/lib/rewards/catalog';
import { buildDemoCode } from '@/lib/rewards/codeParser';
import { useRewardsStore } from '@/store/useRewardsStore';
import { haptic } from '@/utils/telegram';
import { TopBar } from './bits';
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer';

type CamStatus = 'starting' | 'active' | 'denied';

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
            <Loader2 className="h-6 w-6 animate-spin text-white/50" aria-label="Подключение камеры" />
          ) : (
            <CameraOff className="h-7 w-7 text-white/40" />
          )}
          <p className="text-[12px] leading-relaxed text-white/55">
            {status === 'starting'
              ? 'Запрашиваем доступ к камере…'
              : 'Камера недоступна. Разреши доступ в настройках браузера или введи код вручную'}
          </p>
        </div>
      )}

      {/* прицел: четыре уголка */}
      <div className="pointer-events-none absolute inset-6" aria-hidden="true">
        <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-xl border-l-[3px] border-t-[3px] border-white/85" />
        <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-xl border-r-[3px] border-t-[3px] border-white/85" />
        <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-xl border-b-[3px] border-l-[3px] border-white/85" />
        <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-xl border-b-[3px] border-r-[3px] border-white/85" />
      </div>

      <span className="absolute inset-x-0 bottom-3.5 mx-auto w-fit rounded-full bg-black/45 px-3 py-1 text-[10.5px] font-medium text-white/85 backdrop-blur-sm">
        Честный знак · DataMatrix
      </span>
    </div>
  );
}

export function ScannerView() {
  const go = useRewardsStore((s) => s.go);
  const submitCode = useRewardsStore((s) => s.submitCode);
  const scanBusy = useRewardsStore((s) => s.scanBusy);
  const scanError = useRewardsStore((s) => s.scanError);
  const scanSuccess = useRewardsStore((s) => s.scanSuccess);

  const [manualOpen, setManualOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [manualValue, setManualValue] = useState('');

  const handleCode = async (code: string) => {
    const ok = await submitCode(code);
    haptic(ok ? 'success' : 'error');
  };

  const submitManual = async () => {
    const value = manualValue.trim();
    if (!value) return;
    setManualOpen(false);
    setManualValue('');
    await handleCode(value);
  };

  const pickDemoFlavor = async (flavorKey: string | null) => {
    setDemoOpen(false);
    const flavor =
      flavorKey === null
        ? FLAVORS[Math.floor(Math.random() * FLAVORS.length)]
        : FLAVORS.find((f) => f.key === flavorKey) ?? FLAVORS[0];
    await handleCode(buildDemoCode(flavor.gtin));
  };

  const cameraActive = !scanBusy && !scanSuccess && !manualOpen && !demoOpen;

  return (
    <div className="flex flex-col gap-4">
      <TopBar title="Сканирование кода" onBack={() => go('home')} />

      <div className="glass rounded-[30px] p-2.5">
        <CameraScanner onDetect={(text) => void handleCode(text)} active={cameraActive} />
      </div>

      {scanError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-red-200/80 bg-red-50/80 px-4 py-3 backdrop-blur"
        >
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-red-500" />
          <p className="text-[12.5px] leading-snug text-red-600">{scanError}</p>
        </div>
      )}

      <p className="px-1 text-center text-[12px] leading-relaxed text-slate-400">
        Квадратный код <span className="font-semibold text-slate-600">Честный знак</span> напечатан
        на дне банки. Каждый код засчитывается один раз.
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="press glass-soft flex h-12 items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-slate-700"
        >
          <Keyboard size={16} />
          Ввести вручную
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
              Ввести код вручную
            </DrawerTitle>
            <DrawerDescription className="text-[12.5px] text-slate-400">
              Код на дне банки под логотипом Честного знака, начинается с 01
            </DrawerDescription>
            <input
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void submitManual();
              }}
              placeholder="01046700330011921HQD…"
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
              Демо-скан без банки
            </DrawerTitle>
            <DrawerDescription className="text-[12.5px] text-slate-400">
              Выбери вкус — приложение сгенерирует валидный код и пройдёт весь сценарий
            </DrawerDescription>

            <button
              type="button"
              onClick={() => void pickDemoFlavor(null)}
              className="press mt-4 flex w-full items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3.5 text-left"
            >
              <Dices size={18} className="shrink-0 text-white/80" />
              <span>
                <span className="block text-[13.5px] font-semibold text-white">
                  Случайный вкус
                </span>
                <span className="block text-[11.5px] text-white/55">
                  Любая банка из каталога
                </span>
              </span>
            </button>

            {LINES.map((line) => (
              <div key={line.key} className="mt-4">
                <p className="px-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {line.name}
                </p>
                <div className="mt-1.5 space-y-1.5">
                  {FLAVORS.filter((f) => f.lineKey === line.key).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => void pickDemoFlavor(f.key)}
                      className="press glass-soft flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                    >
                      <span className="text-[13.5px] font-medium text-slate-800">{f.name}</span>
                      <ScanLine size={15} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
