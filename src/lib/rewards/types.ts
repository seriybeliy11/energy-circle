// Общие типы, разделяемые между сервером и клиентом.

export type ChestTier = 'BRONZE' | 'SILVER' | 'GOLD';
export type QuestType = 'SCANS' | 'FLAVORS';
export type DeliveryType = 'PROMO_CODE' | 'DEEP_LINK' | 'SBP_PAYOUT';

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

export interface AppState {
  scansCount: number;
  quests: QuestState[];
  chests: ChestState[];
  prizes: PrizeState[];
}

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'INVALID_CODE'
  | 'ALREADY_USED'
  | 'ALREADY_OPENED'
  | 'NOT_FOUND'
  | 'SERVER_ERROR';

export interface ScanOkResponse {
  ok: true;
  flavorName: string;
  lineName: string;
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
