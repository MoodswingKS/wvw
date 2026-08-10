import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { RoleCounts } from "@/lib/gameLogic";

const VALID_ROLES = new Set(["WEREWOLF", "SEER", "DOCTOR"]); // extend as new roles are added

// POST /api/rooms/[code]/role-config
// body: { username: string, counts: { [role: string]: number } }
// Host-only. Only meaningful when the room's roleMode is MANUAL — stores
// the counts as-is; validation of counts vs. player count happens at
// /start, once the final player count is known.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { username, counts } = await req.json();

  if (!username || typeof counts !== "object" || counts === null) {
    return NextResponse.json({ error: "username and counts are required" }, { status: 400 });
  }

  for (const [role, count] of Object.entries(counts)) {
    if (!VALID_ROLES.has(role)) {
      return NextResponse.json({ error: `Unknown role: ${role}` }, { status: 400 });
    }
    if (typeof count !== "number" || count < 0 || !Number.isInteger(count)) {
      return NextResponse.json({ error: `Count for ${role} must be a non-negative integer` }, { status: 400 });
    }
  }

  const room = await prisma.room.findUnique({ where: { code: code.toUpperCase() } });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  if (room.status !== "LOBBY") {
    return NextResponse.json({ error: "Can't change role config after the game has started" }, { status: 409 });
  }

  const membership = await prisma.roomMembership.findFirst({
    where: { roomId: room.id, user: { username } },
  });
  if (!membership?.isHost) {
    return NextResponse.json({ error: "Only the host can configure roles" }, { status: 403 });
  }

  const updated = await prisma.room.update({
    where: { id: room.id },
    data: { roleCounts: counts as RoleCounts },
  });

  return NextResponse.json({ roleCounts: updated.roleCounts });
}
