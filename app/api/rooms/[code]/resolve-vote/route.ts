import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tallyVotes, checkWinCondition } from "@/lib/gameLogic";
import type { Role } from "@prisma/client";

// POST /api/rooms/[code]/resolve-vote
// Call once voting closes. Eliminates the top-voted player (ties = no
// lynch), checks for a win, and advances to the next NIGHT (or ENDED).
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
  if (room.status !== "DAY") {
    return NextResponse.json({ error: "Not currently day phase" }, { status: 409 });
  }

  const votes = await prisma.vote.findMany({
    where: { roomId: room.id, dayNumber: room.dayNumber },
  });

  const eliminatedId = tallyVotes(
    votes.map((v) => ({ voterMembershipId: v.voterId, targetMembershipId: v.targetId }))
  );

  if (eliminatedId) {
    await prisma.roomMembership.update({
      where: { id: eliminatedId },
      data: { isAlive: false },
    });
  }

  const aliveRoles = room.memberships
    .filter((m) => m.isAlive && m.id !== eliminatedId)
    .map((m) => m.role)
    .filter((r): r is Role => r !== null);

  const winner = checkWinCondition(aliveRoles);

  await prisma.room.update({
    where: { id: room.id },
    data: winner
      ? { status: "ENDED" }
      : { status: "NIGHT", dayNumber: { increment: 1 } },
  });

  return NextResponse.json({
    eliminatedMembershipId: eliminatedId,
    winner,
    status: winner ? "ENDED" : "NIGHT",
  });
}
