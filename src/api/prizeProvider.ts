/**
 * HQD MIAMI CHASE - HEIST LOOTBOX
 * Слой интеграции с партнерами: сегодня MOCK_DEMO, завтра реальный API.
 * Запросы уходят только на относительные URL - приложение живет за шлюзом.
 */

import type {
  ClaimHistoryEntry,
  ClaimRequest,
  ClaimResult,
  IntegrationMode,
  PartnerBrandId,
  PrizeItem,
} from '@/api/types';
import { CASH_PARTNER_NAME, PARTNER_BRANDS } from '@/api/mockData';

/** Текущий режим интеграции: демо-моки (позже подменяется на реальный шлюз). */
export const INTEGRATION_MODE: IntegrationMode = 'MOCK_DEMO';

/**
 * Итоговое имя площадки для выдачи: денежные призы всегда через СБП Шлюз,
 * гейминг - по выбору админа (или дефолт пула для Case-Battle).
 */
export function resolvePartnerName(
  prize: Pick<PrizeItem, 'category' | 'partnerName'>,
  adminPartnerId: PartnerBrandId,
  customName: string,
): string {
  if (prize.category === 'CASH') {
    return CASH_PARTNER_NAME;
  }
  if (adminPartnerId === 'custom') {
    return customName || 'Partner X';
  }
  if (adminPartnerId === 'case-battle') {
    return prize.partnerName;
  }
  const brand = PARTNER_BRANDS.find((partner) => partner.id === adminPartnerId);
  return brand?.name ?? 'Partner X';
}

/** Отправляет заявку на выдачу приза в партнерский шлюз (relative POST). */
export async function claimPrize(req: ClaimRequest): Promise<ClaimResult> {
  let res: Response;
  try {
    res = await fetch('/api/heist/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });
  } catch {
    throw new Error('Нет связи с партнерским шлюзом');
  }

  if (!res.ok) {
    let partnerError = '';
    try {
      const json = (await res.json()) as { error?: string };
      partnerError = json.error ?? '';
    } catch {
      partnerError = '';
    }
    throw new Error(partnerError || 'Шлюз партнера недоступен');
  }

  try {
    return (await res.json()) as ClaimResult;
  } catch {
    throw new Error('Нет связи с партнерским шлюзом');
  }
}

/** История выдач текущего пользователя (пустой массив при любой ошибке). */
export async function fetchClaimHistory(): Promise<ClaimHistoryEntry[]> {
  try {
    const res = await fetch('/api/heist/history', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      return [];
    }
    const data = (await res.json()) as { claims?: ClaimHistoryEntry[] };
    return data.claims ?? [];
  } catch {
    return [];
  }
}
