import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { resolveFlavor } from '@/lib/rewards/catalog';
import { cleanGs1String, parseChestnyZnak } from '@/lib/rewards/codeParser';
import {
  buildAppState,
  ensurePlayer,
  getQuestStates,
  grantPendingChests,
  isValidPlayerId,
} from '@/lib/rewards/server';
import type { ScanResponse } from '@/lib/rewards/types';

/**
 * POST /api/scan — проверка кода Честного знака и зачёт банки.
 * Один код участвует в акции один раз (глобальная уникальность).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      playerId?: unknown;
      code?: unknown;
    } | null;

    if (
      !body ||
      !isValidPlayerId(body.playerId) ||
      typeof body.code !== 'string' ||
      body.code.length < 8 ||
      body.code.length > 200
    ) {
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const playerId = body.playerId;
    const parsed = parseChestnyZnak(body.code);
    if (!parsed) {
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'INVALID_CODE' },
        { status: 400 },
      );
    }

    const code = cleanGs1String(body.code);

    // Код уже participating в акции — «выбывший» код.
    const existing = await db.scan.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'ALREADY_USED' },
        { status: 409 },
      );
    }

    const flavor = resolveFlavor(parsed.gtin);
    await ensurePlayer(playerId);

    const before = await getQuestStates(playerId);

    try {
      await db.scan.create({
        data: {
          playerId,
          code,
          gtin: parsed.gtin,
          serial: parsed.serial,
          flavorKey: flavor.key,
          lineKey: flavor.lineKey,
        },
      });
    } catch {
      // Гонка уникальности: код уже кто-то отсканировал.
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'ALREADY_USED' },
        { status: 409 },
      );
    }

    const states = await getQuestStates(playerId);
    const newChests = await grantPendingChests(playerId, states);
    const state = await buildAppState(playerId);

    const progressedQuestIds = states
      .filter((after) => {
        const prev = before.find((b) => b.id === after.id);
        return prev ? after.progress > prev.progress : true;
      })
      .map((q) => q.id);

    return NextResponse.json<ScanResponse>({
      ok: true,
      flavorName: flavor.name,
      lineName: flavor.lineName,
      newChestIds: newChests.map((c) => c.id),
      progressedQuestIds,
      state,
    });
  } catch (err) {
    console.error('[api/scan]', err);
    return NextResponse.json<ScanResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
