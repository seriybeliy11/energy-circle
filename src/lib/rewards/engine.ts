// Локальный игровой движок демонстрационной версии. Всё считается в браузере:
// никаких серверов и playerId — прогресс одного игрока живёт в сейве,
// который стор persist'ит в localStorage. Функции мутируют переданный draft
// (стор клонирует сейв перед вызовом) и возвращают те же формы ответов,
// что раньше приходили из API.

import { generatePromoCode, TIER_ORDER, weightedPick } from './catalog';
import { cleanGs1String, parseChestnyZnak } from './codeParser';
import {
  BLOCKED_SERIALS,
  DEFAULT_QUESTS,
  LINES,
  PRIZE_TEMPLATES,
  WHEEL_SEGMENTS,
  defaultRaffle,
  type LineDef,
  type QuestDef,
  type RaffleDef,
} from './demoData';
import type {
  AdminData,
  AdminResponse,
  AppState,
  ChestState,
  ChestTier,
  LineState,
  OpenChestResponse,
  PrizeSource,
  PrizeState,
  QuestState,
  RaffleState,
  ScanResponse,
  SpinResponse,
  StateResponse,
} from './types';

/* ============ КОНСТАНТЫ КОЛЕСА ============ */

/** Заполнение бара, при котором следующий спин — гарантированный джекпот. */
export const JACKPOT_THRESHOLD = 100;
/** База заполнения джекпот-бара за любой спин без джекпота. */
export const BASE_FILL_PER_SPIN = 6;
/** Утешительное заполнение за промах («джекпот всё ближе»). */
export const EMPTY_BONUS_FILL = 5;
/** Срок жизни приза. */
export const PRIZE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/* ============ СЕЙВ ============ */

export interface ScanRecord {
  code: string;
  gtin: string;
  serial: string;
  flavorKey: string;
  lineKey: string;
  at: string;
}

export interface ChestRecord {
  id: string;
  tier: ChestTier;
  status: 'UNOPENED' | 'OPENED';
  /** id задания-источника или 'demo' для выданных из демо-панели. */
  sourceQuestId: string | null;
  prizeId: string | null;
  createdAt: string;
  openedAt?: string;
}

