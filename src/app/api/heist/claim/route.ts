/**
 * Эндпоинт выдачи приза: валидация заявки (каталог, телефон, чек Самоката),
 * генерация промокода или СБП-заявки и запись результата в БД.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { buildClaimInstructions, generatePromoCode, getPrizeById } from '@/api/mockData';
import type { ClaimRequest, ClaimResult, DeliveryType } from '@/api/types';

export const dynamic = 'force-dynamic';

const PHONE_PATTERN = /^\+7\d{10}$/;

function isDeliveryType(value: unknown): value is DeliveryType {
  return value === 'PROMO_CODE' || value === 'DEEP_LINK' || value === 'SBP_PAYOUT';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Безопасное сужение unknown из request.json() до полей ClaimRequest. */
function toClaimRequest(raw: unknown): Partial<ClaimRequest> {
  if (!isRecord(raw)) return {};
  const record = raw;
  const body: Partial<ClaimRequest> = {};
  if (typeof record.prizeId === 'string') body.prizeId = record.prizeId;
  if (typeof record.partnerName === 'string') body.partnerName = record.partnerName;
  if (isDeliveryType(record.deliveryType)) body.deliveryType = record.deliveryType;
  if (typeof record.phone === 'string') body.phone = record.phone;
  if (typeof record.receiptUploaded === 'boolean') body.receiptUploaded = record.receiptUploaded;
  return body;
}

export async function POST(request: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'Некорректное тело запроса' }, { status: 400 });
  }

  const body = toClaimRequest(raw);
  const prize = getPrizeById(body.prizeId ?? '');
  if (!prize) {
    return NextResponse.json({ error: 'Приз не найден в каталоге шлюза' }, { status: 400 });
  }

  if (prize.deliveryType === 'SBP_PAYOUT') {
    const phone = body.phone ?? '';
    if (!PHONE_PATTERN.test(phone)) {
      return NextResponse.json({ error: 'Укажи корректный номер телефона' }, { status: 400 });
    }
    if (prize.valueRub >= 500 && body.receiptUploaded !== true) {
      return NextResponse.json({ error: 'Прикрепите скриншот чека из Самоката' }, { status: 400 });
    }
  }

  const promoCode = prize.deliveryType === 'SBP_PAYOUT' ? undefined : generatePromoCode();
  const claimId = String(Math.floor(1000 + Math.random() * 9000));
  const partnerName = body.partnerName || prize.partnerName;
  const instructions = buildClaimInstructions(prize, partnerName, promoCode);
  const redirectUrl =
    prize.deliveryType === 'DEEP_LINK'
      ? `https://partner.example.com/activate?code=${promoCode}&utm_source=hqd_samokat`
      : undefined;

  try {
    await db.claimRecord.create({
      data: {
        prizeId: prize.id,
        prizeTitle: prize.title,
        valueRub: prize.valueRub,
        category: prize.category,
        partnerName,
        deliveryType: prize.deliveryType,
        promoCode: promoCode ?? null,
        phone: body.phone ?? null,
        claimId,
        status: 'ISSUED',
      },
    });
  } catch {
    // Демо-режим: сбой записи в БД не должен ломать выдачу приза пользователю.
  }

  const result: ClaimResult = {
    success: true,
    promoCode,
    redirectUrl,
    instructions,
    expiresInSeconds: 86400,
    expiresAt: Date.now() + 86_400_000,
    claimId,
    message:
      prize.deliveryType === 'SBP_PAYOUT' ? 'Выплата по СБП поступит в течение 2 минут' : undefined,
  };

  return NextResponse.json(result);
}
