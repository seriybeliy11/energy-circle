// Каталог промо-механики: линейки вкусов, задания, сундуки и подарки.
// Используется и сервером (прогресс, выдача), и клиентом (отображение).

import type { ChestTier, DeliveryType, QuestType } from './types';

/* ============ ЛИНЕЙКИ И ВКУСЫ ============ */

export interface LineDef {
  key: string;
  name: string;
  subtitle: string;
}

export interface FlavorDef {
  key: string;
  name: string;
  gtin: string;
  lineKey: string;
  lineName: string;
}

export const LINES: LineDef[] = [
  { key: 'miami', name: 'Miami Chase', subtitle: 'основная линейка' },
  { key: 'hiphop', name: 'Hip-Hop Collection', subtitle: 'лимитированная серия' },
];

export const FLAVORS: FlavorDef[] = [
  { key: 'mango', name: 'Mango Storm', gtin: '04670033000119', lineKey: 'miami', lineName: 'Miami Chase' },
  { key: 'berry', name: 'Neon Berry', gtin: '04670033000126', lineKey: 'miami', lineName: 'Miami Chase' },
  { key: 'citrus', name: 'Citrus Rush', gtin: '04670033000133', lineKey: 'miami', lineName: 'Miami Chase' },
  { key: 'peach', name: 'Peach Wave', gtin: '04670033000140', lineKey: 'miami', lineName: 'Miami Chase' },
  { key: 'oldschool', name: 'Old School Ice', gtin: '04670033000218', lineKey: 'hiphop', lineName: 'Hip-Hop Collection' },
  { key: 'boombap', name: 'Boom Bap Punch', gtin: '04670033000225', lineKey: 'hiphop', lineName: 'Hip-Hop Collection' },
  { key: 'freestyle', name: 'Freestyle Lime', gtin: '04670033000232', lineKey: 'hiphop', lineName: 'Hip-Hop Collection' },
];

export const FLAVOR_BY_GTIN: Record<string, FlavorDef> = Object.fromEntries(
  FLAVORS.map((f) => [f.gtin, f]),
);

/** Детерминированный хеш строки (djb2). */
function hashString(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i += 1) {
    h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/**
 * Определяет вкус по GTIN. Известные GTIN — из каталога,
 * неизвестные (реальные банки) детерминированно распределяются по вкусам,
 * чтобы один и тот же продукт всегда давал один и тот же вкус.
 */
export function resolveFlavor(gtin: string): FlavorDef {
  return FLAVOR_BY_GTIN[gtin] ?? FLAVORS[hashString(gtin) % FLAVORS.length];
}

/* ============ СУНДУКИ ============ */

export interface ChestTierDef {
  key: ChestTier;
  name: string;
  short: string;
  color: string;
  soft: string; // фон для подложек
}

export const CHEST_TIERS: Record<ChestTier, ChestTierDef> = {
  BRONZE: { key: 'BRONZE', name: 'Бронзовый сундук', short: 'Бронза', color: '#a97b56', soft: 'rgba(169,123,86,0.12)' },
  SILVER: { key: 'SILVER', name: 'Серебряный сундук', short: 'Серебро', color: '#8291a3', soft: 'rgba(130,145,163,0.14)' },
  GOLD: { key: 'GOLD', name: 'Золотой сундук', short: 'Золото', color: '#cf9f3d', soft: 'rgba(207,159,61,0.14)' },
};

export const TIER_ORDER: ChestTier[] = ['BRONZE', 'SILVER', 'GOLD'];

/* ============ ЗАДАНИЯ ============ */

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  type: QuestType;
  lineKey?: string;
  target: number;
  reward: ChestTier;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'first_sip',
    title: 'Первый глоток',
    desc: 'Отсканируй первую банку HQD',
    icon: 'scan',
    type: 'SCANS',
    target: 1,
    reward: 'BRONZE',
  },
  {
    id: 'taster',
    title: 'Дегустатор',
    desc: 'Попробуй все 4 вкуса линейки Miami Chase',
    icon: 'cup',
    type: 'FLAVORS',
    lineKey: 'miami',
    target: 4,
    reward: 'SILVER',
  },
  {
    id: 'hiphop',
    title: 'Хип-хоп коллекция',
    desc: 'Собери все 3 вкуса Hip-Hop Collection',
    icon: 'disc',
    type: 'FLAVORS',
    lineKey: 'hiphop',
    target: 3,
    reward: 'GOLD',
  },
  {
    id: 'marathon',
    title: 'Марафон',
    desc: 'Отсканируй 10 банок',
    icon: 'flag',
    type: 'SCANS',
    target: 10,
    reward: 'GOLD',
  },
];

export function questTitleById(id: string): string | null {
  return QUESTS.find((q) => q.id === id)?.title ?? null;
}

/* ============ ПОДАРКИ ============ */

