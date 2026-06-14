# Penarreach

> Bulk email that feels personal. Upload a spreadsheet, write a template with `<<Variable>>` placeholders, and send hundreds of personalised emails from your own Gmail.

**Tech stack**: Next.js 15 (App Router) · TypeScript · Tailwind · ShadCN UI · Clerk · PostgreSQL · Prisma · Gmail API · Nodemailer · React Hook Form · Zod

---

## Table of contents

1. [Architecture](#architecture)
2. [Folder structure](#folder-structure)
3. [Local development](#local-development)
4. [Clerk setup](#clerk-setup)
5. [Google Cloud / Gmail API setup](#google-cloud--gmail-api-setup)
6. [Database migrations](#database-migrations)
7. [Running with Docker](#running-with-docker)
8. [Production deployment](#production-deployment)
9. [How it works](#how-it-works)
10. [Operational notes](#operational-notes)

---

## Architecture

Three logical layers, kept honestly separated:

| Layer            | Lives in                       | Responsibility                                                  |
| ---------------- | ------------------------------ | --------------------------------------------------------------- |
| **Presentation** | `src/app/`, `src/components/`  | React server/client components, route groups, ShadCN UI         |
| **Application**  | `src/server/actions/`          | Server actions invoked from the UI (CRUD, preview, queueing)    |
| **Domain**       | `src/server/services/`, `src/lib/` | Pure business logic — template engine, Gmail sender, campaign processor, Excel parser |

Cross-cutting concerns: `src/lib/auth` (Clerk + AES-256-GCM token encryption), `src/lib/db` (Prisma singleton), `src/middleware.ts` (route protection).

**Why server actions + a few API routes?** Server actions handle synchronous CRUD where the response is the new state. API routes handle the bits that need to be fired and polled — `POST /api/emails/send` returns immediately and the UI polls `GET /api/emails/status` for live progress.

## Folder structure

```
penarreach/
├── prisma/
│   └── schema.prisma                    Postgres schema (6 models + 2 enums)
├── src/
│   ├── app/
│   │   ├── (auth)/                      Sign-in / sign-up (Clerk catch-alls)
│   │   ├── (dashboard)/                 Protected app shell
│   │   │   ├── layout.tsx               Sidebar + topbar
│   │   │   ├── dashboard/               Overview with KPIs
│   │   │   ├── compose/                 New campaign form
│   │   │   ├── templates/               Template CRUD
│   │   │   ├── history/                 Campaign list + detail
│   │   │   └── settings/                Gmail OAuth + profile
│   │   ├── api/
│   │   │   ├── webhooks/clerk/          User sync (Svix-verified)
│   │   │   ├── gmail/{auth,callback,disconnect}/
│   │   │   ├── emails/{send,status}/
│   │   │   ├── campaigns/retry/
│   │   │   └── health/                  For Docker healthcheck
│   │   ├── layout.tsx                   Root with ClerkProvider + Toaster
│   │   ├── page.tsx                     Marketing landing
│   │   └── globals.css                  Tailwind + design tokens
│   ├── components/
│   │   ├── ui/                          ShadCN primitives
│   │   ├── dashboard/                   Sidebar, topbar
│   │   ├── compose/                     Form, dropzone, editor, preview
│   │   ├── templates/                   List + editor dialog
│   │   ├── history/                     List + campaign detail
│   │   └── settings/                    Gmail connection card
│   ├── lib/
│   │   ├── auth/{crypto,get-user}.ts    AES-256-GCM + Clerk helpers
│   │   ├── db/prisma.ts                 Prisma singleton
│   │   ├── email/template-engine.ts     << >> placeholder renderer
│   │   ├── excel/parser.ts              XLSX/CSV → rows + column detection
│   │   ├── gmail/{oauth,sender}.ts      OAuth client + Gmail API sender
│   │   ├── utils/                       cn(), formatDate, formatBytes…
│   │   └── validators/schemas.ts        Zod schemas
│   ├── server/
│   │   ├── actions/                     templates, uploads, campaigns
│   │   └── services/campaign-processor.ts   Queue + retry + finalize
│   └── middleware.ts                    Clerk route protection
├── Dockerfile                           Multi-stage standalone build
├── docker-compose.yml                   App + Postgres
└── package.json
```

## Local development

### 1. Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or use the Compose service)
- Clerk account ([clerk.com](https://clerk.com))
- Google Cloud project with Gmail API enabled

### 2. Install

```bash
git clone <repo>
cd penarreach
npm install
cp .env.example .env.local
```

### 3. Configure `.env.local`

Open `.env.local` and fill in:

| Variable | Where to get it |
| --- | --- |
| `DATABASE_URL` | Your Postgres connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` | Clerk Dashboard → API Keys |
| `CLERK_WEBHOOK_SECRET` | Clerk Dashboard → Webhooks → Add endpoint → Signing secret |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs & Services → Credentials → OAuth 2.0 Client IDs |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/gmail/callback` for dev |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` for dev |
| `ENCRYPTION_KEY` | Generate with: `openssl rand -hex 32` |

### 4. Database

```bash
npm run db:push        # for first-time schema sync (no migrations folder yet)
# OR — recommended for prod parity:
npm run db:migrate     # creates a migration in prisma/migrations
npm run db:generate    # generates Prisma Client
```

### 5. Run

```bash
npm run dev
# Open http://localhost:3000
```

## Clerk setup

1. Create an application in the Clerk Dashboard. Enable **Email + Google** as sign-in methods.
2. Copy the publishable + secret keys into `.env.local`.
3. **Webhook** (for user sync to Postgres):
   - Endpoint: `https://YOUR_DOMAIN/api/webhooks/clerk` (use ngrok in dev)
   - Subscribe to events: `user.created`, `user.updated`, `user.deleted`
   - Copy the signing secret into `CLERK_WEBHOOK_SECRET`

> In dev without a tunnel, the app still works: `requireUser()` does a lazy upsert from Clerk's `currentUser()` if the webhook hasn't fired.

## Google Cloud / Gmail API setup

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a project.
2. **Enable APIs**: enable both *Gmail API* and *Google People API* (the latter for the `userinfo` endpoint).
3. **OAuth consent screen**:
   - User type: External (you can keep it in Testing mode while developing)
   - Scopes: `gmail.send`, `userinfo.email`, `userinfo.profile`
   - Add your Gmail address as a test user while the app is in Testing
4. **Credentials → Create credentials → OAuth client ID**:
   - Application type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/gmail/callback` (dev)
     - `https://YOUR_DOMAIN/api/gmail/callback` (prod)
5. Copy the client ID and secret into `.env.local`.

> **Important**: Gmail only issues a refresh token on the *first consent*. If a user reconnects, Google won't send the refresh token again unless they revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) first. The callback handler catches this and redirects with a clear error message.

## Database migrations

```bash
# Development: creates and applies a migration
npm run db:migrate -- --name add_feature_x

# Production: applies pending migrations only
npm run db:deploy
```

The compose `app` service runs `npx prisma migrate deploy` on every startup, so deployments are zero-touch.

## Running with Docker

The compose file boots Postgres and the app together.

```bash
# 1. Copy env file (it's read by docker-compose for variable interpolation)
cp .env.example .env
# Edit .env with production values

# 2. Build and start
docker compose up --build -d

# 3. Logs
docker compose logs -f app
```

App available on `http://localhost:3000`, Postgres on `localhost:5432`.

## Production deployment

### Option A — Vercel (managed)

1. Push to GitHub.
2. Import the repo into Vercel.
3. Add all `.env.example` variables in *Project Settings → Environment Variables*.
4. Add a Postgres database (Vercel Postgres, Neon, Supabase, RDS — any will work).
5. **Build command**: `prisma migrate deploy && next build` (or run migrations from your CI step).
6. Update redirect URIs:
   - In Clerk: add `https://YOUR_DOMAIN` to allowed origins.
   - In Clerk Webhook: update endpoint to `https://YOUR_DOMAIN/api/webhooks/clerk`.
   - In Google Cloud Console: add `https://YOUR_DOMAIN/api/gmail/callback`.
   - Set `GOOGLE_REDIRECT_URI` and `NEXT_PUBLIC_APP_URL` to your production URL.

> **Vercel function timeouts**: bulk sends > 5 min may exceed Hobby plan limits (60s) or Pro plan limits (300s). For large lists, deploy on a long-running host (option B) or split sends into smaller campaigns.

### Option B — Docker on any VM (recommended for large lists)

```bash
# On your server
git clone <repo> && cd penarreach
cp .env.example .env  # fill it in
docker compose up --build -d
```

Put Caddy/Nginx in front for TLS:

```caddy
your-domain.com {
  reverse_proxy localhost:3000
}
```

### Option C — Fly.io / Railway / Render

The `Dockerfile` builds a standalone Next.js server (`server.js`) that listens on `$PORT`. Drop it into any platform that runs Docker. Set the env vars and you're done.

## How it works

### The variable mapping engine

Anywhere in the To, Cc, Subject, Body, or dynamic-attachment column you can write `<<ColumnName>>`. At render time, `src/lib/email/template-engine.ts`:

- Matches placeholders case-insensitively, tolerating whitespace inside the brackets.
- Reports missing variables (column not in the spreadsheet) so the UI can warn before sending.
- HTML-escapes values when interpolating into the body; inserts raw into headers and paths.

### The campaign lifecycle

```
                  ┌──────────────────────────────────────────────┐
                  │                                              │
   user submits   │   POST /api/emails/send    (fire-and-forget) │
   ComposeForm  ──┼─►  runCampaign(id)                            │
                  │     ├─ materialize: render every row → EmailLog (PENDING)
                  │     ├─ for each: SENDING → Gmail API → SENT/FAILED
                  │     │   with up to 3 retries (RETRYING)
                  │     └─ finalize: COMPLETED / PARTIAL / FAILED
                  │                                              │
   browser polls  │   GET /api/emails/status?id=…                │
   every 2.5s    ─┼─►  returns campaign + live grouped counts    │
                  │                                              │
                  └──────────────────────────────────────────────┘
```

### Token security

- Gmail OAuth access + refresh tokens are encrypted with AES-256-GCM (`src/lib/auth/crypto.ts`) before being written to Postgres.
- `getAuthorizedClient()` decrypts on demand, refreshes the access token when expired, and persists the new token back (re-encrypted).
- Tokens are never logged.

## Operational notes

| Knob | Where | Default |
| --- | --- | --- |
| Inter-send delay (rate limit) | `EMAIL_SEND_DELAY_MS` | 1500 ms |
| Max retries per email | `MAX_ATTEMPTS` in `campaign-processor.ts` | 3 |
| Max spreadsheet size | `uploads.ts` server action | 25 MB |
| Max fixed attachment | `compose-form.tsx` | 10 MB per file |
| Server action body limit | `next.config.mjs` | 50 MB |
| Gmail daily send quota | Google enforced | 500/day (free Gmail), 2000/day (Workspace) |

**Watch your Gmail reputation.** Even though Penarreach throttles, sending hundreds of identical-looking emails from a single account can trigger spam classifiers. Recommendations:

- Personalise enough that bodies differ row-to-row.
- Warm up new accounts gradually.
- Don't send to obviously stale lists.
- Include a real unsubscribe option (you control the body).

## License

Proprietary. © Penarreach.