/** Прогресс демо-версии — всё, что persist'ится в localStorage. */
export interface PlayerSave {
  version: 2;
  createdAt: string;
  scans: ScanRecord[];
  chests: ChestRecord[];
  prizes: PrizeState[];
  spins: number;
  goldenSpins: number;
  jackpotFill: number;
  missStreak: number;
  /** raffleId → количество билетов. */
  tickets: Record<string, number>;
  /** Каталог квестов (дефолт + созданные в админке). */
  quests: QuestDef[];
  /** Все раффлы (активный один, старые деактивируются). */
  raffles: RaffleDef[];
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneSave(save: PlayerSave): PlayerSave {
  return {
    ...save,
    scans: save.scans.map((s) => ({ ...s })),
    chests: save.chests.map((c) => ({ ...c })),
    prizes: save.prizes.map((p) => ({ ...p })),
    tickets: { ...save.tickets },
    quests: save.quests.map((q) => ({ ...q })),
    raffles: save.raffles.map((r) => ({ ...r })),
  };
}

/** Свежий сейв: дефолтные квесты и активный раффл на 14 дней. */
export function createInitialSave(): PlayerSave {
  return {
    version: 2,
    createdAt: new Date().toISOString(),
    scans: [],
    chests: [],
    prizes: [],
    spins: 0,
    goldenSpins: 0,
    jackpotFill: 0,
    missStreak: 0,
    tickets: {},
    quests: DEFAULT_QUESTS.map((q) => ({ ...q })),
    raffles: [defaultRaffle()],
  };
}

/* ============ ВКУСЫ ============ */

/** Детерминированный хеш строки (djb2). */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Определяет вкус по GTIN. Известные GTIN — из каталога, неизвестные
 * (реальные банки) детерминированно распределяются по вкусам, чтобы один
 * и тот же продукт всегда давал один и тот же вкус.
 */
export function resolveFlavor(gtin: string): {
  key: string;
  name: string;
  lineKey: string;
} {
  for (const line of LINES) {
    const known = line.flavors.find((f) => f.gtin === gtin);
    if (known) return { key: known.key, name: known.name, lineKey: line.key };
  }
  const line = LINES[hashString(gtin) % LINES.length];
  const flavor = line.flavors[hashString(`v${gtin}`) % line.flavors.length];
  return { key: flavor.key, name: flavor.name, lineKey: line.key };
}

/* ============ ЗАДАНИЯ ============ */

/** Состояния заданий по сейву (прогресс + выданные лутбоксы). */
export function getQuestStates(save: PlayerSave): QuestState[] {
  const granted = new Set(
    save.chests.filter((c) => c.sourceQuestId).map((c) => c.sourceQuestId as string),
  );
  const allFlavors = LINES.flatMap((l) => l.flavors);

  return save.quests
    .filter((q) => q.active)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((q) => {
      let progress = 0;
      let flavors: QuestState['flavors'];

      if (q.type === 'SCANS') {
        progress = save.scans.length;
      } else {
        const lineScans = q.lineKey
          ? save.scans.filter((s) => s.lineKey === q.lineKey)
          : save.scans;
        const scannedKeys = new Set(lineScans.map((s) => s.flavorKey));
        progress = scannedKeys.size;
        const pool = q.lineKey
          ? LINES.find((l) => l.key === q.lineKey)?.flavors ?? []
          : allFlavors;
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
        rewardTier: q.rewardTier,
        ...(flavors ? { flavors } : {}),
      } satisfies QuestState;
    });
}

/** Выдаёт лутбоксы за задания, чей прогресс достигнут, но награда ещё не выдана. */
export function grantPendingChests(save: PlayerSave): ChestRecord[] {
  const created: ChestRecord[] = [];
  for (const q of getQuestStates(save)) {
    if (q.progress >= q.target && !q.completed) {
      const chest: ChestRecord = {
        id: uid('ch'),
        tier: q.rewardTier,
        status: 'UNOPENED',
        sourceQuestId: q.id,
        prizeId: null,
        createdAt: new Date().toISOString(),
      };
      save.chests.push(chest);
      created.push(chest);
    }
  }
  return created;
}

/* ============ ПРИЗЫ ============ */

/** Создаёт приз из взвешенного пула шаблонов и кладёт его в сейв. */
function createPrize(save: PlayerSave, source: PrizeSource, tier: string): PrizeState {
  let pool = PRIZE_TEMPLATES.filter((t) => t.source === source && t.tier === tier);
  if (pool.length === 0) {
    // Страховка: если пул пуст — берём любой доступный шаблон источника
    pool = PRIZE_TEMPLATES.filter((t) => t.source === source);
  }
  if (pool.length === 0) {
    pool = PRIZE_TEMPLATES;
  }
  const tpl = weightedPick(pool);

  // Отображаемый уровень: у колеса и джекпота свой пул, маппим в уровень лутбокса
  const displayTier: ChestTier =
    source === 'CHEST' ? (tier as ChestTier) : source === 'JACKPOT' ? 'GOLD' : 'SILVER';

  const prize: PrizeState = {
    id: uid('pz'),
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
    expiresAt: new Date(Date.now() + PRIZE_TTL_MS).toISOString(),
    createdAt: new Date().toISOString(),
  };
  save.prizes.push(prize);
  return prize;
}

/* ============ РАФФЛЫ ============ */

/** Активный раффл (активен и не истёк), самый близкий к концу. */
function activeRaffle(save: PlayerSave): RaffleDef | null {
  const now = Date.now();
  return (
    save.raffles
      .filter((r) => r.active && new Date(r.endsAt).getTime() > now)
      .sort((a, b) => +new Date(a.endsAt) - +new Date(b.endsAt))[0] ?? null
  );
}

/* ============ СОСТОЯНИЕ ============ */

function toLineState(line: LineDef): LineState {
  return {
    key: line.key,
    name: line.name,
    subtitle: line.subtitle,
    flavors: line.flavors.map((f) => ({ key: f.key, name: f.name, gtin: f.gtin })),
  };
}

/** Полное состояние игрока для клиента (производное от сейва). */
export function buildState(save: PlayerSave): AppState {
  const questTitles = new Map(save.quests.map((q) => [q.id, q.title]));
  const raffle = activeRaffle(save);
  const myTickets = raffle ? save.tickets[raffle.id] ?? 0 : 0;

  let raffleState: RaffleState | null = null;
  if (raffle) {
    raffleState = {
      id: raffle.id,
      title: raffle.title,
      prize: raffle.prize,
      endsAt: raffle.endsAt,
      myTickets,
      totalTickets: myTickets,
    };
  }

  const chests: ChestState[] = save.chests
    .slice()
    .sort((a, b) => {
      // не открытые сверху, дальше — новые первыми
      if (a.status !== b.status) return a.status === 'UNOPENED' ? -1 : 1;
      return +new Date(b.createdAt) - +new Date(a.createdAt);
    })
    .map((c) => {
      const prize = c.prizeId ? save.prizes.find((p) => p.id === c.prizeId) ?? null : null;
      const sourceTitle =
        c.sourceQuestId === 'demo'
          ? 'Демо-лутбокс'
          : (c.sourceQuestId ? questTitles.get(c.sourceQuestId) : undefined) ?? 'Задание';
      return {
        id: c.id,
        tier: c.tier,
        status: c.status,
        questTitle: sourceTitle,
        prizeId: c.prizeId,
        prizeTitle: prize?.title ?? null,
        createdAt: c.createdAt,
      } satisfies ChestState;
    });

  return {
    scansCount: save.scans.length,
    quests: getQuestStates(save),
    chests,
    prizes: save.prizes
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    lines: LINES.map(toLineState),
    wheel: {
      segments: WHEEL_SEGMENTS.map((s) => ({ ...s })),
      threshold: JACKPOT_THRESHOLD,
    },
    player: {
      spins: save.spins,
      goldenSpins: save.goldenSpins,
      jackpotFill: save.jackpotFill,
    },
    raffle: raffleState,
  };
}

/* ============ СКАН КОДА ============ */

/**
 * Зачёт банки по коду Честного знака.
 * Проверки: формат → выбывший из оборота → уже использован.
 * Каждый успешный скан: +1 спин колеса + прогресс заданий + лутбоксы.
 */
export function submitCode(save: PlayerSave, rawCode: string): ScanResponse {
  if (typeof rawCode !== 'string' || rawCode.length < 8 || rawCode.length > 200) {
    return { ok: false, error: 'BAD_REQUEST' };
  }

  const parsed = parseChestnyZnak(rawCode);
  if (!parsed) {
    return { ok: false, error: 'INVALID_CODE' };
  }

  const code = cleanGs1String(rawCode);

  // Код выведен из оборота (утилизация/просрочка) — скан отклоняется
  if (BLOCKED_SERIALS.includes(parsed.serial)) {
    return { ok: false, error: 'CODE_RETIRED' };
  }

  // Код уже участвует в акции
  if (save.scans.some((s) => s.code === code)) {
    return { ok: false, error: 'ALREADY_USED' };
  }

  const flavor = resolveFlavor(parsed.gtin);
  const before = getQuestStates(save);

  save.scans.push({
    code,
    gtin: parsed.gtin,
    serial: parsed.serial,
    flavorKey: flavor.key,
    lineKey: flavor.lineKey,
    at: new Date().toISOString(),
  });

  // Каждый скан = один спин колеса
  save.spins += 1;

  const after = getQuestStates(save);
  const newChests = grantPendingChests(save);

  const line = LINES.find((l) => l.key === flavor.lineKey);
  const progressedQuestIds = after
    .filter((q) => {
      const prev = before.find((b) => b.id === q.id);
      return prev ? q.progress > prev.progress : true;
    })
    .map((q) => q.id);

  return {
    ok: true,
    flavorName: flavor.name,
    lineName: line?.name ?? flavor.lineKey,
    spinsGained: 1,
    newChestIds: newChests.map((c) => c.id),
    progressedQuestIds,
  };
}

/* ============ ОТКРЫТИЕ ЛУТБОКСА ============ */

/** Открыть лутбокс и получить подарок из пула уровня. */
export function openChest(save: PlayerSave, chestId: string): OpenChestResponse {
  if (typeof chestId !== 'string' || !chestId) {
    return { ok: false, error: 'BAD_REQUEST' };
  }

  const chest = save.chests.find((c) => c.id === chestId);
  if (!chest) {
    return { ok: false, error: 'NOT_FOUND' };
  }
  if (chest.status !== 'UNOPENED') {
    return { ok: false, error: 'ALREADY_OPENED' };
  }

  const prize = createPrize(save, 'CHEST', chest.tier);
  chest.status = 'OPENED';
  chest.prizeId = prize.id;
  chest.openedAt = new Date().toISOString();

  return { ok: true, prize };
}

/* ============ КОЛЕСО ============ */

/**
 * Прокрутка колеса. Списание: золотые спины расходуются первыми (x2 эффекты).
 * Механики:
 *  - pity: 2 промаха подряд → следующий спин без сегментов-промахов;
 *  - джекпот-бар: каждый спин заполняет бар, при 100% следующий спин — джекпот;
 *  - near-miss: промах показывается соседним с джекпотом сегментом.
 */
export function spinWheel(save: PlayerSave): SpinResponse {
  const golden = save.goldenSpins > 0;
  if (!golden && save.spins <= 0) {
    return { ok: false, error: 'NO_SPINS' };
  }

  const segments = WHEEL_SEGMENTS;
  const jackpotIdx = segments.findIndex((s) => s.kind === 'JACKPOT');
  const forced = jackpotIdx >= 0 && save.jackpotFill >= JACKPOT_THRESHOLD;

  // pity: после двух промахов подряд исключаем пустые сегменты
  let pool = segments;
  if (!forced && save.missStreak >= 2) {
    pool = segments.filter((s) => s.kind !== 'EMPTY');
  }
  if (pool.length === 0) pool = segments;

  const segment = forced && jackpotIdx >= 0 ? segments[jackpotIdx] : weightedPick(pool);
  const segIndex = segments.findIndex((s) => s.id === segment.id);

  const mult = golden ? 2 : 1;
  if (golden) save.goldenSpins -= 1;
  else save.spins -= 1;

  let prize: PrizeState | null = null;
  let value = segment.value;

  // Каждый спин без джекпота приближает джекпот-бар
  if (segment.kind !== 'JACKPOT') {
    save.jackpotFill = Math.min(JACKPOT_THRESHOLD, save.jackpotFill + BASE_FILL_PER_SPIN);
  }

  switch (segment.kind) {
    case 'JACKPOT': {
      save.jackpotFill = 0;
      save.missStreak = 0;
      prize = createPrize(save, 'JACKPOT', 'POOL');
      break;
    }
    case 'EMPTY': {
      save.missStreak += 1;
      save.jackpotFill = Math.min(JACKPOT_THRESHOLD, save.jackpotFill + EMPTY_BONUS_FILL);
      value = BASE_FILL_PER_SPIN + EMPTY_BONUS_FILL;
      break;
    }
    case 'SPIN': {
      save.spins += segment.value * mult;
      value = segment.value * mult;
      save.missStreak = 0;
      break;
    }
    case 'GOLDEN_SPIN': {
      save.goldenSpins += segment.value * mult;
      value = segment.value * mult;
      save.missStreak = 0;
      break;
    }
    case 'TICKET': {
      save.missStreak = 0;
      const tickets = segment.value * mult;
      value = tickets;
      const raffle = activeRaffle(save);
      if (raffle) {
        save.tickets[raffle.id] = (save.tickets[raffle.id] ?? 0) + tickets;
      } else {
        // Нет активного раффла — утешение в джекпот-бар
        save.jackpotFill = Math.min(JACKPOT_THRESHOLD, save.jackpotFill + 10);
      }
      break;
    }
    case 'FILL': {
      save.jackpotFill = Math.min(JACKPOT_THRESHOLD, save.jackpotFill + segment.value * mult);
      value = segment.value * mult;
      save.missStreak = 0;
      break;
    }
    case 'PRIZE': {
      save.missStreak = 0;
      prize = createPrize(save, 'WHEEL', 'POOL');
      break;
    }
  }

  // near-miss: пустой результат показываем соседним с джекпотом сегментом
  let landIndex = segIndex;
  let nearMiss = false;
  if (segment.kind === 'EMPTY' && jackpotIdx >= 0) {
    const n = segments.length;
    const neighbors = [(jackpotIdx + 1) % n, (jackpotIdx - 1 + n) % n].filter(
      (i) => segments[i].kind === 'EMPTY',
    );
    if (neighbors.length > 0 && Math.random() < 0.8) {
      landIndex = neighbors[Math.floor(Math.random() * neighbors.length)];
    }
    const d = Math.abs(landIndex - jackpotIdx);
    nearMiss = d === 1 || d === n - 1;
  }

  return {
    ok: true,
    landIndex,
    nearMiss,
    golden,
    forced,
    kind: segment.kind,
    value,
    prize,
  };
}

/* ============ ДЕМО-ДЕЙСТВИЯ ============ */

export type DemoActionName = 'reset' | 'grant_chests' | 'grant_spins' | 'fill_jackpot';

/**
 * Скрытая демо-панель для показов партнёрам.
 * 'reset' — обнулить прогресс; 'grant_chests' — по лутбоксу каждого уровня;
 * 'grant_spins' — +5 спинов; 'fill_jackpot' — заполнить бар до гарантии.
 */
export function applyDemoAction(save: PlayerSave, action: DemoActionName): StateResponse {
  if (action === 'reset') {
    Object.assign(save, createInitialSave());
  } else if (action === 'grant_chests') {
    for (const tier of TIER_ORDER) {
      save.chests.push({
        id: uid('ch'),
        tier,
        status: 'UNOPENED',
        sourceQuestId: 'demo',
        prizeId: null,
        createdAt: new Date().toISOString(),
      });
    }
  } else if (action === 'grant_spins') {
    save.spins += 5;
  } else if (action === 'fill_jackpot') {
    save.jackpotFill = JACKPOT_THRESHOLD;
  } else {
    return { ok: false, error: 'BAD_REQUEST' };
  }
  return { ok: true };
}

/* ============ АДМИН-ДЕЙСТВИЯ ============ */

/** Данные для админ-панели: квесты, раффлы, линейки. */
export function buildAdminData(save: PlayerSave): AdminData {
  return {
    quests: save.quests
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((q) => ({
        id: q.id,
        title: q.title,
        type: q.type,
        lineKey: q.lineKey,
        target: q.target,
        rewardTier: q.rewardTier,
        active: q.active,
      })),
    raffles: save.raffles
      .slice()
      .sort((a, b) => +new Date(b.endsAt) - +new Date(a.endsAt))
      .map((r) => ({
        id: r.id,
        title: r.title,
        prize: r.prize,
        endsAt: r.endsAt,
        active: r.active,
        totalTickets: save.tickets[r.id] ?? 0,
      })),
    lines: LINES.map((l) => ({ key: l.key, name: l.name })),
  };
}

/**
 * Скрытая админ-панель: гибкое управление квестами и раффлами.
 * action: list | create_quest | delete_quest | create_raffle | delete_raffle
 */
export function applyAdminAction(
  save: PlayerSave,
  action: string,
  extra: Record<string, unknown> = {},
): AdminResponse {
  if (action === 'list') {
    return { ok: true, admin: buildAdminData(save) };
  }

  if (action === 'create_quest') {
    const title = typeof extra.title === 'string' ? extra.title.trim() : '';
    const type = extra.type === 'FLAVORS' || extra.type === 'SCANS' ? extra.type : null;
    const lineKey =
      typeof extra.lineKey === 'string' && extra.lineKey ? extra.lineKey : null;
    const target =
      typeof extra.target === 'number' && Number.isInteger(extra.target)
        ? extra.target
        : NaN;
    const rewardTier =
      typeof extra.rewardTier === 'string' && (TIER_ORDER as string[]).includes(extra.rewardTier)
        ? extra.rewardTier
        : null;

    if (
      !title ||
      title.length < 3 ||
      title.length > 60 ||
      !type ||
      !(target >= 1 && target <= 999) ||
      !rewardTier
    ) {
      return { ok: false, error: 'BAD_REQUEST' };
    }
    if (type === 'FLAVORS' && lineKey && !LINES.some((l) => l.key === lineKey)) {
      return { ok: false, error: 'BAD_REQUEST' };
    }

    const lineName = lineKey ? LINES.find((l) => l.key === lineKey)?.name ?? null : null;
    const desc =
      type === 'SCANS'
        ? `Отсканируй ${target} ${target === 1 ? 'банку' : target < 5 ? 'банки' : 'банок'}`
        : lineName
          ? `Собери все вкусы: ${lineName}`
          : `Попробуй ${target} уникальных вкусов`;

    save.quests.push({
      id: uid('q'),
      title,
      desc,
      icon: type === 'SCANS' ? 'scan' : 'cup',
      type,
      lineKey: type === 'FLAVORS' ? lineKey : null,
      target,
      rewardTier: rewardTier as ChestTier,
      active: true,
      sortOrder: 100 + save.quests.length * 10,
    });
    return { ok: true, admin: buildAdminData(save) };
  }

  if (action === 'delete_quest') {
    if (typeof extra.questId !== 'string' || !extra.questId) {
      return { ok: false, error: 'BAD_REQUEST' };
    }
    save.quests = save.quests.filter((q) => q.id !== extra.questId);
    return { ok: true, admin: buildAdminData(save) };
  }

  if (action === 'create_raffle') {
    const title = typeof extra.title === 'string' ? extra.title.trim() : '';
    const prize = typeof extra.prize === 'string' ? extra.prize.trim() : '';
    const endsAt =
      typeof extra.endsAt === 'string' ? new Date(extra.endsAt).getTime() : NaN;

    if (
      !title ||
      title.length < 3 ||
      title.length > 60 ||
      !prize ||
      prize.length < 3 ||
      prize.length > 120 ||
      Number.isNaN(endsAt) ||
      endsAt <= Date.now()
    ) {
      return { ok: false, error: 'BAD_REQUEST' };
    }

    // Новый раффл деактивирует старые (активным может быть один)
    for (const r of save.raffles) r.active = false;
    save.raffles.push({
      id: uid('r'),
      title,
      prize,
      endsAt: new Date(endsAt).toISOString(),
      active: true,
    });
    return { ok: true, admin: buildAdminData(save) };
  }

  if (action === 'delete_raffle') {
    if (typeof extra.raffleId !== 'string' || !extra.raffleId) {
      return { ok: false, error: 'BAD_REQUEST' };
    }
    save.raffles = save.raffles.filter((r) => r.id !== extra.raffleId);
    return { ok: true, admin: buildAdminData(save) };
  }

  return { ok: false, error: 'BAD_REQUEST' };
}
