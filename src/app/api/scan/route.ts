import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { cleanGs1String, parseChestnyZnak } from '@/lib/rewards/codeParser';
import {
  buildAppState,
  ensurePlayer,
  getLines,
  getQuestStates,
  grantPendingChests,
  isValidPlayerId,
  resolveFlavor,
} from '@/lib/rewards/server';
import type { ScanResponse } from '@/lib/rewards/types';

/**
 * POST /api/scan — проверка кода Честного знака и зачёт банки.
 * Проверки: формат → выбывший из оборота → уже использован.
 * Каждый успешный скан начисляет +1 спин колеса.
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

    // Код выведен из оборота (утилизация/просрочка) — скан отклоняется
    const blocked = await db.blockedCode.findUnique({ where: { serial: parsed.serial } });
    if (blocked) {
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'CODE_RETIRED' },
        { status: 403 },
      );
    }

    // Код уже участвует в акции
    const existing = await db.scan.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'ALREADY_USED' },
        { status: 409 },
      );
    }

    const lines = await getLines();
    const flavor = resolveFlavor(parsed.gtin, lines);
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
      // Гонка уникальности: код уже кто-то отсканировал
      return NextResponse.json<ScanResponse>(
        { ok: false, error: 'ALREADY_USED' },
        { status: 409 },
      );
    }

    // Каждый скан = один спин колеса
    await db.player.update({
      where: { id: playerId },
      data: { spins: { increment: 1 } },
    });

    const states = await getQuestStates(playerId);
    const newChests = await grantPendingChests(playerId, states);
    const state = await buildAppState(playerId);

    const line = lines.find((l) => l.key === flavor.lineKey);

    const progressedQuestIds = states
      .filter((after) => {
        const prev = before.find((b) => b.id === after.id);
        return prev ? after.progress > prev.progress : true;
      })
      .map((q) => q.id);

    return NextResponse.json<ScanResponse>({
      ok: true,
      flavorName: flavor.name,
      lineName: line?.name ?? flavor.lineKey,
      spinsGained: 1,
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
