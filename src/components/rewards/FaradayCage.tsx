'use client';

// 3D железная клетка Фарадея чистым CSS 3D (без библиотек): куб, стоящий
// на углу (главная диагональ вертикальна: rotateZ(45°) + rotateX(-35.264°)),
// медленно вращается вокруг вертикальной оси. Грани — сетка-решётка
// (repeating-linear-gradient), внутри на нижних гранях лежат 3D-иконки
// потенциальных призов, слегка «дышащие» над поверхностью.

import { Crown, CupSoda, Gift, Ticket } from 'lucide-react';

const S = 168; // сторона куба
const HALF = S / 2;

/* Трансформы шести граней стандартного куба. */
const FACES = [
  `translateZ(${HALF}px)`,
  `rotateY(180deg) translateZ(${HALF}px)`,
  `rotateY(90deg) translateZ(${HALF}px)`,
  `rotateY(-90deg) translateZ(${HALF}px)`,
  `rotateX(90deg) translateZ(${HALF}px)`,
  `rotateX(-90deg) translateZ(${HALF}px)`,
];

interface CageItem {
  icon: typeof Gift;
  color: string;
  bg: string;
  /** Трансформ: поворот к грани + сдвиг внутрь + позиция на грани. */
  transform: string;
  delay: string;
}

/* Призы-иконки «лежат» на трёх нижних гранях (+Z, +X, +Y после наклона). */
const ITEMS: CageItem[] = [
  {
    icon: CupSoda,
    color: '#059669',
    bg: 'rgba(16,185,129,0.12)',
    transform: `rotateY(0deg) translateZ(${HALF - 6}px) translate(30px, 26px) rotateZ(-8deg)`,
    delay: '0s',
  },
  {
    icon: Gift,
    color: '#e11d48',
    bg: 'rgba(244,63,94,0.12)',
    transform: `rotateY(0deg) translateZ(${HALF - 6}px) translate(-32px, -14px) rotateZ(12deg)`,
    delay: '0.5s',
  },
  {
    icon: Ticket,
    color: '#7c3aed',
    bg: 'rgba(139,92,246,0.12)',
    transform: `rotateY(90deg) translateZ(${HALF - 6}px) translate(-6px, 30px) rotateZ(-14deg)`,
    delay: '1s',
  },
  {
    icon: Crown,
    color: '#d97706',
    bg: 'rgba(245,158,11,0.14)',
    transform: `rotateY(90deg) translateZ(${HALF - 6}px) translate(26px, -24px) rotateZ(9deg)`,
    delay: '1.5s',
  },
  {
    icon: Gift,
    color: '#0f172a',
    bg: 'rgba(15,23,42,0.08)',
    transform: `rotateX(-90deg) translateZ(${HALF - 6}px) translate(-26px, 30px) rotateZ(-6deg)`,
    delay: '2.2s',
  },
];

export function FaradayCage() {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 300, height: 320, perspective: '840px' }}
      aria-hidden="true"
    >
      {/* мягкая тень под нижним углом */}
      <span
        className="absolute left-1/2 top-[86%] h-9 w-44 -translate-x-1/2 rounded-[100%] bg-slate-900/20 blur-xl"
      />

      {/* вращение вокруг вертикальной оси + лёгкий наклон камеры */}
      <div className="cage-y absolute inset-0 flex items-center justify-center">
        {/* куб, стоящий на углу: диагональ вертикальна */}
        <div
          className="relative"
          style={{
            width: S,
            height: S,
            transform: 'rotateZ(45deg) rotateX(-35.264deg)',
            transformStyle: 'preserve-3d',
          }}
        >
          {/* внутреннее свечение */}
          <span
            className="absolute left-1/2 top-1/2 h-28 w-28 rounded-full bg-violet-300/50 blur-2xl"
            style={{ transform: 'translate(-50%, -50%) translateZ(0px)' }}
          />

          {/* грани-решётки */}
          {FACES.map((t) => (
            <span key={t} className="cage-face" style={{ transform: t }} />
          ))}

          {/* призы внутри — лежат на нижних гранях */}
          {ITEMS.map((item, i) => {
            const Icon = item.icon;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2"
                style={{ transform: item.transform, transformStyle: 'preserve-3d' }}
              >
                <span className="cage-item block" style={{ animationDelay: item.delay }}>
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 bg-white/95 shadow-lg"
                    style={{ background: item.bg, borderColor: 'rgba(255,255,255,0.95)' }}
                  >
                    <Icon size={22} style={{ color: item.color }} />
                  </span>
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
