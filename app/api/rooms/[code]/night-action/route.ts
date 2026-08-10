import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[code]/night-action
// body: { username: string, actionType: "KILL" | "INVESTIGATE" | "PROTECT", targetUsername: string }
// Validates the actor holds the matching role and is alive before recording the action.
const ROLE_FOR_ACTION = {
  KILL: "WEREWOLF",
  INVESTIGATE: "SEER",
  PROTECT: "DOCTOR",
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { username, actionType, targetUsername } = await req.json();

  if (!username || !targetUsername || !ROLE_FOR_ACTION[actionType as keyof typeof ROLE_FOR_ACTION]) {
    return NextResponse.json({ error: "username, targetUsername, and a valid actionType are required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "NIGHT") {
    return NextResponse.json({ error: "Not currently night phase" }, { status: 409 });
  }
  if (room.phaseEndsAt && new Date() > room.phaseEndsAt) {
    return NextResponse.json({ error: "Time's up for this phase — your action won't count" }, { status: 409 });
  }

  const actor = await prisma.roomMembership.findFirst({
    where: { roomId: room.id, user: { username } },
  });
  const target = await prisma.roomMembership.findFirst({
    where: { roomId: room.id, user: { username: targetUsername } },
  });

  if (!actor || !target) {
    return NextResponse.json({ error: "Actor or target not found in this room" }, { status: 404 });
  }
  if (!actor.isAlive) {
    return NextResponse.json({ error: "Dead players cannot act" }, { status: 403 });
  }
  if (actor.role !== ROLE_FOR_ACTION[actionType as keyof typeof ROLE_FOR_ACTION]) {
    return NextResponse.json({ error: `Only ${ROLE_FOR_ACTION[actionType as keyof typeof ROLE_FOR_ACTION]} can perform this action` }, { status: 403 });
  }

  // One action per actor per night: replace any existing action for this actor/day.
  await prisma.nightAction.deleteMany({
    where: { roomId: room.id, dayNumber: room.dayNumber, actorId: actor.id },
  });
  const action = await prisma.nightAction.create({
    data: {
      roomId: room.id,
      dayNumber: room.dayNumber,
      actorId: actor.id,
      targetId: target.id,
      actionType,
    },
  });

  return NextResponse.json({ action });
}
