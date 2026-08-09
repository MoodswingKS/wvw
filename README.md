# Werewolf Online

Full-stack Next.js infrastructure for an online Werewolf/Mafia party game: App Router + TypeScript + Prisma (Postgres via Supabase).

Messaging is intentionally out of scope — players coordinate over WhatsApp or whatever platform they already use. This app handles the parts that need a shared source of truth: who's in the game, what role they have, and how night/day actions resolve.

## Stack

- **Next.js 15** (App Router) — API routes for all game actions
- **Prisma + Postgres** — users, rooms, roles, votes, night actions
- **Supabase** — hosts the Postgres DB; `lib/supabase.ts` is a starting point if you want realtime phase-change notifications later (not required for the current scope)

## Setup

1. Create a free project at [supabase.com](https://supabase.com).
2. From Project Settings → Database → Connection string, copy the **Session** mode string (port 5432) into `.env` as `DATABASE_URL` (see `.env.example`).
3. Install and set up the database:

```bash
npm install
cp .env.example .env   # then fill in your Supabase DATABASE_URL
npm run db:migrate     # creates tables from prisma/schema.prisma
npm run dev             # http://localhost:3000
```

Visit `/api/health` to confirm the database connection.

### Note on Prisma 7

This project uses Prisma 7, where the connection URL lives in **`prisma.config.ts`**, not in `prisma/schema.prisma` — and `PrismaClient` needs an explicit driver adapter (`@prisma/adapter-pg`, wired up in `lib/prisma.ts`). Both already read from `DATABASE_URL` in `.env`, so you shouldn't need to touch either file.

## Data model (prisma/schema.prisma)

- **User** — persistent player identity (just a username for now — no auth yet)
- **Room** — a game instance, joined via a short `code`, tracks `status` (LOBBY/NIGHT/DAY/VOTING/ENDED) and `dayNumber`
- **RoomMembership** — a user's participation in one room: their `role` (Villager/Werewolf/Seer/Doctor...), `isAlive`, `isHost`
- **Vote** — day-phase lynch votes, one per player per day
- **NightAction** — werewolf kills, seer investigations, doctor protects, scoped per day

## Game logic (lib/gameLogic.ts)

Pure functions, no DB access, so they're easy to reason about and test:

- `buildRoleDeck(playerCount)` — shuffles a role deck (werewolves scale ~1 per 4 players, plus one Seer, one Doctor, rest Villagers)
- `resolveNightActions(actions, targetRoles)` — applies the werewolf kill (cancelled if the doctor protected the same target) and returns seer investigation results
- `tallyVotes(votes)` — tallies day votes; ties result in no lynch
- `checkWinCondition(aliveRoles)` — villagers win when no werewolves remain; werewolves win when they equal or outnumber everyone else

## API routes

| Route | Method | Purpose |
|---|---|---|
| `/api/rooms` | POST | Create a room (creates host user, generates join code) |
| `/api/rooms/[code]/join` | POST | Join an existing room by code |
| `/api/rooms/[code]/start` | POST | Assign roles, move LOBBY → NIGHT |
| `/api/rooms/[code]/night-action` | POST | Submit a werewolf kill / seer investigate / doctor protect |
| `/api/rooms/[code]/resolve-night` | POST | Resolve the night's actions, move NIGHT → DAY (or ENDED) |
| `/api/rooms/[code]/vote` | POST | Submit a day lynch vote |
| `/api/rooms/[code]/resolve-vote` | POST | Tally votes, move DAY → NIGHT (or ENDED) |
| `/api/rooms/[code]/me` | GET | Get your own role/status; other players' alive status only (werewolves also see each other) |

None of these routes check *who's allowed* to call them yet — right now anyone who knows a username can act as that player. That's fine for coordinating a resolve-night/resolve-vote call among friends, but before this fully replaces the forum you'll want real auth (see Next steps).

## Next steps

1. **Auth** — right now anything goes as long as you know a username. Consider Supabase Auth or NextAuth so players can't act as each other or the host.
2. **UI** — none of this has a frontend yet; these are pure API routes.
3. **Phase transitions** — resolve-night/resolve-vote are host-triggered right now (call the endpoint manually or from a "resolve" button). You may want a timer-based auto-resolve instead.
4. **More roles** — the schema and role deck only cover Villager/Werewolf/Seer/Doctor; extend `Role` and `buildRoleDeck` as you add roles like Hunter or Witch.
