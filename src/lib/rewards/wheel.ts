// Движок колеса удачи: спин, near-miss («победа близка»), pity-механика,
// золотой спин x2, джекпот-бар с гарантией, билеты в раффлы.

import { db } from '@/lib/db';
import { weightedPick } from './catalog';
import {
  addRaffleTickets,
  BASE_FILL_PER_SPIN,
  createPrizeFromTemplate,
  EMPTY_BONUS_FILL,
  JACKPOT_THRESHOLD,
} from './server';
import type { WheelKind } from './types';

export interface WheelSpinOutcome {
  /** Индекс сегмента, на который visually встаёт стрелка. */
  landIndex: number;
  /** Промах приземлился вплотную к джекпоту. */
  nearMiss: boolean;
  /** Потрачен золотой спин. */
  golden: boolean;
  /** Джекпот гарантирован заполнением бара. */
  forced: boolean;
  kind: WheelKind;
  /** Сила эффекта сегмента. */
  value: number;
  /** Созданный приз (для PRIZE/JACKPOT). */
  prizeId: string | null;
}

export type WheelSpinResult =
  | { ok: true; outcome: WheelSpinOutcome }
  | { ok: false; error: 'NO_SPINS' | 'NOT_FOUND' };

/**
 * Прокрутка колеса. Списание: золотые спины расходуются первыми (x2 эффекты).
 * Механики:
 *  - pity: 2 промаха подряд → следующий спин без сегментов-промахов;
 *  - джекпот-бар: каждый спин заполняет бар, при 100% следующий спин — джекпот;
 *  - near-miss: промах показывается соседним с джекпотом сегментом.
 */
export async function spinWheel(playerId: string): Promise<WheelSpinResult> {
  const player = await db.player.findUnique({ where: { id: playerId } });
  if (!player) return { ok: false, error: 'NOT_FOUND' };

  const golden = player.goldenSpins > 0;
  if (!golden && player.spins <= 0) return { ok: false, error: 'NO_SPINS' };

  const segments = await db.wheelSegment.findMany({
    where: { active: true },
    orderBy: { order: 'asc' },
  });
  if (segments.length < 2) return { ok: false, error: 'NOT_FOUND' };

  const jackpotIdx = segments.findIndex((s) => s.kind === 'JACKPOT');
  const forced = jackpotIdx >= 0 && player.jackpotFill >= JACKPOT_THRESHOLD;

  // pity: после двух промахов подряд исключаем пустые сегменты
  let pool = segments;
  if (!forced && player.missStreak >= 2) {
    pool = segments.filter((s) => s.kind !== 'EMPTY');
  }
  if (pool.length === 0) pool = segments;

  const segment = forced && jackpotIdx >= 0 ? segments[jackpotIdx] : weightedPick(pool);

  const mult = golden ? 2 : 1;
  let { spins, goldenSpins, jackpotFill, missStreak } = player;
  if (golden) goldenSpins -= 1;
  else spins -= 1;

  let prizeId: string | null = null;
  let value = segment.value;

  // Каждый спин без джекпота приближает джекпот-бар
  if (segment.kind !== 'JACKPOT') {
    jackpotFill = Math.min(JACKPOT_THRESHOLD, jackpotFill + BASE_FILL_PER_SPIN);
  }

  switch (segment.kind) {
    case 'JACKPOT': {
      jackpotFill = 0;
      missStreak = 0;
      const prize = await createPrizeFromTemplate(playerId, 'JACKPOT', 'POOL');
      prizeId = prize.id;
      break;
    }
    case 'EMPTY': {
      missStreak = player.missStreak + 1;
      jackpotFill = Math.min(JACKPOT_THRESHOLD, jackpotFill + EMPTY_BONUS_FILL);
      value = BASE_FILL_PER_SPIN + EMPTY_BONUS_FILL;
      break;
    }
    case 'SPIN': {
      spins += segment.value * mult;
      value = segment.value * mult;
      missStreak = 0;
      break;
    }
    case 'GOLDEN_SPIN': {
      goldenSpins += segment.value * mult;
      value = segment.value * mult;
      missStreak = 0;
      break;
    }
    case 'TICKET': {
      missStreak = 0;
      const tickets = segment.value * mult;
      value = tickets;
      const added = await addRaffleTickets(playerId, tickets);
      // Нет активного раффла — утешение в джекпот-бар
      if (!added) jackpotFill = Math.min(JACKPOT_THRESHOLD, jackpotFill + 10);
      break;
    }
    case 'FILL': {
      jackpotFill = Math.min(JACKPOT_THRESHOLD, jackpotFill + segment.value * mult);
      value = segment.value * mult;
      missStreak = 0;
      break;
    }
    case 'PRIZE': {
      missStreak = 0;
      const prize = await createPrizeFromTemplate(playerId, 'WHEEL', 'POOL');
      prizeId = prize.id;
      break;
    }
  }

  await db.player.update({
    where: { id: playerId },
    data: { spins, goldenSpins, jackpotFill, missStreak },
  });

  // near-miss: пустой результат показываем соседним с джекпотом сегментом
  let landIndex = segment.order;
  let nearMiss = false;
  if (segment.kind === 'EMPTY' && jackpotIdx >= 0) {
    const n = segments.length;
    const neighbors = [(jackpotIdx + 1) % n, (jackpotIdx - 1 + n) % n].filter(
      (i) => segments[i].kind === 'EMPTY',
    );
    if (neighbors.length > 0 && Math.random() < 0.8) {
      landIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    nearMiss = Math.abs(landIndex - jackpotIdx) === 1 || Math.abs(landIndex - jackpotIdx) === n - 1;
  }

  return {
    ok: true,
    outcome: {
      landIndex,
      nearMiss,
      golden,
      forced,
      kind: segment.kind as WheelKind,
      value,
      prizeId,
    },
  };
}
