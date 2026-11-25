// Серверная логика: каталог из БД, прогресс заданий, выдача сундуков,
// создание призов из шаблонов, билеты в раффлы, сборка состояния игрока.

import { db } from '@/lib/db';
import { generatePromoCode, weightedPick } from './catalog';
import type {
  AppState,
  ChestState,
  ChestTier,
  LineState,
  PlayerMeta,
  PrizeSource,
  PrizeState,
  QuestState,
  RaffleState,
} from './types';
import type { Chest, Flavor, FlavorLine, PrizeRecord } from '@prisma/client';

/* ============ КОНСТАНТЫ КОЛЕСА ============ */

/** Заполнение бара, при котором следующий спин — гарантированный джекпот. */
export const JACKPOT_THRESHOLD = 100;
/** База заполнения джекпот-бара за любой спин без джекпота. */
export const BASE_FILL_PER_SPIN = 6;
/** Утешительное заполнение за промах («джекпот всё ближе»). */
export const EMPTY_BONUS_FILL = 5;
/** Срок жизни приза. */
export const PRIZE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ============ ИГРОК ============ */

/** Создаёт игрока, если его ещё нет. */
export async function ensurePlayer(playerId: string) {
  return db.player.upsert({
    where: { id: playerId },
    create: { id: playerId },
    update: {},
  });
}

/** Валидация playerId (uuid от клиента). */
export function isValidPlayerId(id: unknown): id is string {
  return typeof id === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(id);
}

/* ============ КАТАЛОГ ============ */

/** Загружает линейки с вкусами (для каталога и демо-сканера). */
export async function getLines(): Promise<(FlavorLine & { flavors: Flavor[] })[]> {
  return db.flavorLine.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { flavors: { orderBy: { key: 'asc' } } },
  });
}

function toLineState(line: FlavorLine & { flavors: Flavor[] }): LineState {
  return {
    key: line.key,
    name: line.name,
    subtitle: line.subtitle,
    flavors: line.flavors.map((f) => ({ key: f.key, name: f.name, gtin: f.gtin })),
  };
}

/** Детерминированный хеш строки (djb2). */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Определяет вкус по GTIN. Известные GTIN — из каталога БД,
 * неизвестные (реальные банки) детерминированно распределяются по вкусам,
 * чтобы один и тот же продукт всегда давал один и тот же вкус.
 */
export function resolveFlavor(
  gtin: string,
  lines: (FlavorLine & { flavors: Flavor[] })[],
): Flavor {
  const all = lines.flatMap((l) => l.flavors);
  if (all.length === 0) throw new Error('Каталог вкусов пуст — выполни bun run db:seed');
  const known = all.find((f) => f.gtin === gtin);
  if (known) return known;
  const line = lines[hashString(gtin) % lines.length];
  return line.flavors[hashString(`v${gtin}`) % line.flavors.length];
}

/* ============ ЗАДАНИЯ ============ */

interface ScanLite {
  lineKey: string;
  flavorKey: string;
}

