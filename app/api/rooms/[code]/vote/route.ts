import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[code]/vote
// body: { username: string, targetUsername: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { username, targetUsername } = await req.json();
  if (!username || !targetUsername) {
    return NextResponse.json({ error: "username and targetUsername are required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "DAY") {
    return NextResponse.json({ error: "Not currently day phase" }, { status: 409 });
  }
  if (room.phaseEndsAt && new Date() > room.phaseEndsAt) {
    return NextResponse.json({ error: "Time's up for this phase — your vote won't count" }, { status: 409 });
  }

  const voter = await prisma.roomMembership.findFirst({
    where: { roomId: room.id, user: { username } },
  });
  const target = await prisma.roomMembership.findFirst({
    where: { roomId: room.id, user: { username: targetUsername } },
  });
  if (!voter || !target) {
    return NextResponse.json({ error: "Voter or target not found in this room" }, { status: 404 });
  }
  if (!voter.isAlive) {
    return NextResponse.json({ error: "Dead players cannot vote" }, { status: 403 });
  }

  const vote = await prisma.vote.upsert({
    where: { roomId_dayNumber_voterId: { roomId: room.id, dayNumber: room.dayNumber, voterId: voter.id } },
    update: { targetId: target.id },
    create: { roomId: room.id, dayNumber: room.dayNumber, voterId: voter.id, targetId: target.id },
  });

  return NextResponse.json({ vote });
}
