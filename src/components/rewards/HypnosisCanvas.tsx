'use client';

// Гипнотический триппи-эффект чистым JS: Canvas 2D + requestAnimationFrame.
// Две встречно вращающиеся архимедовы спирали с «дыханием» толщины линии;
// в покое — медленный мерный ход, при intensity → 1 — разгон, пульсирующие
// кольца-тоннель и лёгкое размытие смысла реальности. Без библиотек.
// Пауза при скрытии вкладки, поддержка prefers-reduced-motion, DPR ≤ 2.

import { useEffect, useRef } from 'react';

interface HypnosisCanvasProps {
  className?: string;
  /** Сигнал интенсивности 0..1 — читается каждый кадр, easing внутри. */
  intensityRef: React.MutableRefObject<number>;
  /** RGB-строка основной спирали. */
  colorA?: string;
  /** RGB-строка встречной спирали. */
  colorB?: string;
  style?: React.CSSProperties;
}

/** Пара симметричных архимедовых спиралей (два «рукава») — тонкие штрихи. */
function drawArms(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  rot: number,
  rgb: string,
  width: number,
  alpha: number,
  turns: number,
) {
  const total = turns * Math.PI * 2;
  const steps = 190;
  for (let arm = 0; arm < 2; arm += 1) {
    ctx.beginPath();
    const off = rot + arm * Math.PI;
    for (let i = 0; i <= steps; i += 1) {
      const th = (i / steps) * total;
      const r = (th / total) * maxR;
      const a = th + off;
      const px = cx + r * Math.cos(a);
      const py = cy + r * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

/** Заполненная вертушка из двух жирных спиральных рукавов — классика гипноза. */
function drawPinwheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  maxR: number,
  rot: number,
  rgb: string,
  alpha: number,
  turns: number,
) {
  const total = turns * Math.PI * 2;
  const steps = 170;
  ctx.beginPath();
  // наружная кромка первого рукава: от центра наружу
  for (let i = 0; i <= steps; i += 1) {
    const th = (i / steps) * total;
    const r = (th / total) * maxR;
    const a = th + rot;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  // обратно по той же спирали, повернутой на π — кромка второго рукава
  for (let i = steps; i >= 0; i -= 1) {
    const th = (i / steps) * total;
    const r = (th / total) * maxR;
    const a = th + rot + Math.PI;
    ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  ctx.fillStyle = `rgba(${rgb}, ${alpha})`;
  ctx.fill();
}

export function HypnosisCanvas({
  className,
  intensityRef,
  colorA = '15, 23, 42',
  colorB = '124, 108, 220',
  style,
}: HypnosisCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let raf = 0;
    let running = true;
    let w = 0;
    let h = 0;
    let spin = 0.6; // стартовый угол, чтобы спирали сразу были видны
    let smooth = 0; // сглаженная интенсивность
    let last = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width;
      h = rect.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const render = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;

      const target = intensityRef.current;
      // асимметричный easing: быстрая атака (~0.2 с), плавный спад (~1.5 с)
      const rate = target > smooth ? 0.13 : 0.035;
      smooth += (target - smooth) * rate;

      // скорость: от мерного гипноза (~35 с/оборот) до трип-разгона (~2 с/оборот)
      const speed = 0.0003 + smooth * 0.0046;
      spin += speed * dt;

      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const maxR = Math.hypot(cx, cy) * 0.96;

      // «дыхание» масштаба в трип-режиме
      const breathe = 1 + Math.sin(spin * 3.1) * 0.1 * smooth;
      const wheelR = maxR * breathe;

      // кольца-тоннель (появляются с разгоном)
      if (smooth > 0.03) {
        for (let k = 0; k < 2; k += 1) {
          const cycle = (spin * 0.11 + k * 0.5) % 1;
          const ringR = cycle * wheelR * 0.92;
          const ringAlpha = 0.11 * smooth * Math.sin(Math.PI * cycle);
          if (ringAlpha > 0.004) {
            ctx.beginPath();
            ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${colorB}, ${ringAlpha})`;
            ctx.lineWidth = 1.8;
            ctx.stroke();
          }
        }
      }

      // жирная вертушка-гипноз — глубокий сланец + вторая встречная фиолетовая
      drawPinwheel(ctx, cx, cy, wheelR, spin, colorA, 0.09 + 0.12 * smooth, 3.1);
      drawPinwheel(ctx, cx, cy, wheelR * 0.86, -spin * 0.55, colorB, 0.05 + 0.1 * smooth, 2.6);
      // тонкие встречные штрихи — трип-глубина
      drawArms(ctx, cx, cy, wheelR, -spin * 0.42, colorB, 4, 0.05 + 0.14 * smooth, 2.4);

      raf = requestAnimationFrame(render);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(render);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };

    const onVisibility = () => {
      if (document.hidden) stop();
      else if (!reduced) start();
    };

    if (reduced) {
      // один статичный кадр — спираль есть, но не дёргается
      intensityRef.current = 0;
      smooth = 0;
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.hypot(cx, cy) * 0.96;
      drawPinwheel(ctx, cx, cy, r, 0.6, colorA, 0.09, 3.1);
      drawPinwheel(ctx, cx, cy, r * 0.86, -0.33, colorB, 0.05, 2.6);
    } else {
      raf = requestAnimationFrame(render);
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stop();
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intensityRef, colorA, colorB]);

  return (
    <canvas
      ref={canvasRef}
      className={`block h-full w-full ${className ?? ''}`}
      style={style}
      aria-hidden="true"
    />
  );
}
