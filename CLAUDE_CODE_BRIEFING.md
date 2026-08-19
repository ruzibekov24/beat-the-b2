# Can You Beat The B2? — Claude Code uchun brifing

## Loyiha haqida

**Can You Beat The B2?** — 7 kunlik raqobatchi ingliz tili sinov platformasi.
Foydalanuvchilar Telegram yoki Google orqali ro'yxatdan o'tadi, o'z darajasini
(A1-A2 / B1 / B2 / C1) tanlaydi va **qulflaydi** (bir marta, o'zgartirib
bo'lmaydi), keyin 7 kun davomida turli formatdagi challenge'larni bajarib,
leaderboard'da o'rin uchun kurashadi. G'olib 1 yillik "Ustoz AI Premium"
mukofotini yutadi.

Dizayn uslubi: **brutalist** — qattiq qora border (`border-2`), offset
qora soya (`hard-shadow`), Archivo Black sarlavhalar, IBM Plex Mono
raqamlar/statistika, gradient yo'q. Barcha emoji Lucide SVG ikonalariga
almashtirilgan.

## Texnologik stek

- **Frontend + Backend**: Next.js 16 (App Router, Turbopack), TypeScript,
  Tailwind CSS — bitta repo, `/api/**` route'lar backend vazifasini bajaradi
- **Database**: PostgreSQL (Neon.tech, bepul tarif) + Prisma ORM 6.16
  (Prisma 7 emas — 7-versiya `schema.prisma`dagi `url = env(...)` sintaksisini
  qo'llab-quvvatlamaydi, shuning uchun ataylab 6.16'da qotirilgan)
- **Auth**: uch usul, barchasi bitta session cookie'ga yozadi:
  1. **Telegram bot login** (asosiy, tavsiya etilgan) — user botga `/start
     TOKEN` yuboradi, bot buni backend'ga tasdiqlaydi, frontend polling
     orqali kutadi
  2. **Google OAuth** (muqobil) — standart authorization code flow
  3. **Telegram Login Widget** (fallback, `/onboarding/telegram`da) —
     Telegram'ning `bugs.telegram.org/c/20732` degan tan olingan,
     hal qilinmagan bug'i tufayli tasdiqlash kodi ba'zan yetib bormaydi,
     shuning uchun asosiy usul emas
- **Telegram bot**: `/telegram-bot/bot.py` — Python, **aiogram emas**,
  faqat `requests` + `python-dotenv` (chunki foydalanuvchida Python 3.14
  bor, aiogram'ning `pydantic-core` bog'liqligi Rust compile talab qiladi
  va yangi Python versiyalarida buzilgan). Long polling orqali ishlaydi,
  backend bilan HTTP orqali gaplashadi, database'ga bevosita tegmaydi.
- **Deploy**: Vercel (frontend+backend) + Neon (DB). Bot xizmati alohida
  joyda ishga tushirilishi kerak (hozircha lokal, keyinchalik Railway
  yoki shunga o'xshash joyda doimiy ishlaydigan qilish kerak).

## Loyiha strukturasi

```
src/
  app/
    page.tsx                    — landing page (brutalist)
    onboarding/page.tsx          — login tanlash (Telegram bot / Google)
    onboarding/telegram/page.tsx — Telegram Login Widget fallback
    onboarding/level/page.tsx    — ikki bosqichli daraja qulflash oqimi
    home/page.tsx                — kunlik hub, DB'dan dinamik
    challenge/[id]/page.tsx      — challenge o'tkazish sahifasi (timer,
                                    focus mode, natija)
    leaderboard/, profile/
    admin/(protected)/           — admin panel (dashboard, users,
                                    challenges, reading, listening,
                                    leaderboard, referrals, settings)
    admin/login/                 — admin login (himoyalanmagan route)
    api/
      auth/telegram/             — Telegram Login Widget backend
      auth/telegram-bot/
        start/                  — login token yaratish
        status/                 — frontend polling uchun
        confirm/                — bot chaqiradi, tokenni tasdiqlaydi
      auth/google/, auth/google/callback/  — Google OAuth
      level/select/, level/confirm/        — daraja qulflash backend
      home/, challenges/, leaderboard/, profile/
      admin/**                             — admin CRUD, requireAdmin() bilan
      bot/**                               — faqat bot xizmati chaqiradigan
                                              endpoint'lar (X-Bot-Secret bilan)
  components/
    ui/            — Button, Card (asosiy dizayn tizimi)
    shared/        — TopNav, LevelBadge, ThemeProvider,
                      ChallengeDayIcon, AchievementIcon,
                      TelegramLoginButton
    admin/         — AdminShell (sidebar)
  lib/
    levels.ts                — daraja ranglar/multiplikatorlar/matnlar
                                (yagona manba)
    server/
      db.ts                  — Prisma client singleton
      auth.ts                — session/admin session cookie boshqaruvi
      google-auth.ts         — Google OAuth helper
      scoring.ts             — server-side ball hisoblash (frontendga
                                hech qachon ishonmaydi)
      ai-opponent.ts          — AI Battle raqib simulyatori (MVP,
                                keyin real AI API bilan almashtirsa
                                bo'ladi)
      achievements.ts         — achievement unlock tekshiruvi
      storage.ts               — fayl yuklash abstraksiyasi
      require-admin.ts,
      require-bot.ts           — route guard'lar
prisma/
  schema.prisma    — to'liq DB schema
  seed.ts          — achievement'lar, admin user, demo challenge'lar
telegram-bot/
  bot.py           — asosiy bot (requests-based, aiogram emas)
  notify_server.py — ixtiyoriy, admin'dan broadcast xabar yuborish uchun
```

## Muhim arxitektura qarorlari (bularni o'zgartirmang, sabab ostida yozilgan)

1. **Prisma 6.16, 7 emas** — `package.json`da qotirilgan versiya. Agar
   kimdir `npm update` qilsa, Prisma 7'ga o'tib ketishi va
   `schema.prisma`dagi `url = env("DATABASE_URL")` xato berishi mumkin.

2. **`User.telegramId` va `User.email` ixtiyoriy, lekin ikkalasi ham
   `@unique`** — chunki user Telegram YOKI Google orqali kirishi mumkin,
   ikkalasi bir vaqtda bo'lmasligi ham mumkin. PostgreSQL'da bir nechta
   `NULL` qiymat `@unique` cheklovini buzmaydi, bu xavfsiz.

3. **Server-side scoring** (`lib/server/scoring.ts`) — frontend hech
   qachon to'g'ri javob yoki ballarni bilmaydi, faqat `selectedOptionId`
   yuboradi. Bu qoidani buzmaslik kerak (anti-cheat asosi).

4. **Admin auth alohida cookie/session** (`b2_admin_session`,
   `sameSite: "lax"`, `NextResponse.cookies.set()` orqali
   to'g'ridan-to'g'ri response'ga yoziladi — `next/headers`dagi
   `cookies()` funksiyasi orqali emas, chunki bu Turbopack dev muhitida
   ishonchsiz ishlagan). Admin sahifalar `(protected)` route group
   ichida, u yerdagi `layout.tsx` server-side `getAdminSession()`ni
   tekshirib, kerak bo'lsa `redirect()` qiladi. **Edge middleware
   ishlatilmaydi** — avval ishlatilgan, lekin Next.js 16'da middleware
   Edge runtime'da JWT tekshiruvini noto'g'ri bajarib, doim login
   sahifasiga qaytarardi. Shuning uchun middleware.ts o'chirilgan.

5. **Telegram bot login token'lari uzunligi orqali farqlanadi** —
   login token `nanoid(24)`, referral kod `nanoid(8)`. Bot
   `bot.py`dagi `handle_start`da `len(payload) >= 20` shartiga
   qarab buni ajratadi. Agar kelajakda referral kod uzunligi
   o'zgartirilsa, bu shart ham yangilanishi kerak.

## HOZIRGI ANIQ MUAMMOLAR (ustuvorlik bo'yicha)

### 1. `window is not defined` — onboarding/page.tsx (KRITIK, tuzatilgan lekin tasdiqlash kerak)
`googleHref()` funksiyasi render paytida `window.location.search`ga
murojaat qilardi, bu Next.js server-side render bosqichida ishlamaydi
(hatto `"use client"` komponentlarda ham, chunki ular baribir bir marta
serverda pre-render qilinadi). **Tuzatish**: `window.location.search`
o'rniga `useSearchParams()` hook'idan foydalanish kerak (Next.js'ning
server-safe versiyasi). Bu tuzatish qilingan, lekin foydalanuvchi buni
hali fayliga qo'ymagan — **birinchi navbatda shuni tekshiring**:
`src/app/onboarding/page.tsx`da `googleHref()` va `startBotLogin()`
funksiyalari `window.location.search` emas, `searchParams.get("ref")`
ishlatayotganini tasdiqlang.

### 2. Bot `409 Conflict` xatosi
Foydalanuvchi bir nechta `python bot.py` jarayonini bir vaqtda ishga
tushirib qo'ygan (eski terminal oynalari yopilmagan). Telegram bitta
bot token uchun faqat bitta polling ulanishini ruxsat beradi. Yechim
foydalanuvchiga aytilgan: barcha python jarayonlarini to'xtatib
(`Get-Process python | Stop-Process -Force`), faqat bitta terminalda
qayta ishga tushirish. **Bu kod muammosi emas**, lekin agar Claude Code
botni qayta ishga tushirsa, avval eski jarayonlar yo'qligini
tekshirishi kerak.

### 3. GitHub push qilinmagan / git repo holati noaniq
Foydalanuvchi bir nechta marta ZIP orqali yangi loyiha nusxalarini
oldi (v3, v4, v5), va ularning ba'zilarida `.git` papkasi yo'q edi
(yangi ZIP'lar git tarixisiz keladi). Oxirgi ma'lum holat: foydalanuvchi
`C:\Projects\beat-the-b2` papkasida ishlayapti, u yerda `git status`
natijasi hali tasdiqlanmagan. **Ehtimoliy stsenariylar**:
- Agar `.git` yo'q bo'lsa: `git init`, `git add .`, `git commit`,
  `git remote add origin https://github.com/ruzibekov24/beat-the-b2.git`,
  `git branch -M main`, `git push -u origin main --force` kerak bo'ladi.
- **DIQQAT**: avvalgi urinishda `node_modules` va `.next` papkalari
  tasodifan commit qilingan edi (256 MB, GitHub 100MB limitidan
  oshgan), chunki `.gitignore` fayli ZIP arxivlash jarayonida
  yo'qolib qolgan edi (nuqta bilan boshlangan fayllar Windows'da
  ba'zan ZIP'dan chiqarilmaydi). **Har doim push qilishdan oldin
  `.gitignore` borligini va `node_modules`/`.next` unda borligini
  tekshiring**: `type .gitignore` yoki `Get-Content .gitignore`.
  Agar fayl yo'q bo'lsa, `prisma/schema.prisma`dan keyin joylashgan
  standart Next.js `.gitignore` shablonini qayta yarating (dependencies,
  .next/, .env*, node_modules va h.k.).

### 4. `.env` fayli takroran yo'qolgan
Foydalanuvchi ZIP orqali yangi nusxa olganda, `.env` fayli (u har doim
`.gitignore`da bo'lgani uchun ZIP'ga kirmaydi) qayta yo'qolib, har safar
qayta to'ldirishga to'g'ri kelgan. Kerakli muhit o'zgaruvchilari:
`.env.example`da to'liq ro'yxat bor. Asosiylari: `DATABASE_URL` (Neon),
`JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`,
`BACKEND_BOT_SECRET` (bot va asosiy `.env`da bir xil bo'lishi shart),
`SEED_ADMIN_USERNAME`, `SEED_ADMIN_PASSWORD`. Google OAuth ixtiyoriy —
agar ishlatilmasa ham build buzilmaydi, lekin qatorlar mavjud bo'lishi
kerak (bo'sh/dummy qiymat bilan).

### 5. Telegram bot xizmati alohida, doimiy ishlashi kerak
`npm run dev` va `python bot.py` — ikkita mustaqil jarayon, ikkalasi
ham parallel ishlab turishi kerak (bot login ishlashi uchun). Bu hali
production'da (Vercel) hal qilinmagan — Vercel serverless bo'lgani
uchun doimiy polling jarayonini ushlab turolmaydi. **Keyingi qadam**:
botni Railway.app yoki shunga o'xshash "always-on" xizmatga deploy
qilish kerak, va u yerdagi `.env`da `BACKEND_URL`ni Vercel production
domeniga (`https://beat-the-b2-xxx.vercel.app` yoki custom domen)
o'zgartirish kerak.

## Tekshirish checklist (har qanday o'zgarishdan keyin)

1. `npx prisma generate` xatosiz o'tishi kerak
2. `npm run build` (yoki hech bo'lmasa `npx next build`) TypeScript
   xatolarisiz o'tishi kerak — ayniqsa Prisma `findUnique`/`upsert`
   chaqiruvlarida faqat `@unique` maydonlar ishlatilganini tekshiring
3. `.env`da yo'q environment variable'ga build vaqtida murojaat
   qilinmasligi kerak (`process.env.X as string` pattern ehtiyot bilan
   ishlatilishi kerak — runtime'da undefined bo'lishi mumkin)
4. Har qanday `window`/`document`/`localStorage` ishlatilgan joy faqat
   `useEffect` ichida yoki event handler'da bo'lishi kerak, komponent
   body'sida (render paytida) emas
5. Git push qilishdan oldin `.gitignore` mavjudligini va
   `node_modules`/`.next`/`.env*` unda borligini tasdiqlang
