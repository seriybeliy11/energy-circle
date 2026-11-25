import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { TIER_ORDER } from '@/lib/rewards/catalog';
import {
  buildAppState,
  ensurePlayer,
  JACKPOT_THRESHOLD,
  isValidPlayerId,
} from '@/lib/rewards/server';
import type { StateResponse } from '@/lib/rewards/types';

/**
 * POST /api/demo — скрытая демо-панель для показов партнёрам.
 * action: 'reset' — обнулить прогресс игрока;
 * action: 'grant_chests' — выдать по сундуку каждого уровня;
 * action: 'grant_spins' — начислить 5 спинов колеса;
 * action: 'fill_jackpot' — заполнить джекпот-бар до гарантии.
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
    await ensurePlayer(playerId);

    if (action === 'reset') {
      await db.player.delete({ where: { id: playerId } }).catch(() => null);
      await ensurePlayer(playerId);
    } else if (action === 'grant_chests') {
      for (const tier of TIER_ORDER) {
        await db.chest.create({
          data: { playerId, tier, sourceQuestId: 'demo' },
        });
      }
    } else if (action === 'grant_spins') {
      await db.player.update({
        where: { id: playerId },
        data: { spins: { increment: 5 } },
      });
    } else if (action === 'fill_jackpot') {
      await db.player.update({
        where: { id: playerId },
        data: { jackpotFill: JACKPOT_THRESHOLD },
      });
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
