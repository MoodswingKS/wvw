import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildRoleDeck, buildRoleDeckFromCounts, type RoleCounts } from "@/lib/gameLogic";

// POST /api/rooms/[code]/start
// Assigns a shuffled role to every member (AUTO: scaled from player
// count; MANUAL: from the counts set via /role-config), sets status
// NIGHT, dayNumber 1, and starts the phase timer.
// Only the host should be allowed to call this — add auth/session checks
// once you have real auth in place.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { memberships: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "LOBBY") {
    return NextResponse.json({ error: "Game already started" }, { status: 409 });
  }

  let deck;
  try {
    if (room.roleMode === "MANUAL") {
      if (!room.roleCounts) {
        return NextResponse.json({ error: "Configure roles before starting" }, { status: 400 });
      }
      deck = buildRoleDeckFromCounts(room.roleCounts as RoleCounts, room.memberships.length);
    } else {
      deck = buildRoleDeck(room.memberships.length);
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const phaseEndsAt = new Date(Date.now() + room.roundSeconds * 1000);

  await prisma.$transaction([
    ...room.memberships.map((m, i) =>
      prisma.roomMembership.update({
        where: { id: m.id },
        data: { role: deck[i] },
      })
    ),
    prisma.room.update({
      where: { id: room.id },
      data: { status: "NIGHT", dayNumber: 1, phaseEndsAt },
    }),
  ]);

  return NextResponse.json({ status: "NIGHT", dayNumber: 1, phaseEndsAt });
}
