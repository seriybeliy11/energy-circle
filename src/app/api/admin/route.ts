import { NextResponse, type NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { TIER_ORDER } from '@/lib/rewards/catalog';
import { buildAppState, ensurePlayer, isValidPlayerId } from '@/lib/rewards/server';
import type { AdminData, AdminResponse } from '@/lib/rewards/types';

/** Собирает данные для админ-панели: квесты, раффлы, линейки. */
export async function buildAdminData(): Promise<AdminData> {
  const [quests, raffles, lines] = await Promise.all([
    db.quest.findMany({ orderBy: { sortOrder: 'asc' } }),
    db.raffle.findMany({ orderBy: { endsAt: 'desc' } }),
    db.flavorLine.findMany({ orderBy: { sortOrder: 'asc' } }),
  ]);

  const entries = await db.raffleEntry.groupBy({
    by: ['raffleId'],
    _sum: { tickets: true },
  });
  const ticketMap = new Map(entries.map((e) => [e.raffleId, e._sum.tickets ?? 0]));

  return {
    quests: quests.map((q) => ({
      id: q.id,
      title: q.title,
      type: q.type as AdminData['quests'][number]['type'],
      lineKey: q.lineKey,
      target: q.target,
      rewardTier: q.rewardTier as AdminData['quests'][number]['rewardTier'],
      active: q.active,
    })),
    raffles: raffles.map((r) => ({
      id: r.id,
      title: r.title,
      prize: r.prize,
      endsAt: r.endsAt.toISOString(),
      active: r.active,
      totalTickets: ticketMap.get(r.id) ?? 0,
    })),
    lines: lines.map((l) => ({ key: l.key, name: l.name })),
  };
}

/**
 * POST /api/admin — скрытая админ-панель: гибкое управление квестами и раффлами.
 * action: list | create_quest | delete_quest | create_raffle | delete_raffle
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      playerId?: unknown;
      action?: unknown;
      title?: unknown;
      type?: unknown;
      lineKey?: unknown;
      target?: unknown;
      rewardTier?: unknown;
      questId?: unknown;
      prize?: unknown;
      endsAt?: unknown;
      raffleId?: unknown;
    } | null;

    if (!body || !isValidPlayerId(body.playerId) || typeof body.action !== 'string') {
      return NextResponse.json<AdminResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const { playerId, action } = body;
    await ensurePlayer(playerId);

    if (action === 'list') {
      const [state, admin] = await Promise.all([buildAppState(playerId), buildAdminData()]);
      return NextResponse.json<AdminResponse>({ ok: true, state, admin });
    }

    if (action === 'create_quest') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const type = body.type === 'FLAVORS' || body.type === 'SCANS' ? body.type : null;
      const lineKey = typeof body.lineKey === 'string' && body.lineKey ? body.lineKey : null;
      const target = typeof body.target === 'number' && Number.isInteger(body.target)
        ? body.target
        : NaN;
      const rewardTier =
        typeof body.rewardTier === 'string' &&
        (TIER_ORDER as string[]).includes(body.rewardTier)
          ? body.rewardTier
          : null;

      if (!title || title.length < 3 || title.length > 60 || !type || !(target >= 1 && target <= 999) || !rewardTier) {
        return NextResponse.json<AdminResponse>(
          { ok: false, error: 'BAD_REQUEST' },
          { status: 400 },
        );
      }
      if (type === 'FLAVORS' && lineKey) {
        const line = await db.flavorLine.findUnique({ where: { key: lineKey } });
        if (!line) {
          return NextResponse.json<AdminResponse>(
            { ok: false, error: 'BAD_REQUEST' },
            { status: 400 },
          );
        }
      }

      const count = await db.quest.count();
      const lineName = lineKey
        ? (await db.flavorLine.findUnique({ where: { key: lineKey } }))?.name
        : null;
      const desc =
        type === 'SCANS'
          ? `Отсканируй ${target} ${target === 1 ? 'банку' : target < 5 ? 'банки' : 'банок'}`
          : lineName
            ? `Собери все вкусы: ${lineName}`
            : `Попробуй ${target} уникальных вкусов`;

      await db.quest.create({
        data: {
          id: `q_${Date.now().toString(36)}`,
          title,
          desc,
          icon: type === 'SCANS' ? 'scan' : 'cup',
          type,
          lineKey: type === 'FLAVORS' ? lineKey : null,
          target,
          rewardTier,
          active: true,
          sortOrder: 100 + count * 10,
        },
      });
    } else if (action === 'delete_quest') {
      if (typeof body.questId !== 'string' || !body.questId) {
        return NextResponse.json<AdminResponse>(
          { ok: false, error: 'BAD_REQUEST' },
          { status: 400 },
        );
      }
      await db.quest.deleteMany({ where: { id: body.questId } });
    } else if (action === 'create_raffle') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      const prize = typeof body.prize === 'string' ? body.prize.trim() : '';
      const endsAt = typeof body.endsAt === 'string' ? new Date(body.endsAt) : null;

      if (
        !title ||
        title.length < 3 ||
        title.length > 60 ||
        !prize ||
        prize.length < 3 ||
        prize.length > 120 ||
        !endsAt ||
        Number.isNaN(endsAt.getTime()) ||
        endsAt.getTime() <= Date.now()
      ) {
        return NextResponse.json<AdminResponse>(
          { ok: false, error: 'BAD_REQUEST' },
          { status: 400 },
        );
      }

      // Новый раффл деактивирует старые (активным может быть один)
      await db.raffle.updateMany({ data: { active: false } });
      await db.raffle.create({
        data: { title, prize, endsAt, active: true },
      });
    } else if (action === 'delete_raffle') {
      if (typeof body.raffleId !== 'string' || !body.raffleId) {
        return NextResponse.json<AdminResponse>(
          { ok: false, error: 'BAD_REQUEST' },
          { status: 400 },
        );
      }
      await db.raffle.deleteMany({ where: { id: body.raffleId } });
    } else {
      return NextResponse.json<AdminResponse>(
        { ok: false, error: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const [state, admin] = await Promise.all([buildAppState(playerId), buildAdminData()]);
    return NextResponse.json<AdminResponse>({ ok: true, state, admin });
  } catch (err) {
    console.error('[api/admin]', err);
    return NextResponse.json<AdminResponse>(
      { ok: false, error: 'SERVER_ERROR' },
      { status: 500 },
    );
  }
}
