import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { buildAppState, createPrizeFromTemplate, isValidPlayerId, toPrizeState } from '@/lib/rewards/server';
import type { OpenChestResponse } from '@/lib/rewards/types';

/** POST /api/chests/open — открыть сундук и получить подарок из пула уровня. */
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

    const prize = await createPrizeFromTemplate(playerId, 'CHEST', chest.tier);

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
