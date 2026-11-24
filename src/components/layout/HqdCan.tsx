'use client';

/**
 * Стилизованный SVG-макет банки HQD Energy Miami Chase с неоновой обводкой,
 * эффектом левитации и плавающим бейджем множителя удачи.
 */

import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface HqdCanProps {
  boostMultiplier: number;
  boosted: boolean;
}

export default function HqdCan({ boostMultiplier, boosted }: HqdCanProps) {
  return (
    <div className="relative mx-auto w-[236px] select-none">
      {/* Плавающий бейдж множителя удачи */}
      <motion.div
        animate={{ y: [-4, 4] }}
        transition={{ duration: 2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        className="absolute -top-6 left-1/2 z-10 -translate-x-1/2"
      >
        <div
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider ${
            boosted
              ? 'bg-gradient-to-r from-neon-gold to-miami-orange text-abyss shadow-[0_0_26px_rgba(255,215,0,0.5)]'
              : 'bg-gradient-to-r from-miami to-miami-orange text-white shadow-[0_0_26px_rgba(255,42,133,0.45)]'
          }`}
        >
          <Flame size={13} strokeWidth={2.5} />
          Множитель удачи: x{boostMultiplier}
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [-7, 7], rotate: [-1.5, 1.5] }}
        transition={{ duration: 3.2, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' }}
        className="drop-shadow-[0_18px_40px_rgba(255,42,133,0.35)]"
      >
        <svg
          viewBox="0 0 220 340"
          className="h-auto w-full"
          role="img"
          aria-label="Банка энергетика HQD Energy Miami Chase"
        >
          <defs>
            <linearGradient id="canBody" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7c1fa2" />
              <stop offset="18%" stopColor="#c22a8f" />
              <stop offset="50%" stopColor="#ff2a85" />
              <stop offset="82%" stopColor="#c22a8f" />
              <stop offset="100%" stopColor="#6d1b8f" />
            </linearGradient>
            <linearGradient id="lidGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e8e8f2" />
              <stop offset="100%" stopColor="#8f8fa8" />
            </linearGradient>
            <linearGradient id="goldBolt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffe45c" />
              <stop offset="100%" stopColor="#ff9a00" />
            </linearGradient>
          </defs>

          {/* Тень-платформа под банкой */}
          <ellipse cx="110" cy="318" rx="72" ry="11" fill="rgba(255,42,133,0.16)" />

          {/* Корпус */}
          <rect x="52" y="52" width="116" height="252" rx="24" fill="url(#canBody)" />

          {/* Блик слева */}
          <rect x="64" y="68" width="12" height="222" rx="6" fill="rgba(255,255,255,0.16)" />
          {/* Затемнение справа */}
          <rect x="150" y="68" width="10" height="222" rx="5" fill="rgba(20,4,32,0.28)" />

          {/* Крышка */}
          <ellipse cx="110" cy="52" rx="58" ry="13" fill="url(#lidGrad)" />
          <ellipse cx="110" cy="49" rx="58" ry="13" fill="#c9c9dd" />
          <ellipse cx="110" cy="49" rx="44" ry="9" fill="#a5a5c0" />
          <rect x="104" y="40" width="12" height="10" rx="3" fill="#d7d7e8" />

          {/* Неоновая обводка */}
          <rect x="48" y="48" width="124" height="260" rx="26" fill="none" stroke="#00f0ff" strokeWidth="5" opacity="0.12" />
          <rect x="48" y="48" width="124" height="260" rx="26" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.65" />

          {/* Надписи */}
          <text
            x="110"
            y="150"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="46"
            fontFamily="var(--font-russo), 'Arial Black', sans-serif"
            letterSpacing="2"
          >
            HQD
          </text>
          <text x="110" y="171" textAnchor="middle" fill="rgba(255,255,255,0.85)" fontSize="11" letterSpacing="6">
            ENERGY
          </text>

          {/* Золотая молния */}
          <path
            d="M118 186 L94 238 L108 238 L96 282 L128 226 L112 226 L126 186 Z"
            fill="url(#goldBolt)"
            stroke="rgba(255,255,255,0.35)"
            strokeWidth="1"
          />

          <text
            x="110"
            y="306"
            textAnchor="middle"
            fill="#00f0ff"
            fontSize="15"
            fontFamily="var(--font-russo), 'Arial Black', sans-serif"
            letterSpacing="1.5"
          >
            MIAMI CHASE
          </text>

          {/* Искры */}
          <circle cx="42" cy="120" r="3" fill="#ffd700" opacity="0.8" />
          <circle cx="182" cy="210" r="2.5" fill="#00f0ff" opacity="0.7" />
          <circle cx="178" cy="90" r="2" fill="#ff2a85" opacity="0.8" />
          <circle cx="38" cy="250" r="2" fill="#ffd700" opacity="0.6" />
        </svg>
      </motion.div>
    </div>
  );
}
