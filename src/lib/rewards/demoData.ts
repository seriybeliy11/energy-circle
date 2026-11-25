// Статический каталог демо-версии: линейки вкусов, квесты, шаблоны призов,
// сегменты колеса, выбывшие коды. Раньше жил в БД (prisma/seed.ts) — теперь
// это просто константы: приложение полностью клиентское, без сервера.

import type {
  ChestTier,
  DeliveryType,
  PrizeSource,
  QuestType,
  WheelKind,
} from './types';

/* ============ ЛИНЕЙКИ И ВКУСЫ ============ */

export interface FlavorDef {
  key: string;
  name: string;
  gtin: string;
}

export interface LineDef {
  key: string;
  name: string;
  subtitle: string;
  flavors: FlavorDef[];
}

export const LINES: LineDef[] = [
  {
    key: 'miami',
    name: 'Miami Chase',
    subtitle: 'основная линейка',
    flavors: [
      { key: 'mango', name: 'Mango Storm', gtin: '04670033000119' },
      { key: 'berry', name: 'Neon Berry', gtin: '04670033000126' },
      { key: 'citrus', name: 'Citrus Rush', gtin: '04670033000133' },
      { key: 'peach', name: 'Peach Wave', gtin: '04670033000140' },
    ],
  },
  {
    key: 'hiphop',
    name: 'Hip-Hop Collection',
    subtitle: 'лимитированная серия',
    flavors: [
      { key: 'oldschool', name: 'Old School Ice', gtin: '04670033000218' },
      { key: 'boombap', name: 'Boom Bap Punch', gtin: '04670033000225' },
      { key: 'freestyle', name: 'Freestyle Lime', gtin: '04670033000232' },
    ],
  },
];

/* ============ КВЕСТЫ ============ */

export interface QuestDef {
  id: string;
  title: string;
  desc: string;
  icon: string;
  type: QuestType;
  lineKey: string | null;
  target: number;
  rewardTier: ChestTier;
  active: boolean;
  sortOrder: number;
}

export const DEFAULT_QUESTS: QuestDef[] = [
  {
    id: 'first_sip',
    title: 'Первый глоток',
    desc: 'Отсканируй первую банку HQD',
    icon: 'scan',
    type: 'SCANS',
    lineKey: null,
    target: 1,
    rewardTier: 'BRONZE',
    active: true,
    sortOrder: 10,
  },
  {
    id: 'taster',
    title: 'Вкусы Miami Chase',
    desc: 'Собери все 4 вкуса линейки Miami Chase',
    icon: 'cup',
    type: 'FLAVORS',
    lineKey: 'miami',
    target: 4,
    rewardTier: 'SILVER',
    active: true,
    sortOrder: 20,
  },
  {
    id: 'hiphop',
    title: 'Hip-Hop Collection',
    desc: 'Собери все 3 вкуса лимитированной серии',
    icon: 'disc',
    type: 'FLAVORS',
    lineKey: 'hiphop',
    target: 3,
    rewardTier: 'GOLD',
    active: true,
    sortOrder: 30,
  },
  {
    id: 'collector',
    title: 'Коллекционер',
    desc: 'Попробуй 6 уникальных вкусов',
    icon: 'cup',
    type: 'FLAVORS',
    lineKey: null,
    target: 6,
    rewardTier: 'SILVER',
    active: true,
    sortOrder: 40,
  },
  {
    id: 'marathon',
    title: 'Марафон: 10 банок',
    desc: 'Отсканируй 10 банок',
    icon: 'flag',
    type: 'SCANS',
    lineKey: null,
    target: 10,
    rewardTier: 'GOLD',
    active: true,
    sortOrder: 50,
  },
];

/* ============ ШАБЛОНЫ ПРИЗОВ ============ */

export interface PrizeTemplateDef {
  id: string;
  source: PrizeSource;
  /** Для сундуков — уровень ('BRONZE'|'SILVER'|'GOLD'), для колеса и джекпота — 'POOL'. */
  tier: string;
  weight: number;
  title: string;
  description: string;
  valueRub: number | null;
  partnerName: string;
  deliveryType: DeliveryType;
  instructions: string[];
  link: string;
  linkLabel: string;
}

