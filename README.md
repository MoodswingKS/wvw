# Game App

Full-stack Next.js infrastructure: App Router + TypeScript + Prisma (SQLite for dev).

## Setup

```bash
npm install
cp .env.example .env
npm run db:push      # creates dev.db and syncs the Prisma schema
npm run dev          # http://localhost:3000
```

Visit `/api/health` to confirm the database connection is working.

## Project structure

```
app/
  layout.tsx        # root layout
  page.tsx           # home page
  api/health/route.ts # DB health check endpoint
lib/
  prisma.ts           # Prisma client singleton
prisma/
  schema.prisma       # data models (Player, GameSession starter models)
```

## Next steps

1. Design your actual game models in `prisma/schema.prisma` (replace/extend `Player` and `GameSession`).
2. Run `npm run db:push` again after schema changes (or `npm run db:migrate` once you want tracked migrations).
3. Add API routes under `app/api/` for game actions.
4. When ready for production, switch the Prisma datasource `provider` to `postgresql` and point `DATABASE_URL` at a real database (e.g. Supabase, Neon, Railway).
5. If the game needs realtime (moves, multiplayer state), consider adding a WebSocket layer (e.g. Pusher, Ably, or a custom server) — Next.js API routes alone are request/response only.
