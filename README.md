# Can You Beat The B2? 🏆

A 7-day competitive English challenge platform. Choose your level, lock it,
complete daily challenges, climb the leaderboard, and prove yourself.

**CHOOSE YOUR LEVEL. LOCK IT. PROVE IT. BEAT THE B2.**

---

## Architecture

- **Frontend + Backend**: Next.js 14 (App Router), TypeScript, Tailwind CSS —
  a single repo, with `/api/**` routes serving as the backend.
- **Database**: PostgreSQL via Prisma ORM.
- **Auth**: three methods, all writing to the same session cookie:
  1. **Telegram bot login** (primary, recommended) — the user taps "Start" in
     the bot; Telegram guarantees the bot receives their real identity, no
     SMS/code delivery involved. See `/api/auth/telegram-bot/*`.
  2. **Google Sign-In** — standard OAuth2 authorization code flow. See
     `/api/auth/google/*`.
  3. **Telegram Login Widget** (fallback) — HMAC-verified server-side. Kept
     as an option at `/onboarding/telegram`, but note Telegram has a known,
     long-standing bug (bugs.telegram.org/c/20732) where confirmation codes
     are sometimes never delivered — that's why the bot-login method above
     is primary.
  Admin auth is a fully separate cookie/session from all of the above.
- **Telegram Bot**: separate Python (aiogram) service in `/telegram-bot` — it
  talks to the backend over HTTP and never touches the database directly.
- **Storage**: local disk under `/public/uploads` for the MVP (swap
  `src/lib/server/storage.ts` for S3/R2/GCS in production).

All scoring, level-locking, leaderboard ranking, and referral validation
happen server-side. The frontend never sends or trusts scores, and never
receives correct answers before a challenge is submitted.

## Project structure

```
src/
  app/
    page.tsx                 landing page
    onboarding/               registration + two-step level lock flow
    home/                     daily hub (DB-driven, no hardcoded days)
    challenge/[id]/           immersive challenge page (timer, focus mode)
    leaderboard/, profile/
    admin/                    admin dashboard (protected by middleware)
    api/                      all backend routes
      auth/telegram/          Telegram Login verification
      level/select|confirm/   two-step level lock
      home/, challenges/, leaderboard/, profile/
      admin/                  admin-only CRUD (requires admin session)
      bot/                    endpoints used only by the Telegram bot service
  components/
    ui/                       Button, Card — base design system
    shared/                   TopNav, LevelBadge, ThemeProvider
    admin/                    AdminShell (sidebar layout)
  lib/
    levels.ts                 level colors/multipliers/copy — single source of truth
    server/
      db.ts                   Prisma client singleton
      auth.ts                 Telegram verification + session signing
      scoring.ts               server-authoritative grading engine
      ai-opponent.ts           pluggable AI battle opponent (MVP rule-based)
      achievements.ts          achievement unlock checks
      storage.ts               file upload abstraction
      require-admin.ts, require-bot.ts   route guards
  middleware.ts                protects /admin/* pages
prisma/
  schema.prisma                full DB schema
  seed.ts                      achievements, admin user, demo content
telegram-bot/
  bot.py                       polling bot: /start, /leaderboard, /referral
  notify_server.py             internal HTTP server for backend-triggered notifications
```

## 1. Install dependencies

```bash
npm install
```

## 2. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL`, `JWT_SECRET` (e.g. `openssl rand -base64 32`),
`TELEGRAM_BOT_TOKEN`, and the rest — see comments in `.env.example`.

## 3. Configure PostgreSQL

Create a database (locally or hosted, e.g. Supabase/Neon/Railway) and point
`DATABASE_URL` at it.

## 4. Run migrations

```bash
npm run db:generate
npm run db:migrate
```

## 5. Seed demo data

```bash
npm run db:seed
```

This creates:
- Achievement definitions
- An admin user (`SEED_ADMIN_USERNAME` / `SEED_ADMIN_PASSWORD` from `.env`)
- Two demo challenges (Day 1 quiz, Day 2 AI battle) — clearly marked as demo
  content, replace via the admin panel before launch
- Competition settings (start date = now, end date = +7 days)

