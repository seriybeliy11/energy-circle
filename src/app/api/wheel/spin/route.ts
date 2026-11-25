import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { buildAppState, ensurePlayer, isValidPlayerId, toPrizeState } from '@/lib/rewards/server';
import { spinWheel } from '@/lib/rewards/wheel';
import type { SpinResponse } from '@/lib/rewards/types';

/**
 * POST /api/wheel/spin — прокрутить колесо (1 скан = 1 спин).
 * Золотые спины расходуются первыми и удваивают эффекты.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as { playerId?: unknown } | null;

    if (!body || !isValidPlayerId(body.playerId)) {
      return NextResponse.json<SpinResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const playerId = body.playerId;
    await ensurePlayer(playerId);

    const result = await spinWheel(playerId);
    if (!result.ok) {
      return NextResponse.json<SpinResponse>(
        { ok: false, error: result.error },
        { status: result.error === 'NO_SPINS' ? 409 : 404 },
      );
    }

    const { outcome } = result;
    const prizeRecord = outcome.prizeId
      ? await db.prizeRecord.findUnique({ where: { id: outcome.prizeId } })
      : null;

    const state = await buildAppState(playerId);

    return NextResponse.json<SpinResponse>({
      ok: true,
      landIndex: outcome.landIndex,
      nearMiss: outcome.nearMiss,
      golden: outcome.golden,
      forced: outcome.forced,
      kind: outcome.kind,
      value: outcome.value,
      prize: prizeRecord ? toPrizeState(prizeRecord) : null,
      state,
    });
  } catch (err) {
    console.error('[api/wheel/spin]', err);
    return NextResponse.json<SpinResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
