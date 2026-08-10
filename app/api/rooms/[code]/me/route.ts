import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/rooms/[code]/me?username=alice
// Returns the caller's own membership (role, alive status) plus
// public info about everyone else (username, alive status only —
// never another player's role).
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const username = req.nextUrl.searchParams.get("username");
  if (!username) {
    return NextResponse.json({ error: "username query param is required" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code: code.toUpperCase() },
    include: { memberships: { include: { user: true } } },
  });
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const me = room.memberships.find((m) => m.user.username === username);
  if (!me) return NextResponse.json({ error: "Not a member of this room" }, { status: 404 });

  const others = room.memberships
    .filter((m) => m.id !== me.id)
    .map((m) => ({
      username: m.user.username,
      isAlive: m.isAlive,
      isHost: m.isHost,
      // Werewolves can see each other's identity; everyone else only
      // sees alive/dead status for other players.
      role: me.role === "WEREWOLF" && m.role === "WEREWOLF" ? m.role : undefined,
    }));

  // Seer results are derived from stored NightActions + the target's
  // (persisted) role, rather than only returned once by resolve-night —
  // that way a seer reloading the page doesn't lose their own history.
  let seerHistory: { dayNumber: number; targetUsername: string; isWerewolf: boolean }[] | undefined;
  if (me.role === "SEER") {
    const investigations = await prisma.nightAction.findMany({
      where: { roomId: room.id, actorId: me.id, actionType: "INVESTIGATE" },
      orderBy: { dayNumber: "asc" },
    });
    const membershipById = new Map(room.memberships.map((m) => [m.id, m]));
    seerHistory = investigations.map((inv) => {
      const target = membershipById.get(inv.targetId);
      return {
        dayNumber: inv.dayNumber,
        targetUsername: target?.user.username ?? "unknown",
        isWerewolf: target?.role === "WEREWOLF",
      };
    });
  }

  return NextResponse.json({
    room: {
      code: room.code,
      status: room.status,
      dayNumber: room.dayNumber,
      roundSeconds: room.roundSeconds,
      phaseEndsAt: room.phaseEndsAt,
      roleMode: room.roleMode,
      roleCounts: room.roleCounts,
    },
    me: { username, role: me.role, isAlive: me.isAlive, isHost: me.isHost },
    others,
    seerHistory,
  });
}