export interface PrizeTemplate {
  id: string;
  tier: ChestTier;
  weight: number;
  title: string;
  description: string;
  valueRub?: number;
  partnerName: string;
  deliveryType: DeliveryType;
  instructions: string[];
  link: string;
  linkLabel: string;
}

export const PRIZE_TEMPLATES: PrizeTemplate[] = [
  /* --- Бронзовый сундук --- */
  {
    id: 'bronze_free_can',
    tier: 'BRONZE',
    weight: 35,
    title: 'Банка HQD бесплатно',
    description: 'Промокод на бесплатную банку Miami Chase в Самокате',
    valueRub: 190,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: [
      'Скопируй промокод',
      'Добавь банку Miami Chase в корзину в Самокате',
      'Введи промокод при оформлении — цена станет 0 ₽',
    ],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'bronze_discount10',
    tier: 'BRONZE',
    weight: 40,
    title: 'Скидка 10%',
    description: 'На любой заказ в Самокате',
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'bronze_stickers',
    tier: 'BRONZE',
    weight: 25,
    title: 'Стикерпак HQD',
    description: 'Эксклюзивный стикерпак в Telegram',
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: [
      'Скопируй код активации',
      'Отправь код боту @HQDClubBot в Telegram',
      'Стикерпак появится в твоём наборе',
    ],
    link: 'https://t.me/HQDClubBot',
    linkLabel: 'Открыть бота',
  },

  /* --- Серебряный сундук --- */
  {
    id: 'silver_discount25',
    tier: 'SILVER',
    weight: 30,
    title: 'Скидка 25%',
    description: 'На любой заказ в Самокате',
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'silver_delivery',
    tier: 'SILVER',
    weight: 20,
    title: 'Бесплатная доставка',
    description: 'Месяц бесплатной доставки в Самокате',
    valueRub: 390,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Активируй его в разделе «Доставка» в приложении Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'silver_sbp100',
    tier: 'SILVER',
    weight: 25,
    title: '100 ₽ на карту',
    description: 'Мгновенный перевод по СБП на любой банк',
    valueRub: 100,
    partnerName: 'СБП',
    deliveryType: 'SBP_PAYOUT',
    instructions: [],
    link: '',
    linkLabel: '',
  },
  {
    id: 'silver_shopper',
    tier: 'SILVER',
    weight: 25,
    title: 'Шоппер HQD',
    description: 'Фирменная сумка-шоппер из плотного хлопка',
    valueRub: 990,
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй код', 'Покажи код на кассе пункта выдачи Самокат Маркет'],
    link: 'https://samokat.ru',
    linkLabel: 'Найти пункт выдачи',
  },

  /* --- Золотой сундук --- */
  {
    id: 'gold_skin',
    tier: 'GOLD',
    weight: 30,
    title: 'Скин CS2',
    description: 'Случайный скин от партнёра Case-Battle',
    valueRub: 800,
    partnerName: 'Case-Battle',
    deliveryType: 'DEEP_LINK',
    instructions: [
      'Перейди на сайт Case-Battle по кнопке ниже',
      'Авторизуйся — скин уже ждёт в профиле',
      'Выведи скин в Steam',
    ],
    link: 'https://case-battle.com',
    linkLabel: 'Перейти к Case-Battle',
  },
  {
    id: 'gold_sbp500',
    tier: 'GOLD',
    weight: 30,
    title: '500 ₽ на карту',
    description: 'Мгновенный перевод по СБП на любой банк',
    valueRub: 500,
    partnerName: 'СБП',
    deliveryType: 'SBP_PAYOUT',
    instructions: [],
    link: '',
    linkLabel: '',
  },
  {
    id: 'gold_merchbox',
    tier: 'GOLD',
    weight: 25,
    title: 'Мерч-бокс HQD',
    description: 'Худи, стикеры и значки в фирменной коробке',
    valueRub: 3500,
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: [
      'Скопируй код',
      'Оформи доставку на hqd.club/promo, указав код',
    ],
    link: 'https://hqd.club/promo',
    linkLabel: 'Оформить доставку',
  },
  {
    id: 'gold_pack10',
    tier: 'GOLD',
    weight: 15,
    title: '10 банок HQD бесплатно',
    description: 'Целая упаковка — 10 банок на выбор в Самокате',
    valueRub: 1900,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: [
      'Скопируй промокод',
      'Добавь упаковку 10 банок в корзину в Самокате',
      'Введи промокод при оформлении',
    ],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
];

/** Взвешенный случайный выбор шаблона подарка для уровня сундука. */
export function pickPrizeTemplate(tier: ChestTier): PrizeTemplate {
  const pool = PRIZE_TEMPLATES.filter((t) => t.tier === tier);
  const total = pool.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * total;
  for (const tpl of pool) {
    roll -= tpl.weight;
    if (roll <= 0) return tpl;
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
