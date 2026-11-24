/**
 * История последних 20 выдач призов из таблицы ClaimRecord.
 * При сбое БД эндпоинт деградирует до пустого списка, а не 500-ошибки.
 */
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import type { ClaimHistoryEntry } from '@/api/types';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  try {
    const records = await db.claimRecord.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const claims: ClaimHistoryEntry[] = records.map((record) => ({
      id: record.id,
      prizeTitle: record.prizeTitle,
      valueRub: record.valueRub,
      partnerName: record.partnerName,
      promoCode: record.promoCode ?? undefined,
      createdAt: record.createdAt.toISOString(),
    }));

    return NextResponse.json({ claims });
  } catch {
    return NextResponse.json({ claims: [] });
  }
}
