// Клиент-безопасный каталог: определения уровней сундуков и утилиты.
// Квесты, вкусы, шаблоны призов, колесо и раффлы живут в БД (см. prisma/seed.ts).

import type { ChestTier } from './types';

/* ============ СУНДУКИ ============ */

export interface ChestTierDef {
  key: ChestTier;
  name: string;
  short: string;
  color: string;
  soft: string; // фон для подложек
}

export const CHEST_TIERS: Record<ChestTier, ChestTierDef> = {
  BRONZE: { key: 'BRONZE', name: 'Бронзовый лутбокс', short: 'Бронза', color: '#a97b56', soft: 'rgba(169,123,86,0.12)' },
  SILVER: { key: 'SILVER', name: 'Серебряный лутбокс', short: 'Серебро', color: '#8291a3', soft: 'rgba(130,145,163,0.14)' },
  GOLD: { key: 'GOLD', name: 'Золотой лутбокс', short: 'Золото', color: '#cf9f3d', soft: 'rgba(207,159,61,0.14)' },
};

export const TIER_ORDER: ChestTier[] = ['BRONZE', 'SILVER', 'GOLD'];

/* ============ УТИЛИТЫ ============ */

/** Взвешенный случайный выбор из списка (поле weight). */
export function weightedPick<T extends { weight: number }>(pool: T[]): T {
  if (pool.length === 0) throw new Error('weightedPick: пустой пул');
  const total = pool.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * total;
  for (const item of pool) {
    roll -= item.weight;
    if (roll <= 0) return item;
  }
  return pool[pool.length - 1];
}

/** Генерация промокода вида HQD-7K2M-X9F4. */
export function generatePromoCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const block = () =>
    Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  return `HQD-${block()}-${block()}`;
}
