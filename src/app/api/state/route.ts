import { NextResponse, type NextRequest } from 'next/server';
import {
  buildAppState,
  ensurePlayer,
  getQuestStates,
  grantPendingChests,
  isValidPlayerId,
} from '@/lib/rewards/server';
import type { StateResponse } from '@/lib/rewards/types';

/** GET /api/state?playerId=... — актуальное состояние игрока. */
export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get('playerId');
    if (!isValidPlayerId(playerId)) {
      return NextResponse.json<StateResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    await ensurePlayer(playerId);
    const states = await getQuestStates(playerId);
    await grantPendingChests(playerId, states);
    const state = await buildAppState(playerId);

    return NextResponse.json<StateResponse>({ ok: true, state });
  } catch (err) {
    console.error('[api/state]', err);
    return NextResponse.json<StateResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
