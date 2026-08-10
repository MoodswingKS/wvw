import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveNightActions, checkWinCondition } from "@/lib/gameLogic";
import type { Role } from "@prisma/client";

// POST /api/rooms/[code]/resolve-night
// Call once all night actions are in (host-triggered, or a timer in your UI).
// Applies the kill (respecting doctor protection), returns seer results,
// checks for a win, and advances the room to DAY (or ENDED).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { memberships: true },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "NIGHT") {
    return NextResponse.json({ error: "Not currently night phase" }, { status: 409 });
  }

  const actions = await prisma.nightAction.findMany({
    where: { roomId: room.id, dayNumber: room.dayNumber },
  });

  const targetRoles = new Map<string, Role>(
    room.memberships.filter((m) => m.role).map((m) => [m.id, m.role as Role])
  );

  const result = resolveNightActions(
    actions.map((a) => ({
      actionType: a.actionType,
      actorMembershipId: a.actorId,
      targetMembershipId: a.targetId,
    })),
    targetRoles
  );

  if (result.eliminatedMembershipId) {
    await prisma.roomMembership.update({
      where: { id: result.eliminatedMembershipId },
      data: { isAlive: false },
    });
  }

  const aliveRoles = room.memberships
    .filter((m) => m.isAlive && m.id !== result.eliminatedMembershipId)
    .map((m) => m.role)
    .filter((r): r is Role => r !== null);

  const winner = checkWinCondition(aliveRoles);
  const phaseEndsAt = winner ? null : new Date(Date.now() + room.roundSeconds * 1000);

  await prisma.room.update({
    where: { id: room.id },
    data: { status: winner ? "ENDED" : "DAY", phaseEndsAt },
  });

  return NextResponse.json({
    eliminatedMembershipId: result.eliminatedMembershipId,
    seerResults: result.seerResults,
    winner,
    status: winner ? "ENDED" : "DAY",
    phaseEndsAt,
  });
}
