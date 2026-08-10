import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/rooms/[code]/join
// body: { username: string }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }
  if (room.status !== "LOBBY") {
    return NextResponse.json({ error: "Game already started" }, { status: 409 });
  }

  const user = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username },
  });

  const membership = await prisma.roomMembership.upsert({
    where: { userId_roomId: { userId: user.id, roomId: room.id } },
    update: {},
    create: { userId: user.id, roomId: room.id },
  });

  return NextResponse.json({ membership });
}