/** Загружает сканы и выданные сундуки и считает состояния заданий. */
export async function getQuestStates(playerId: string): Promise<QuestState[]> {
  const [quests, lines, scans, chests] = await Promise.all([
    db.quest.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' } }),
    getLines(),
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
  const allFlavors = lines.flatMap((l) => l.flavors);

  return quests.map((q) => {
    let progress = 0;
    let flavors: QuestState['flavors'];

    if (q.type === 'SCANS') {
      progress = scans.length;
    } else {
      const lineScans = q.lineKey ? scans.filter((s) => s.lineKey === q.lineKey) : scans;
      const scannedKeys = new Set(lineScans.map((s) => s.flavorKey));
      progress = scannedKeys.size;
      const pool = q.lineKey ? lines.find((l) => l.key === q.lineKey)?.flavors ?? [] : allFlavors;
      flavors = pool.map((f) => ({ name: f.name, scanned: scannedKeys.has(f.key) }));
    }

    return {
      id: q.id,
      title: q.title,
      desc: q.desc,
      icon: q.icon,
      target: q.target,
      progress: Math.min(progress, q.target),
      completed: granted.has(q.id),
      rewardTier: q.rewardTier as ChestTier,
      ...(flavors ? { flavors } : {}),
    } satisfies QuestState;
  });
}

/**
 * Выдаёт сундуки за задания, чей прогресс достигнут, но сундук ещё не выдан.
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

/* ============ ПРИЗЫ ============ */

/**
 * Создаёт приз из взвешенного пула шаблонов.
 * Пулы: ('CHEST', уровень сундука) | ('WHEEL', 'POOL') | ('JACKPOT', 'POOL').
 */
export async function createPrizeFromTemplate(
  playerId: string,
  source: PrizeSource,
  tier: string,
): Promise<PrizeRecord> {
  let pool = await db.prizeTemplate.findMany({ where: { source, tier } });
  if (pool.length === 0) {
    // Страховка: если пул не засеян — берём любой доступный шаблон
    pool = await db.prizeTemplate.findMany({ where: { source } });
  }
  if (pool.length === 0) {
    throw new Error('Нет шаблонов призов — выполни bun run db:seed');
  }
  const tpl = weightedPick(pool);

  // Отображаемый уровень: у колеса и джекпота свой пул, маппим в уровень сундука
  const displayTier: ChestTier =
    source === 'CHEST' ? (tier as ChestTier) : source === 'JACKPOT' ? 'GOLD' : 'SILVER';

  return db.prizeRecord.create({
    data: {
      playerId,
      templateId: tpl.id,
      source,
      tier: displayTier,
      title: tpl.title,
      description: tpl.description,
      valueRub: tpl.valueRub ?? null,
      partnerName: tpl.partnerName,
      deliveryType: tpl.deliveryType,
      promoCode: tpl.deliveryType === 'PROMO_CODE' ? generatePromoCode() : null,
      instructions: tpl.instructions,
      link: tpl.link,
      linkLabel: tpl.linkLabel,
      expiresAt: new Date(Date.now() + PRIZE_TTL_MS),
    },
  });
}

export function toPrizeState(prize: PrizeRecord): PrizeState {
  let instructions: string[] = [];
  try {
    const parsed = JSON.parse(prize.instructions);
    if (Array.isArray(parsed)) instructions = parsed.filter((s) => typeof s === 'string');
  } catch {
    instructions = [];
  }
  return {
    id: prize.id,
    source: (prize.source as PrizeState['source']) ?? 'CHEST',
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

/* ============ РАФФЛЫ ============ */

/** Начисляет билеты в активный раффл. Возвращает false, если активного нет. */
export async function addRaffleTickets(playerId: string, count: number): Promise<boolean> {
  const raffle = await db.raffle.findFirst({
    where: { active: true, endsAt: { gt: new Date() } },
    orderBy: { endsAt: 'asc' },
  });
  if (!raffle) return false;
  await db.raffleEntry.upsert({
    where: { raffleId_playerId: { raffleId: raffle.id, playerId } },
    create: { raffleId: raffle.id, playerId, tickets: count },
    update: { tickets: { increment: count } },
  });
  return true;
}

/* ============ СОСТОЯНИЕ ИГРОКА ============ */

/** Полное состояние игрока для клиента. */
export async function buildAppState(playerId: string): Promise<AppState> {
  const player = await ensurePlayer(playerId);

  const [scansCount, chests, prizes, questStates, lines, segments, allQuests] =
    await Promise.all([
      db.scan.count({ where: { playerId } }),
      db.chest.findMany({
        where: { playerId },
        orderBy: [{ status: 'desc' }, { createdAt: 'desc' }],
      }),
      db.prizeRecord.findMany({
        where: { playerId },
        orderBy: { createdAt: 'desc' },
      }),
      getQuestStates(playerId),
      getLines(),
      db.wheelSegment.findMany({ where: { active: true }, orderBy: { order: 'asc' } }),
      db.quest.findMany({ select: { id: true, title: true } }),
    ]);

  // Активный раффл + билеты игрока
  const raffle = await db.raffle.findFirst({
    where: { active: true, endsAt: { gt: new Date() } },
    orderBy: { endsAt: 'asc' },
  });
  let raffleState: RaffleState | null = null;
  if (raffle) {
    const [entry, agg] = await Promise.all([
      db.raffleEntry.findUnique({
        where: { raffleId_playerId: { raffleId: raffle.id, playerId } },
      }),
      db.raffleEntry.aggregate({ where: { raffleId: raffle.id }, _sum: { tickets: true } }),
    ]);
    raffleState = {
      id: raffle.id,
      title: raffle.title,
      prize: raffle.prize,
      endsAt: raffle.endsAt.toISOString(),
      myTickets: entry?.tickets ?? 0,
      totalTickets: agg._sum.tickets ?? 0,
    };
  }

  const questTitles = new Map(allQuests.map((q) => [q.id, q.title]));
  const prizeList = prizes.map(toPrizeState);
  const playerMeta: PlayerMeta = {
    spins: player.spins,
    goldenSpins: player.goldenSpins,
    jackpotFill: player.jackpotFill,
  };

  return {
    scansCount,
    quests: questStates,
    chests: chests.map((c) => {
      const prize = prizeList.find((p) => p.id === c.prizeId) ?? null;
      const sourceTitle =
        c.sourceQuestId === 'demo'
          ? 'Демо-лутбокс'
          : questTitles.get(c.sourceQuestId) ?? 'Задание';
      return {
        id: c.id,
        tier: (c.tier as ChestState['tier']) ?? 'BRONZE',
        status: c.status === 'OPENED' ? 'OPENED' : 'UNOPENED',
        questTitle: sourceTitle,
        prizeId: c.prizeId,
        prizeTitle: prize?.title ?? null,
        createdAt: c.createdAt.toISOString(),
      } satisfies ChestState;
    }),
    prizes: prizeList,
    lines: lines.map(toLineState),
    wheel: {
      segments: segments.map((s) => ({
        id: s.id,
        kind: s.kind as AppState['wheel']['segments'][number]['kind'],
        labelTop: s.labelTop,
        labelSub: s.labelSub,
        value: s.value,
        color: s.color,
        order: s.order,
      })),
      threshold: JACKPOT_THRESHOLD,
    },
    player: playerMeta,
    raffle: raffleState,
  };
}
