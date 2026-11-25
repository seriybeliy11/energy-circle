// Серверная логика: прогресс заданий, выдача сундуков, сборка состояния игрока.

import { db } from '@/lib/db';
import { CHEST_TIERS, FLAVORS, QUESTS, questTitleById, resolveFlavor } from './catalog';
import type { AppState, ChestState, PrizeState, QuestState } from './types';
import type { Chest, PrizeRecord, Scan } from '@prisma/client';

/** Создаёт игрока, если его ещё нет. */
export async function ensurePlayer(playerId: string) {
  return db.player.upsert({
    where: { id: playerId },
    create: { id: playerId },
    update: {},
  });
}

/** Считает состояние всех заданий по сканам игрока. */
export function getQuestStatesSync(
  scans: Pick<Scan, 'lineKey' | 'flavorKey'>[],
  grantedQuestIds: Set<string>,
): QuestState[] {
  return QUESTS.map((q) => {
    let progress = 0;
    let flavors: QuestState['flavors'];

    if (q.type === 'SCANS') {
      progress = scans.length;
    } else {
      const lineScans = scans.filter((s) => s.lineKey === q.lineKey);
      const scannedKeys = new Set(lineScans.map((s) => s.flavorKey));
      const lineFlavors = FLAVORS.filter((f) => f.lineKey === q.lineKey);
      progress = scannedKeys.size;
      flavors = lineFlavors.map((f) => ({ name: f.name, scanned: scannedKeys.has(f.key) }));
    }

    return {
      id: q.id,
      title: q.title,
      desc: q.desc,
      icon: q.icon,
      target: q.target,
      progress: Math.min(progress, q.target),
      completed: grantedQuestIds.has(q.id),
      rewardTier: q.reward,
      ...(flavors ? { flavors } : {}),
    } satisfies QuestState;
  });
}

/** Загружает сканы и выданные сундуки и считает состояния заданий. */
export async function getQuestStates(playerId: string): Promise<QuestState[]> {
  const [scans, chests] = await Promise.all([
    db.scan.findMany({
      where: { playerId },
      select: { lineKey: true, flavorKey: true },
    }),
    db.chest.findMany({
      where: { playerId },
      select: { sourceQuestId: true },
    }),
  ]);
  const granted = new Set(chests.map((c) => c.sourceQuestId));
  return getQuestStatesSync(scans, granted);
}

/**
 * Выдаёт сундуки за задания, чей прогресс достигнут, но сундук ещё не выдан.
 * Возвращает созданные сундуки.
 */
export async function grantPendingChests(
  playerId: string,
  questStates: QuestState[],
): Promise<Chest[]> {
  const pending = questStates.filter((q) => q.progress >= q.target && !q.completed);
  const created: Chest[] = [];
  for (const q of pending) {
    created.push(
      await db.chest.create({
        data: {
          playerId,
          tier: q.rewardTier,
          sourceQuestId: q.id,
        },
      }),
    );
  }
  return created;
}

function toChestState(chest: Chest, prizes: PrizeRecord[]): ChestState {
  const prize = prizes.find((p) => p.id === chest.prizeId) ?? null;
  const sourceTitle =
    chest.sourceQuestId === 'demo' ? 'Демо-сундук' : questTitleById(chest.sourceQuestId);
  return {
    id: chest.id,
    tier: (chest.tier as ChestState['tier']) ?? 'BRONZE',
    status: chest.status === 'OPENED' ? 'OPENED' : 'UNOPENED',
    questTitle: sourceTitle,
    prizeId: chest.prizeId,
    prizeTitle: prize?.title ?? null,
    createdAt: chest.createdAt.toISOString(),
  };
}

function toPrizeState(prize: PrizeRecord): PrizeState {
  let instructions: string[] = [];
  try {
    const parsed = JSON.parse(prize.instructions);
    if (Array.isArray(parsed)) instructions = parsed.filter((s) => typeof s === 'string');
  } catch {
    instructions = [];
  }
  return {
    id: prize.id,
    tier: (prize.tier as PrizeState['tier']) ?? 'BRONZE',
    title: prize.title,
    description: prize.description,
    valueRub: prize.valueRub ?? null,
    partnerName: prize.partnerName,
    deliveryType: prize.deliveryType as PrizeState['deliveryType'],
    promoCode: prize.promoCode,
    instructions,
    link: prize.link,
    linkLabel: prize.linkLabel,
    expiresAt: prize.expiresAt.toISOString(),
    createdAt: prize.createdAt.toISOString(),
  };
}

/** Полное состояние игрока для клиента. */
export async function buildAppState(playerId: string): Promise<AppState> {
  const [scans, chests, prizes] = await Promise.all([
    db.scan.count({ where: { playerId } }),
    db.chest.findMany({
      where: { playerId },
      orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
    }),
    db.prizeRecord.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const questStates = await getQuestStates(playerId);

  return {
    scansCount: scans,
    quests: questStates,
    chests: chests.map((c) => toChestState(c, prizes)),
    prizes: prizes.map(toPrizeState),
  };
}

/** Валидация playerId (uuid от клиента). */
export function isValidPlayerId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

export { CHEST_TIERS };
