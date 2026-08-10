import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateRoomCode } from "@/lib/roomCode";

const MIN_ROUND_SECONDS = 1200;
const MAX_ROUND_SECONDS = 86400;

// POST /api/rooms
// body: { username: string, roundSeconds?: number, roleMode?: "AUTO" | "MANUAL" }
// Creates (or reuses) the host's User, then a new Room with a unique code.
// roundSeconds and roleMode are set once here by the host and apply for
// the life of the room — roundSeconds is used for every night/day phase
// timer, roleMode decides whether role counts are auto-scaled from player
// count or configured by the host in the lobby (see /role-config).
export async function POST(req: NextRequest) {
  const { username, roundSeconds, roleMode } = await req.json();
  if (!username || typeof username !== "string") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  let resolvedRoundSeconds = 3600;
  if (roundSeconds !== undefined) {
    if (
      typeof roundSeconds !== "number" ||
      roundSeconds < MIN_ROUND_SECONDS ||
      roundSeconds > MAX_ROUND_SECONDS
    ) {
      return NextResponse.json(
        { error: `roundSeconds must be between ${MIN_ROUND_SECONDS} and ${MAX_ROUND_SECONDS}` },
        { status: 400 }
      );
    }
    resolvedRoundSeconds = roundSeconds;
  }

  let resolvedRoleMode: "AUTO" | "MANUAL" = "AUTO";
  if (roleMode !== undefined) {
    if (roleMode !== "AUTO" && roleMode !== "MANUAL") {
      return NextResponse.json({ error: "roleMode must be AUTO or MANUAL" }, { status: 400 });
    }
    resolvedRoleMode = roleMode;
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
          roundSeconds: resolvedRoundSeconds,
          roleMode: resolvedRoleMode,
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
