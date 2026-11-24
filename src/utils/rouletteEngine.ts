/**
 * Движок хищнической рулетки с психологическим триггером "Near Miss".
 * Генерирует ленту из 45 карт, фиксирует выигрышную ячейку tape[38],
 * обкладывает ее самыми дорогими призами и считает итоговый translateX
 * для CSS-анимации остановки ленты под неоновой указкой.
 */

import type { PrizeCategory, PrizeItem } from '@/api/types';

export const CARD_WIDTH = 130;
export const CARD_GAP = 10;
export const CARD_STEP = CARD_WIDTH + CARD_GAP;
export const TAPE_LENGTH = 45;
export const WIN_INDEX = 38;
export const SPIN_DURATION_MS = 4500;
export const SPIN_EASING = 'cubic-bezier(0.12, 0.88, 0.22, 1)';
export const MAX_STOP_OFFSET = 45;

export interface SpinContext {
  /** Призы выбранного сейфа (GAMING или CASH). */
  pool: PrizeItem[];
  safeType: PrizeCategory;
  /** 0-based индекс текущего прокрута (сколько завершено до него). */
  spinIndex: number;
  /** Разрешенный форс-дроп из админ-панели, высший приоритет. */
  forcedPrize?: PrizeItem | null;
  /** Множитель веса джекпотов; по умолчанию 1.5, во время FOMO-буста 2.5. */
  boostMultiplier?: number;
  /** Флаг DEMO_SCRIPTED_MODE. */
  demoScripted?: boolean;
}

export interface TapeResult {
  /** Ровно 45 карт ленты. */
  tape: PrizeItem[];
  /** Приз, зафиксированный в tape[WIN_INDEX]. */
  targetPrize: PrizeItem;
  /** tape[WIN_INDEX + 1] - джекпот для блока "совсем чуть-чуть!". */
  nearMissPrize: PrizeItem;
  /** Случайный джиттер остановки, -45..45 px. */
  offset: number;
}

/** Случайное смещение остановки в [-MAX_STOP_OFFSET, MAX_STOP_OFFSET] включительно. */
export function randomStopOffset(): number {
  return Math.floor(Math.random() * (MAX_STOP_OFFSET * 2 + 1)) - MAX_STOP_OFFSET;
}

/**
 * Взвешенный выбор по совокупному весу. Вес предметов с rarity === 'JACKPOT'
 * умножается на jackpotBoost. Для непустого пула никогда не возвращает undefined.
 */
export function weightedPick(pool: PrizeItem[], jackpotBoost = 1): PrizeItem {
  const weightOf = (item: PrizeItem): number =>
    item.rarity === 'JACKPOT' ? item.weight * jackpotBoost : item.weight;

  let total = 0;
  for (const item of pool) {
    total += weightOf(item);
  }

  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= weightOf(item);
    if (roll < 0) {
      return item;
    }
  }
  return pool[pool.length - 1];
}

/** Случайный элемент непустого массива. */
function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Самый дорогой призы ранжируются по убыванию valueRub. */
function byValueDesc(a: PrizeItem, b: PrizeItem): number {
  return b.valueRub - a.valueRub;
}

/** Самый высокий вес. */
function byWeightDesc(a: PrizeItem, b: PrizeItem): number {
  return b.weight - a.weight;
}

/**
 * Собирает ленту рулетки: разрешение целевого приза (форс -> демо-сценарий ->
 * взвешенный выбор), заполнение 45 карт, near-miss-обкладка и фиксация winslot.
 */
export function generateRouletteTape(ctx: SpinContext): TapeResult {
  const pool = ctx.pool;
  if (pool.length === 0) {
    throw new Error('Empty prize pool');
  }

  const boost = ctx.boostMultiplier ?? 1.5;
  let targetPrize: PrizeItem;

  if (ctx.forcedPrize) {
    targetPrize = ctx.forcedPrize;
  } else if (ctx.demoScripted) {
    if (ctx.spinIndex === 0) {
      // Средний приз 150..300 руб, фолбэк - самый дешевый предмет пула.
      const midRange = pool.filter((p) => p.valueRub >= 150 && p.valueRub <= 300);
      targetPrize =
        midRange.length > 0
          ? pickRandom(midRange)
          : [...pool].sort((a, b) => a.valueRub - b.valueRub)[0];
    } else if (ctx.spinIndex === 1) {
      // Ровно 500 руб, фолбэк - самый весомый RARE-предмет.
      const exact500 = pool.filter((p) => p.valueRub === 500);
      if (exact500.length > 0) {
        targetPrize = pickRandom(exact500);
      } else {
        const rares = pool.filter((p) => p.rarity === 'RARE');
        const candidates = rares.length > 0 ? rares : pool;
        targetPrize = [...candidates].sort(byWeightDesc)[0];
      }
    } else if (ctx.spinIndex === 4) {
      // Пятый прокрут: 50% джекпот, иначе взвешенный выбор с бустом.
      const jackpots = pool.filter((p) => p.rarity === 'JACKPOT');
      targetPrize =
        jackpots.length > 0 && Math.random() < 0.5
          ? pickRandom(jackpots)
          : weightedPick(pool, boost);
    } else {
      targetPrize = weightedPick(pool, boost);
    }
  } else {
    targetPrize = weightedPick(pool, boost);
  }

  // Наполнитель ленты: взвешенный выбор без буста.
  const tape: PrizeItem[] = [];
  for (let i = 0; i < TAPE_LENGTH; i += 1) {
    tape.push(pool.length === 1 ? pool[0] : weightedPick(pool, 1));
  }

  // Near Miss: самые дорогие призы обрамляют выигрышную ячейку.
  const top = [...pool].sort(byValueDesc);
  tape[WIN_INDEX - 1] = top[0];
  tape[WIN_INDEX + 1] = top[1] ?? top[0];

  // Жесткий фикс выигрыша.
  tape[WIN_INDEX] = targetPrize;

  return {
    tape,
    targetPrize,
    nearMissPrize: tape[WIN_INDEX + 1],
    offset: randomStopOffset(),
  };
}

/**
 * Итоговый translateX ленты: центр карты tape[WIN_INDEX] встает точно под
 * указкой (центр окна) с джиттером offset. Для окна 430px это около -5170.
 */
export function computeFinalTranslateX(containerWidth: number, offset: number): number {
  return containerWidth / 2 - (WIN_INDEX * CARD_STEP + CARD_WIDTH / 2) + offset;
}

/** Индекс карты, находящейся под указкой прямо сейчас (для rAF-трекинга тика). */
export function pointerCardIndex(tapeRectLeftX: number, pointerCenterX: number): number {
  return Math.floor((pointerCenterX - tapeRectLeftX) / CARD_STEP);
}
