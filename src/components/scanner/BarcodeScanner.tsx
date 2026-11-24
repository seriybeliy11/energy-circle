'use client';

/**
 * Экран сканера: задняя камера через @zxing/browser (DataMatrix),
 * неоновый HUD-прицел 240x240 с розовой лазерной линией, защита от
 * повторного кода и кнопка имитации успешного скана для демо.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import type { IScannerControls } from '@zxing/browser';
import { CameraOff, ChevronLeft, ScanLine, TriangleAlert, Zap } from 'lucide-react';
import { useHeistStore } from '@/store/useHeistStore';
import { cleanGs1String, generateDemoCode, parseDatamatrix } from '@/utils/datamatrixParser';
import { sfx } from '@/utils/soundEffects';
import { hapticError, hapticSuccess } from '@/utils/telegram';

type CamStatus = 'starting' | 'active' | 'denied';

interface Notice {
  kind: 'error' | 'ok';
  text: string;
}

export default function BarcodeScanner() {
  const setScreen = useHeistStore((s) => s.setScreen);
  const registerScan = useHeistStore((s) => s.registerScan);

  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastDecodeRef = useRef<{ text: string; at: number }>({ text: '', at: 0 });
  const busyRef = useRef(false);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [camStatus, setCamStatus] = useState<CamStatus>('starting');
  const [notice, setNotice] = useState<Notice | null>(null);
  const [shakeKey, setShakeKey] = useState(0);
  const [verifying, setVerifying] = useState(false);

  /** Обработка сырой строки со сканера или демо-кнопки. */
  const processCode = (raw: string) => {
    if (busyRef.current) return;

    const now = Date.now();
    if (lastDecodeRef.current.text === raw && now - lastDecodeRef.current.at < 2500) return;
    lastDecodeRef.current = { text: raw, at: now };

    const parsed = parseDatamatrix(raw, useHeistStore.getState().usedCodes);

    if (!parsed.valid) {
      sfx.error();
      hapticError();
      setNotice({ kind: 'error', text: parsed.message ?? 'Неверный код' });
      setShakeKey((k) => k + 1);
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(null), 2400);
      return;
    }

    busyRef.current = true;
    setVerifying(true);
    sfx.scanSuccess();
    setNotice({ kind: 'ok', text: 'Код подтвержден. +1 звезда розыска!' });

    window.setTimeout(() => {
      hapticSuccess();
      registerScan({
        code: cleanGs1String(raw),
        gtin: parsed.gtin ?? '',
        isSamokatBatch: parsed.isSamokatBatch ?? true,
      });
    }, 300);
  };

  const processCodeRef = useRef(processCode);
  useEffect(() => {
    processCodeRef.current = processCode;
  });

  /* Старт камеры: ленивая загрузка zxing, задняя камера, DataMatrix. */
  useEffect(() => {
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
          delayBetweenScanSuccess: 1500,
        });

        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (result) => {
            if (result) processCodeRef.current(result.getText());
          }
        );

        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setCamStatus('active');
      } catch {
        if (!cancelled) setCamStatus('denied');
      }
    })();

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    };
  }, []);

  const handleSimulate = () => {
    sfx.click();
    processCodeRef.current(generateDemoCode());
  };

  const handleBack = () => {
    sfx.click();
    setScreen('HUB');
  };

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-abyss-deep">
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
      />

      {camStatus !== 'active' && (
        <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-violet-haze/40 via-abyss to-abyss px-8">
          <CameraOff size={34} className="text-white/30" />
          <p className="text-center text-[12px] leading-relaxed text-white/50">
            {camStatus === 'starting'
              ? 'Запрашиваем доступ к камере...'
              : 'Камера недоступна. Разреши доступ в настройках браузера или используй имитацию скана ниже'}
          </p>
        </div>
      )}

      {/* HUD: виньетка + прицел */}
      <div className="vignette pointer-events-none absolute inset-0 z-[2]" />
      <div className="pointer-events-none absolute inset-0 z-[3] flex items-center justify-center">
        <motion.div
          key={shakeKey}
          animate={shakeKey > 0 ? { x: [0, -9, 9, -6, 6, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="relative h-[240px] w-[240px]"
        >
          <div
            className="absolute inset-0 rounded-2xl"
            style={{ boxShadow: '0 0 0 9999px rgba(4,1,12,0.82)' }}
          />
          <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-2xl border-l-[3px] border-t-[3px] border-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
          <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-2xl border-r-[3px] border-t-[3px] border-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
          <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-2xl border-b-[3px] border-l-[3px] border-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
          <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-2xl border-b-[3px] border-r-[3px] border-neon-cyan shadow-[0_0_12px_rgba(0,240,255,0.6)]" />
          <div className="laser-line" />
        </motion.div>
      </div>

      {/* Верхняя панель */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/45 text-white/80 backdrop-blur transition active:scale-90"
          aria-label="Назад в хаб"
        >
          <ChevronLeft size={20} />
        </button>
        <h1 className="font-display text-[13px] uppercase tracking-[0.25em] text-white/85">
          Сканер кода
        </h1>
        <div className="h-10 w-10" />
      </div>

      {/* Уведомление */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            className="absolute left-0 right-0 top-16 z-20 mx-auto w-[85%]"
          >
            <div
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[11.5px] font-semibold backdrop-blur ${
                notice.kind === 'error'
                  ? 'border-red-400/50 bg-red-950/85 text-red-300'
                  : 'border-neon-green/50 bg-emerald-950/85 text-neon-green'
              }`}
              role="status"
            >
              {notice.kind === 'error' ? <TriangleAlert size={15} /> : <ScanLine size={15} />}
              {notice.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Нижняя панель */}
      <div className="relative z-10 mt-auto bg-gradient-to-t from-abyss-deep via-abyss-deep/85 to-transparent px-5 pb-6 pt-10">
        <p className="mb-4 text-center text-[12px] leading-snug text-white/60">
          Наведи камеру на квадратный код{' '}
          <span className="text-white/90">Честного знака</span> на банке
        </p>
        <button
          type="button"
          onClick={handleSimulate}
          disabled={verifying}
          className="btn-cyber flex h-12 w-full items-center justify-center gap-2 text-[12px] font-bold uppercase tracking-wider"
        >
          <Zap size={15} className="text-neon-cyan" strokeWidth={2.4} />
          {verifying ? 'Проверка кода...' : 'Имитировать успешный скан'}
        </button>
      </div>
    </div>
  );
}
