// Seed демо-данных: линейки вкусов, квесты, шаблоны подарков, колесо, раффл,
// выбывшие коды. Идемпотентен — можно запускать повторно.
// Новые квесты/раффлы добавляются такой же записью или из админ-панели.

import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

/* ============ ЛИНЕЙКИ И ВКУСЫ ============ */

const LINES = [
  { key: 'miami', name: 'Miami Chase', subtitle: 'основная линейка', sortOrder: 0 },
  { key: 'hiphop', name: 'Hip-Hop Collection', subtitle: 'лимитированная серия', sortOrder: 1 },
];

const FLAVORS = [
  { key: 'mango', name: 'Mango Storm', gtin: '04670033000119', lineKey: 'miami' },
  { key: 'berry', name: 'Neon Berry', gtin: '04670033000126', lineKey: 'miami' },
  { key: 'citrus', name: 'Citrus Rush', gtin: '04670033000133', lineKey: 'miami' },
  { key: 'peach', name: 'Peach Wave', gtin: '04670033000140', lineKey: 'miami' },
  { key: 'oldschool', name: 'Old School Ice', gtin: '04670033000218', lineKey: 'hiphop' },
  { key: 'boombap', name: 'Boom Bap Punch', gtin: '04670033000225', lineKey: 'hiphop' },
  { key: 'freestyle', name: 'Freestyle Lime', gtin: '04670033000232', lineKey: 'hiphop' },
];

/* ============ КВЕСТЫ ============ */

const QUESTS = [
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

/* ============ ШАБЛОНЫ ПОДАРКОВ ============ */

// instructions — JSON-массив строк.
const T = (arr: string[]) => JSON.stringify(arr);

const CHEST_TEMPLATES = [
  /* --- Бронзовый сундук --- */
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
    instructions: T([
      'Скопируй промокод',
      'Добавь банку Miami Chase в корзину в Самокате',
      'Введи промокод при оформлении — цена станет 0 ₽',
    ]),
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
    instructions: T(['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката']),
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
    instructions: T([
      'Скопируй код активации',
      'Отправь код боту @HQDClubBot в Telegram',
      'Стикерпак появится в твоём наборе',
    ]),
    link: 'https://t.me/HQDClubBot',
    linkLabel: 'Открыть бота',
  },
  /* --- Серебряный сундук --- */
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
    instructions: T(['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката']),
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
    instructions: T(['Скопируй промокод', 'Активируй его в разделе «Доставка» в приложении Самоката']),
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
    instructions: T([]),
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
    instructions: T(['Скопируй код', 'Покажи код на кассе пункта выдачи Самокат Маркет']),
    link: 'https://samokat.ru',
    linkLabel: 'Найти пункт выдачи',
  },
  /* --- Золотой сундук --- */
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
    instructions: T([
      'Перейди на сайт Case-Battle по кнопке ниже',
      'Авторизуйся — скин уже ждёт в профиле',
      'Выведи скин в Steam',
    ]),
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
    instructions: T([]),
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
    instructions: T(['Скопируй код', 'Оформи доставку на hqd.club/promo, указав код']),
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
    instructions: T([
      'Скопируй промокод',
      'Добавь упаковку 10 банок в корзину в Самокате',
      'Введи промокод при оформлении',
    ]),
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
    instructions: T([
      'Скопируй код активации',
      'Отправь код боту @HQDClubBot в Telegram',
    ]),
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
    instructions: T(['Скопируй промокод', 'Введи его в поле промокода в корзине Самоката']),
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
    instructions: T([]),
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
    instructions: T([]),
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
    instructions: T(['Скопируй код', 'Оформи доставку на hqd.club/promo, указав код']),
    link: 'https://hqd.club/promo',
    linkLabel: 'Оформить доставку',
  },
];

/* ============ КОЛЕСО (12 сегментов, соседи джекпота — промахи) ============ */

const WHEEL_SEGMENTS = [
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

/* ============ ВЫБЫВШИЕ КОДЫ (демо отказа) ============ */

const BLOCKED_CODES = [
  { serial: 'OUT0001', reason: 'Выведен из оборота' },
  { serial: 'OUT0002', reason: 'Утилизирована' },
];

/* ============ SEED ============ */

async function main() {
  for (const line of LINES) {
    await db.flavorLine.upsert({
      where: { key: line.key },
      create: line,
      update: line,
    });
  }

  for (const flavor of FLAVORS) {
    await db.flavor.upsert({
      where: { key: flavor.key },
      create: flavor,
      update: flavor,
    });
  }

  for (const quest of QUESTS) {
    await db.quest.upsert({
      where: { id: quest.id },
      create: quest,
      update: quest,
    });
  }

  for (const tpl of CHEST_TEMPLATES) {
    await db.prizeTemplate.upsert({
      where: { id: tpl.id },
      create: tpl,
      update: tpl,
    });
  }

  for (const seg of WHEEL_SEGMENTS) {
    await db.wheelSegment.upsert({
      where: { id: seg.id },
      create: seg,
      update: seg,
    });
  }

  for (const code of BLOCKED_CODES) {
    await db.blockedCode.upsert({
      where: { serial: code.serial },
      create: code,
      update: code,
    });
  }

  // Активный раффл: создаём только если его нет (повторный seed не дублирует).
  const now = new Date();
  const activeRaffle = await db.raffle.findFirst({
    where: { active: true, endsAt: { gt: now } },
    orderBy: { endsAt: 'asc' },
  });
  if (!activeRaffle) {
    await db.raffle.create({
      data: {
        title: 'Годовой запас HQD',
        prize: '240 банок HQD Energy на год вперёд',
        endsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        active: true,
      },
    });
    console.log('Raffle created');
  }

  const counts = {
    lines: await db.flavorLine.count(),
    flavors: await db.flavor.count(),
    quests: await db.quest.count(),
    templates: await db.prizeTemplate.count(),
    segments: await db.wheelSegment.count(),
    raffles: await db.raffle.count(),
    blocked: await db.blockedCode.count(),
  };
  console.log('Seed complete:', counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void db.$disconnect());
