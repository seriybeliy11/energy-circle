import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { TIER_ORDER } from '@/lib/rewards/catalog';
import { buildAppState, ensurePlayer, isValidPlayerId } from '@/lib/rewards/server';
import type { StateResponse } from '@/lib/rewards/types';

/**
 * POST /api/demo — скрытая демо-панель для показов партнёрам.
 * action: 'reset' — обнулить прогресс игрока;
 * action: 'grant_chests' — выдать по сундуку каждого уровня.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      playerId?: unknown;
      action?: unknown;
    } | null;

    if (!body || !isValidPlayerId(body.playerId) || typeof body.action !== 'string') {
      return NextResponse.json<StateResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const { playerId, action } = body;

    if (action === 'reset') {
      await db.player.delete({ where: { id: playerId } }).catch(() => null);
      await ensurePlayer(playerId);
    } else if (action === 'grant_chests') {
      await ensurePlayer(playerId);
      for (const tier of TIER_ORDER) {
        await db.chest.create({
          data: { playerId, tier, sourceQuestId: 'demo' },
        });
      }
    } else {
      return NextResponse.json<StateResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const state = await buildAppState(playerId);
    return NextResponse.json<StateResponse>({ ok: true, state });
  } catch (err) {
    console.error('[api/demo]', err);
    return NextResponse.json<StateResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
