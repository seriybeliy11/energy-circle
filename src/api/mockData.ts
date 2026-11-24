/**
 * HQD MIAMI CHASE - HEIST LOOTBOX
 * Мок-контент демо: пулы призов (гейминг и СБП), бренды партнеров, мета редкости.
 * Чистые данные и хелперы без React; единственный "недетерминизм" - генерация промокода.
 */

import type {
  ForcedDropId,
  PartnerBrand,
  PrizeCategory,
  PrizeItem,
  PrizeRarity,
} from '@/api/types';

/** Дефолтный партнер гейминг-пула. */
export const DEFAULT_GAMING_PARTNER = 'Case-Battle';

/** Партнер всех денежных призов (выплаты по СБП). */
export const CASH_PARTNER_NAME = 'СБП Шлюз';

/** Id бесплатного кейса, который выдается за валидный датаматрикс. */
export const FREE_CASE_PRIZE_ID = 'case-miami-vice';

export const GAMING_PRIZES: PrizeItem[] = [
  {
    id: 'case-miami-vice',
    title: 'Кейс CS2 «Miami Vice»',
    valueRub: 150,
    category: 'GAMING',
    rarity: 'COMMON',
    image: 'case',
    weight: 26,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
  {
    id: 'steam-100',
    title: '100 ₽ на Steam',
    valueRub: 100,
    category: 'GAMING',
    rarity: 'COMMON',
    image: 'steam',
    weight: 22,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
  {
    id: 'case-neon-rider',
    title: 'Кейс «Neon Rider» + 100 ₽ Steam',
    valueRub: 250,
    category: 'GAMING',
    rarity: 'RARE',
    image: 'case',
    weight: 14,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
  {
    id: 'case-hunter',
    title: 'Кейс CS2 «Hunter Gambit»',
    valueRub: 300,
    category: 'GAMING',
    rarity: 'RARE',
    image: 'case',
    weight: 12,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
  {
    id: 'case-rare-rare',
    title: 'Кейс «Ultra Rare»',
    valueRub: 500,
    category: 'GAMING',
    rarity: 'RARE',
    image: 'case',
    weight: 9,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'DEEP_LINK',
  },
  {
    id: 'skin-ak-redline',
    title: 'AK-47 «Красная линия» (PoT)',
    valueRub: 1500,
    category: 'GAMING',
    rarity: 'EPIC',
    image: 'skin',
    weight: 5,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
  {
    id: 'gloves-sport',
    title: 'Перчатки «Sport Gloves»',
    valueRub: 8000,
    category: 'GAMING',
    rarity: 'EPIC',
    image: 'gloves',
    weight: 1.5,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'DEEP_LINK',
  },
  {
    id: 'knife-butterfly',
    title: 'Нож-бабочка | Градиент',
    valueRub: 45000,
    category: 'GAMING',
    rarity: 'JACKPOT',
    image: 'knife',
    weight: 0.5,
    partnerName: DEFAULT_GAMING_PARTNER,
    deliveryType: 'PROMO_CODE',
  },
];

export const CASH_PRIZES: PrizeItem[] = [
  {
    id: 'sbp-50',
    title: '50 ₽ на СБП',
    valueRub: 50,
    category: 'CASH',
    rarity: 'COMMON',
    image: 'cash',
    weight: 28,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-100',
    title: '100 ₽ на СБП',
    valueRub: 100,
    category: 'CASH',
    rarity: 'COMMON',
    image: 'cash',
    weight: 22,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-200',
    title: '200 ₽ на СБП',
    valueRub: 200,
    category: 'CASH',
    rarity: 'COMMON',
    image: 'cash',
    weight: 15,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-250',
    title: '250 ₽ на СБП',
    valueRub: 250,
    category: 'CASH',
    rarity: 'RARE',
    image: 'cash',
    weight: 10,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-500',
    title: '500 ₽ на СБП',
    valueRub: 500,
    category: 'CASH',
    rarity: 'RARE',
    image: 'cash',
    weight: 10,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-1500',
    title: '1 500 ₽ на СБП',
    valueRub: 1500,
    category: 'CASH',
    rarity: 'EPIC',
    image: 'cash',
    weight: 3,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-10000',
    title: '10 000 ₽ на карту',
    valueRub: 10000,
    category: 'CASH',
    rarity: 'EPIC',
    image: 'coins',
    weight: 0.8,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
  {
    id: 'sbp-50000',
    title: '50 000 ₽ на карту СБП',
    valueRub: 50000,
    category: 'CASH',
    rarity: 'JACKPOT',
    image: 'cash',
    weight: 0.4,
    partnerName: CASH_PARTNER_NAME,
    deliveryType: 'SBP_PAYOUT',
  },
];

export const ALL_PRIZES: PrizeItem[] = [...GAMING_PRIZES, ...CASH_PRIZES];

export const PARTNER_BRANDS: PartnerBrand[] = [
  { id: 'case-battle', name: 'Case-Battle' },
  { id: 'kupikod', name: 'Kupikod' },
  { id: 'forcedrop', name: 'Forcedrop' },
  { id: 'sbp-gateway', name: 'СБП Шлюз' },
  { id: 'custom', name: 'Свой партнер' },
];

/** Форс дропа из скрытой админ-панели: id -> приз в пуле. */
export const FORCED_DROP_PRIZES: Record<ForcedDropId, string> = {
  SKIN_CS2: 'skin-ak-redline',
  CASH_500: 'sbp-500',
  JACKPOT_50K: 'sbp-50000',
};

/** Визуальная мета редкости: цвет, подпись, свечение для глоу-эффектов. */
export interface RarityMeta {
  color: string;
  label: string;
  glow: string;
}

export const RARITY_META: Record<PrizeRarity, RarityMeta> = {
  COMMON: {
    color: '#3B82F6',
    label: 'БАЗОВЫЙ',
    glow: 'rgba(59,130,246,0.35)',
  },
  RARE: {
    color: '#A855F7',
    label: 'РЕДКИЙ',
    glow: 'rgba(168,85,247,0.4)',
  },
  EPIC: {
    color: '#FF2A85',
    label: 'ЭПИК',
    glow: 'rgba(255,42,133,0.45)',
  },
  JACKPOT: {
    color: '#FFD700',
    label: 'ДЖЕКПОТ',
    glow: 'rgba(255,215,0,0.5)',
  },
};

export function getPrizeById(id: string): PrizeItem | undefined {
  return ALL_PRIZES.find((prize) => prize.id === id);
}

export function getPool(category: PrizeCategory): PrizeItem[] {
  return category === 'GAMING' ? GAMING_PRIZES : CASH_PRIZES;
}

/**
 * Пошаговая инструкция выдачи (ровно 3 пункта) в зависимости от типа доставки.
 * promoCode подставляется для PROMO_CODE, иначе текст "ключ активации".
 */
export function buildClaimInstructions(
  prize: PrizeItem,
  partnerName: string,
  promoCode?: string,
): string[] {
  switch (prize.deliveryType) {
    case 'PROMO_CODE':
      return [
        `Скопируй ключ ${promoCode ?? 'активации'}`,
        `Перейди на площадку ${partnerName}`,
        'Активируй кейс или пополнение в разделе «Промокод» за 10 секунд',
      ];
    case 'DEEP_LINK':
      return [
        `Перейди на площадку ${partnerName} по кнопке ниже`,
        'Войди или зарегистрируйся (займет 20 секунд)',
        'Открой кейс — он уже привязан к твоему аккаунту',
      ];
    case 'SBP_PAYOUT':
    default:
      return [
        'Проверь номер телефона — на него придет выплата',
        'Подтверди заявку на вывод',
        'Деньги придут по СБП в течение 2 минут',
      ];
  }
}

const PROMO_DIGITS = '0123456789';
const PROMO_ALNUM_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Случайное целое [0, maxExclusive) через crypto.getRandomValues с фолбэком. */
function randomInt(maxExclusive: number): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function randomChar(charset: string): string {
  return charset.charAt(randomInt(charset.length));
}

/** Промокод вида HQD-MIAMI-8842-X9 (4 цифры + 2 заглавных алфанумерик-символа). */
export function generatePromoCode(): string {
  let digits = '';
  for (let i = 0; i < 4; i += 1) {
    digits += randomChar(PROMO_DIGITS);
  }
  let suffix = '';
  for (let i = 0; i < 2; i += 1) {
    suffix += randomChar(PROMO_ALNUM_UPPER);
  }
  return `HQD-MIAMI-${digits}-${suffix}`;
}

/** Витрина Самоката (магазин, где продается промо-продукт). */
export const SAMOKAT_SHOP_URL = 'https://samokat.ru/';
