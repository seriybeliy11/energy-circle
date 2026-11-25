import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { generatePromoCode, pickPrizeTemplate } from '@/lib/rewards/catalog';
import { buildAppState, isValidPlayerId } from '@/lib/rewards/server';
import type { OpenChestResponse, PrizeState } from '@/lib/rewards/types';

const PRIZE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 дней

function toPrizeState(prize: Awaited<ReturnType<typeof createPrize>>): PrizeState {
  let instructions: string[] = [];
  try {
    const parsed = JSON.parse(prize.instructions);
    if (Array.isArray(parsed)) instructions = parsed.filter((s) => typeof s === 'string');
  } catch {
    instructions = [];
  }
  return {
    id: prize.id,
    tier: prize.tier as PrizeState['tier'],
    title: prize.title,
    description: prize.description,
    valueRub: prize.valueRub ?? null,
    partnerName: prize.partnerName,
    deliveryType: prize.deliveryType as PrizeState['deliveryType'],
    promoCode: prize.promoCode,
    instructions,
    link: prize.link,
    linkLabel: prize.linkLabel,
    expiresAt: prize.expiresAt.toISOString(),
    createdAt: prize.createdAt.toISOString(),
  };
}

async function createPrize(playerId: string, tier: string) {
  const tpl = pickPrizeTemplate(tier as 'BRONZE' | 'SILVER' | 'GOLD');
  return db.prizeRecord.create({
    data: {
      playerId,
      templateId: tpl.id,
      tier,
      title: tpl.title,
      description: tpl.description,
      valueRub: tpl.valueRub ?? null,
      partnerName: tpl.partnerName,
      deliveryType: tpl.deliveryType,
      promoCode: tpl.deliveryType === 'PROMO_CODE' ? generatePromoCode() : null,
      instructions: JSON.stringify(tpl.instructions),
      link: tpl.link,
      linkLabel: tpl.linkLabel,
      expiresAt: new Date(Date.now() + PRIZE_TTL_MS),
    },
  });
}

/** POST /api/chests/open — открыть сундук и получить подарок. */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      playerId?: unknown;
      chestId?: unknown;
    } | null;

    if (
      !body ||
      !isValidPlayerId(body.playerId) ||
      typeof body.chestId !== 'string' ||
      body.chestId.length < 10 ||
      body.chestId.length > 64
    ) {
      return NextResponse.json<OpenChestResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const { playerId, chestId } = body;

    const chest = await db.chest.findFirst({ where: { id: chestId, playerId } });
    if (!chest) {
      return NextResponse.json<OpenChestResponse>(
        { ok: false, error: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    if (chest.status !== 'UNOPENED') {
      return NextResponse.json<OpenChestResponse>(
        { ok: false, error: 'ALREADY_OPENED' },
        { status: 400 },
      );
    }

    const prize = await createPrize(playerId, chest.tier);

    await db.chest.update({
      where: { id: chest.id },
      data: { status: 'OPENED', prizeId: prize.id, openedAt: new Date() },
    });

    const state = await buildAppState(playerId);

    return NextResponse.json<OpenChestResponse>({
      ok: true,
      prize: toPrizeState(prize),
      state,
    });
  } catch (err) {
    console.error('[api/chests/open]', err);
    return NextResponse.json<OpenChestResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
