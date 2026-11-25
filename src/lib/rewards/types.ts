// Общие типы, разделяемые между сервером и клиентом.

export type ChestTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type QuestType = 'SCANS' | 'FLAVORS';
export type DeliveryType = 'PROMO_CODE' | 'DEEP_LINK' | 'SBP_PAYOUT';
export type PrizeSource = 'CHEST' | 'WHEEL' | 'JACKPOT';
export type WheelKind =
  | 'JACKPOT'
  | 'EMPTY'
  | 'SPIN'
  | 'GOLDEN_SPIN'
  | 'TICKET'
  | 'FILL'
  | 'PRIZE';

/** Состояние задания, отправляемое клиенту. */
export interface QuestState {
  id: string;
  title: string;
  desc: string;
  icon: string;
  target: number;
  progress: number;
  /** true — сундук за задание уже выдан. */
  completed: boolean;
  rewardTier: ChestTier;
  /** Для заданий на вкусы: какие вкусы уже отсканированы. */
  flavors?: { name: string; scanned: boolean }[];
}

export interface ChestState {
  id: string;
  tier: ChestTier;
  status: 'UNOPENED' | 'OPENED';
  questTitle: string | null;
  prizeId: string | null;
  prizeTitle: string | null;
  createdAt: string;
}

export interface PrizeState {
  id: string;
  source: PrizeSource;
  tier: ChestTier;
  title: string;
  description: string;
  valueRub: number | null;
  partnerName: string;
  deliveryType: DeliveryType;
  promoCode: string | null;
  instructions: string[];
  link: string;
  linkLabel: string;
  expiresAt: string;
  createdAt: string;
}

/** Сегмент колеса из БД. */
export interface WheelSegmentState {
  id: string;
  kind: WheelKind;
  labelTop: string;
  labelSub: string;
  value: number;
  color: string;
  order: number;
}

export interface WheelConfigState {
  segments: WheelSegmentState[];
  /** Заполнение джекпот-бара, при котором следующий спин — гарантированный джекпот. */
  threshold: number;
}

/** Игровые метрики игрока. */
export interface PlayerMeta {
  spins: number;
  goldenSpins: number;
  jackpotFill: number;
}

/** Активный розыгрыш. */
export interface RaffleState {
  id: string;
  title: string;
  prize: string;
  endsAt: string;
  myTickets: number;
  totalTickets: number;
}

/** Линейка вкусов с каталогом (для демо-сканера). */
export interface LineState {
  key: string;
  name: string;
  subtitle: string;
  flavors: { key: string; name: string; gtin: string }[];
}

export interface AppState {
  scansCount: number;
  quests: QuestState[];
  chests: ChestState[];
  prizes: PrizeState[];
  lines: LineState[];
  wheel: WheelConfigState;
  player: PlayerMeta;
  raffle: RaffleState | null;
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CODE'
  | 'ALREADY_USED'
  | 'CODE_RETIRED'
  | 'NO_SPINS'
  | 'ALREADY_OPENED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';

export interface ScanOkResponse {
  ok: true;
  flavorName: string;
  lineName: string;
  /** Сколько спинов колеса начислено за этот скан. */
  spinsGained: number;
  newChestIds: string[];
  progressedQuestIds: string[];
  state: AppState;
}

export interface ApiErrResponse {
  ok: false;
  error: ApiErrorCode;
}

export type ScanResponse = ScanOkResponse | ApiErrResponse;

export interface OpenChestOkResponse {
  ok: true;
  prize: PrizeState;
  state: AppState;
}

export type OpenChestResponse = OpenChestOkResponse | ApiErrResponse;

export interface StateOkResponse {
  ok: true;
  state: AppState;
}

export type StateResponse = StateOkResponse | ApiErrResponse;

/** Результат прокрутки колеса. */
export interface SpinOkResponse {
  ok: true;
  /** Индекс сегмента, на который visually встаёт стрелка. */
  landIndex: number;
  /** true — промах рядом с джекпотом («победа близка»). */
  nearMiss: boolean;
  /** Потрачен золотой спин (эффекты x2). */
  golden: boolean;
  /** Джекпот гарантирован заполнением бара. */
  forced: boolean;
  kind: WheelKind;
  /** Сила эффекта (зависит от типа сегмента). */
  value: number;
  prize: PrizeState | null;
  state: AppState;
}

export type SpinResponse = SpinOkResponse | ApiErrResponse;

/* ============ АДМИНКА ============ */

export interface AdminQuestInfo {
  id: string;
  title: string;
  type: QuestType;
  lineKey: string | null;
  target: number;
  rewardTier: ChestTier;
  active: boolean;
}

export interface AdminRaffleInfo {
  id: string;
  title: string;
  prize: string;
  endsAt: string;
  active: boolean;
  totalTickets: number;
}

export interface AdminData {
  quests: AdminQuestInfo[];
  raffles: AdminRaffleInfo[];
  lines: { key: string; name: string }[];
}

export interface AdminOkResponse {
  ok: true;
  state: AppState;
  admin: AdminData;
}

export type AdminResponse = AdminOkResponse | ApiErrResponse;
