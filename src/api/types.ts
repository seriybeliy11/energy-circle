/**
 * HQD MIAMI CHASE - HEIST LOOTBOX
 * Слой интеграции: контракты (интерфейсы) выдачи призов и валидации кодов.
 * Файл используется и клиентом, и сервером - держать свободным от side-effect'ов.
 */

export type IntegrationMode = 'MOCK_DEMO' | 'PROMO_POOL' | 'LIVE_API';

export type PrizeCategory = 'GAMING' | 'CASH';

export type PrizeRarity = 'COMMON' | 'RARE' | 'EPIC' | 'JACKPOT';

export type DeliveryType = 'PROMO_CODE' | 'DEEP_LINK' | 'SBP_PAYOUT';

/** Иконки-ключи: компонент карты рендерит lucide-иконку по этому ключу. */
export type PrizeIconKey =
  | 'case'
  | 'steam'
  | 'skin'
  | 'gloves'
  | 'knife'
  | 'cash'
  | 'coins'
  | 'gift';

/** Форс дропа из скрытой админ-панели (применяется к следующему прокруту). */
export type ForcedDropId = 'SKIN_CS2' | 'CASH_500' | 'JACKPOT_50K';

export type PartnerBrandId =
  | 'case-battle'
  | 'kupikod'
  | 'forcedrop'
  | 'sbp-gateway'
  | 'custom';

export interface PrizeItem {
  id: string;
  /** Например: "Кейс CS2 «Miami Vice»" или "100 ₽ на СБП" */
  title: string;
  /** Номинал в рублях (для отображения юзеру) */
  valueRub: number;
  category: PrizeCategory;
  rarity: PrizeRarity;
  /** Ключ иконки (рендерится на клиенте) */
  image: PrizeIconKey;
  /** Вес вероятности */
  weight: number;
  /** Например: "Case-Battle" или "Kupikod" или "СБП Шлюз" */
  partnerName: string;
  deliveryType: DeliveryType;
}

export interface PartnerBrand {
  id: PartnerBrandId;
  name: string;
}

export interface ClaimRequest {
  prizeId: string;
  partnerName: string;
  deliveryType: DeliveryType;
  /** Только для SBP_PAYOUT */
  phone?: string;
  /** Только для SBP_PAYOUT при сумме >= 500 руб */
  receiptUploaded?: boolean;
}

export interface ClaimResult {
  success: boolean;
  /** Например: "HQD-MIAMI-8842-X9" */
  promoCode?: string;
  /** Ссылка на активацию у партнера (DEEP_LINK) */
  redirectUrl?: string;
  /** Пошаговая инструкция из 3 пунктов */
  instructions: string[];
  /** Таймер жизни кода (86400 сек) */
  expiresInSeconds: number;
  /** Момент (ms, Date.now()) когда код сгорит */
  expiresAt?: number;
  /** Номер заявки, например 4092 */
  claimId?: string;
  /** Опциональное сообщение (для СБП-выплат) */
  message?: string;
}

export interface ClaimHistoryEntry {
  id: string;
  prizeTitle: string;
  valueRub: number;
  partnerName: string;
  promoCode?: string;
  createdAt: string;
}

export interface InventoryItem {
  uid: string;
  prizeId: string;
  title: string;
  valueRub: number;
  rarity: PrizeRarity;
  category: PrizeCategory;
  image: PrizeIconKey;
  partnerName: string;
  deliveryType: DeliveryType;
  wonAt: number;
  claim?: ClaimResult;
  claimStatus: 'UNCLAIMED' | 'CLAIMED';
}

export interface ParsedDatamatrix {
  valid: boolean;
  reason?: 'BAD_FORMAT' | 'ALREADY_USED';
  message?: string;
  gtin?: string;
  serial?: string;
  isSamokatBatch?: boolean;
}