## 6. Start the development server

```bash
npm run dev
```

Visit `http://localhost:3000`. Admin panel: `http://localhost:3000/admin/login`.

## 7. Create/manage the admin user

The seed script creates one admin user automatically. To add more, insert
directly via `npm run db:studio` (bcrypt-hash the password first) or extend
`prisma/seed.ts`.

## 8. Configure authentication

### Telegram bot login (primary — recommended)

1. Create a bot via @BotFather, note its token and username.
2. Set `TELEGRAM_BOT_TOKEN` and `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` in `.env`.
3. Set `BACKEND_BOT_SECRET` (any random string) — it authenticates calls
   between the bot service and this app.
4. Deploy `telegram-bot/bot.py` as a long-running process (see step 9). It
   must be reachable from the internet is NOT required — it calls out to
   your app, your app never calls it directly for this flow.
5. That's it — `/onboarding` will show "Continue with Telegram" wired to
   `/api/auth/telegram-bot/start`.

### Google Sign-In (secondary)

1. Create OAuth credentials at
   https://console.cloud.google.com/apis/credentials (Web application type).
2. Add an Authorized redirect URI matching `GOOGLE_REDIRECT_URI` exactly,
   e.g. `https://your-domain.com/api/auth/google/callback`.
3. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` in
   `.env`.

### Telegram Login Widget (fallback, optional)

Available at `/onboarding/telegram` using
`src/components/shared/telegram-login-button.tsx`. Requires `/setdomain` in
BotFather pointed at your deployed origin. Note: Telegram has a known,
unresolved bug (bugs.telegram.org/c/20732) where the confirmation code is
sometimes never delivered — don't rely on this as the only login method.

## 9. Configure the Telegram bot service

```bash
cd telegram-bot
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in BOT_TOKEN, BACKEND_URL, BACKEND_BOT_SECRET
python bot.py           # polling loop: /start, /leaderboard, /referral
python notify_server.py # separate process: receives backend-triggered notifications
```

`BACKEND_BOT_SECRET` must match between `telegram-bot/.env` and the main
app's `.env` — it authenticates calls between the two services.

## 10. Configure storage

The MVP writes uploaded audio to `public/uploads/audio`. For production,
replace the implementation in `src/lib/server/storage.ts` with an
S3-compatible client (AWS S3, Cloudflare R2, etc.) — no other code needs to
change, since every caller goes through `uploadAudioFile()`.

## 11. Deploy

- Any Node hosting that supports Next.js (Vercel, Railway, Fly.io, a VPS).
- Run `npm run build` then `npm run start`, or use your platform's Next.js
  preset.
- Run `npm run db:deploy` (uses `prisma migrate deploy`, safe for production)
  as part of your deploy pipeline.
- Deploy the Telegram bot (`bot.py` + `notify_server.py`) as a long-running
  process — a small VM, a container, or a platform that supports background
  workers (Vercel serverless functions can't run a polling bot).

---

## Security notes

- Level locking, scoring, and leaderboard ranking are 100% server-computed —
  see `src/lib/server/scoring.ts` and `src/app/api/level/confirm/route.ts`.
- Challenge questions are stripped of `isCorrect` flags before being sent to
  the client (`src/app/api/challenges/[id]/start/route.ts`).
- Referral rewards are granted exactly once per referred user, enforced by a
  unique DB constraint on `ReferralReward.newUserId`.
- Admin routes are protected by both edge middleware (fast JWT check) and a
  server-side `requireAdmin()` guard in every admin API route.
- No secrets are hardcoded — everything sensitive comes from environment
  variables (see `.env.example`).

## What's MVP vs. what's ready to extend

Per the project priorities, this build implements all P0 features
end-to-end (auth, level lock, home, challenges, scoring, leaderboard,
profile, admin panel, reading/listening management, light/dark mode,
responsive UI) and P1 features (referral system, achievements, Telegram
bot, AI battle architecture, focus/fullscreen mode).

The AI opponent (`src/lib/server/ai-opponent.ts`) is intentionally a single,
clearly-marked integration point — replace `simulateAiOpponent()` with a
call to a real AI API without touching any other file.