export const PRIZE_TEMPLATES: PrizeTemplateDef[] = [
  /* --- Бронзовый лутбокс --- */
  {
    id: 'bronze_free_can',
    source: 'CHEST',
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
    source: 'CHEST',
    tier: 'BRONZE',
    weight: 40,
    title: 'Скидка 10%',
    description: 'На любой заказ в Самокате',
    valueRub: null,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'bronze_stickers',
    source: 'CHEST',
    tier: 'BRONZE',
    weight: 25,
    title: 'Стикерпак HQD',
    description: 'Эксклюзивный стикерпак в Telegram',
    valueRub: null,
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
  /* --- Серебряный лутбокс --- */
  {
    id: 'silver_discount25',
    source: 'CHEST',
    tier: 'SILVER',
    weight: 30,
    title: 'Скидка 25%',
    description: 'На любой заказ в Самокате',
    valueRub: null,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'silver_delivery',
    source: 'CHEST',
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
    source: 'CHEST',
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
    source: 'CHEST',
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
  /* --- Золотой лутбокс --- */
  {
    id: 'gold_skin',
    source: 'CHEST',
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
    source: 'CHEST',
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
    source: 'CHEST',
    tier: 'GOLD',
    weight: 25,
    title: 'Мерч-бокс HQD',
    description: 'Худи, стикеры и значки в фирменной коробке',
    valueRub: 3500,
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй код', 'Оформи доставку на hqd.club/promo, указав код'],
    link: 'https://hqd.club/promo',
    linkLabel: 'Оформить доставку',
  },
  {
    id: 'gold_pack10',
    source: 'CHEST',
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
  /* --- Пул колеса (мгновенные призы) --- */
  {
    id: 'wheel_stickers',
    source: 'WHEEL',
    tier: 'POOL',
    weight: 40,
    title: 'Стикерпак HQD',
    description: 'Эксклюзивный стикерпак в Telegram',
    valueRub: null,
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй код активации', 'Отправь код боту @HQDClubBot в Telegram'],
    link: 'https://t.me/HQDClubBot',
    linkLabel: 'Открыть бота',
  },
  {
    id: 'wheel_discount10',
    source: 'WHEEL',
    tier: 'POOL',
    weight: 35,
    title: 'Скидка 10%',
    description: 'На любой заказ в Самокате',
    valueRub: null,
    partnerName: 'Самокат',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката'],
    link: 'https://samokat.ru',
    linkLabel: 'Перейти в Самокат',
  },
  {
    id: 'wheel_sbp100',
    source: 'WHEEL',
    tier: 'POOL',
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
  /* --- Пул джекпота --- */
  {
    id: 'jackpot_sbp5000',
    source: 'JACKPOT',
    tier: 'POOL',
    weight: 60,
    title: 'ДЖЕКПОТ: 5 000 ₽',
    description: 'Мгновенный перевод по СБП на любой банк',
    valueRub: 5000,
    partnerName: 'СБП',
    deliveryType: 'SBP_PAYOUT',
    instructions: [],
    link: '',
    linkLabel: '',
  },
  {
    id: 'jackpot_merchbox',
    source: 'JACKPOT',
    tier: 'POOL',
    weight: 40,
    title: 'ДЖЕКПОТ: Мерч-бокс HQD',
    description: 'Худи, стикеры и значки в фирменной коробке',
    valueRub: 3500,
    partnerName: 'HQD',
    deliveryType: 'PROMO_CODE',
    instructions: ['Скопируй код', 'Оформи доставку на hqd.club/promo, указав код'],
    link: 'https://hqd.club/promo',
    linkLabel: 'Оформить доставку',
  },
];

/* ============ КОЛЕСО (12 сегментов, соседи джекпота — промахи) ============ */

export interface WheelSegmentDef {
  id: string;
  kind: WheelKind;
  labelTop: string;
  labelSub: string;
  value: number;
  weight: number;
  color: string;
  order: number;
}

export const WHEEL_SEGMENTS: WheelSegmentDef[] = [
  { id: 'w00', kind: 'JACKPOT', labelTop: '★', labelSub: 'ДЖЕКПОТ', value: 0, weight: 2, color: '#f2b632', order: 0 },
  { id: 'w01', kind: 'EMPTY', labelTop: '—', labelSub: 'мимо', value: 0, weight: 9, color: '#eef0f4', order: 1 },
  { id: 'w02', kind: 'SPIN', labelTop: '+1', labelSub: 'спин', value: 1, weight: 14, color: '#c9f0d9', order: 2 },
  { id: 'w03', kind: 'TICKET', labelTop: '1', labelSub: 'билет', value: 1, weight: 13, color: '#ded9fa', order: 3 },
  { id: 'w04', kind: 'EMPTY', labelTop: '—', labelSub: 'мимо', value: 0, weight: 9, color: '#eef0f4', order: 4 },
  { id: 'w05', kind: 'FILL', labelTop: '+25', labelSub: 'джекпот', value: 25, weight: 7, color: '#fbd6c9', order: 5 },
  { id: 'w06', kind: 'PRIZE', labelTop: '?', labelSub: 'приз', value: 0, weight: 5, color: '#ffd9c2', order: 6 },
  { id: 'w07', kind: 'EMPTY', labelTop: '—', labelSub: 'мимо', value: 0, weight: 9, color: '#eef0f4', order: 7 },
  { id: 'w08', kind: 'SPIN', labelTop: '+1', labelSub: 'спин', value: 1, weight: 14, color: '#c9f0d9', order: 8 },
  { id: 'w09', kind: 'TICKET', labelTop: '1', labelSub: 'билет', value: 1, weight: 13, color: '#ded9fa', order: 9 },
  { id: 'w10', kind: 'GOLDEN_SPIN', labelTop: '×2', labelSub: 'золотой', value: 1, weight: 4, color: '#f8e3ab', order: 10 },
  { id: 'w11', kind: 'EMPTY', labelTop: '—', labelSub: 'мимо', value: 0, weight: 9, color: '#eef0f4', order: 11 },
];

/* ============ РАФФЛ ПО УМОЛЧАНИЮ ============ */

export interface RaffleDef {
  id: string;
  title: string;
  prize: string;
  endsAt: string;
  active: boolean;
}

/** Активный раффл для нового сейва: 14 дней от создания. */
export function defaultRaffle(now = Date.now()): RaffleDef {
  return {
    id: 'r_year_supply',
    title: 'Годовой запас HQD',
    prize: '240 банок HQD Energy на год вперёд',
    endsAt: new Date(now + 14 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
  };
}

/* ============ ВЫБЫВШИЕ КОДЫ (демо отказа) ============ */

export const BLOCKED_SERIALS = ['OUT0001', 'OUT0002'];
