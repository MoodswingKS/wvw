import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";

// POST /api/rooms
// body: { username: string }
// Creates (or reuses) the host's User, then a new Room with a unique code.
export async function POST(req: NextRequest) {
  const { username } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  const host = await prisma.user.upsert({
    where: { username },
    update: {},
    create: { username },
  });

  // Retry on the rare code collision.
  let room;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      room = await prisma.room.create({
        data: {
          code: generateRoomCode(),
          hostId: host.id,
          memberships: {
            create: { userId: host.id, isHost: true },
          },
        },
        include: { memberships: true },
      });
      break;
    } catch (err: any) {
      if (err?.code === "P2002") continue; // unique constraint on code, retry
      throw err;
    }
  }

  if (!room) {
    return NextResponse.json({ error: "Failed to allocate room code" }, { status: 500 });
  }

  return NextResponse.json({ room }, { status: 201 });
}
