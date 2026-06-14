# Penarreach — Quick Start (Demo Mode)

## Just run this ONE command:

```bash
docker compose -f docker-compose.demo.yml up --build
```

Wait ~2 minutes for the first build. Then open:

**http://localhost:3000**

That's it. No Clerk account needed. No Google Cloud setup. No environment variables to fill in.

## What you get

A fully working app with:
- Pre-seeded demo data (3 templates, 2 campaigns with mixed sent/failed results)
- The whole UI: dashboard, compose, templates, history, settings
- Click through everything to see how it works
- Try the rich-text editor, upload a CSV, preview emails, click around the campaign detail page

## What you CAN'T do in demo mode

- Send real emails (Gmail isn't connected — it'll show "Gmail not connected" on the Compose page)
- Sign-up/sign-in (auth is bypassed; everyone is the "Demo User")

## When you're ready for production

1. Set `DEMO_MODE: '0'` in `docker-compose.yml` (the production one, not demo)
2. Fill in `.env` with real Clerk + Google credentials (see `.env.example` and `README.md`)
3. Run `docker compose up --build`
4. Sign up, connect Gmail in Settings, send real campaigns

## Verifying it's healthy

Once running, visit:
- http://localhost:3000/api/health — DB connectivity check
- http://localhost:3000/api/debug — env var status (will show "demo" stubs)

## Stop / restart

```bash
docker compose -f docker-compose.demo.yml down          # stop
docker compose -f docker-compose.demo.yml down -v       # stop + wipe data
docker compose -f docker-compose.demo.yml up            # restart (no rebuild)
```

## Don't have Docker?

Install Docker Desktop: https://www.docker.com/products/docker-desktop
It's the easiest way to run this without configuring Postgres separately.

## Running natively (no Docker)

Needs: Node 20+, PostgreSQL 15+

```bash
npm install
# Set DATABASE_URL and DEMO_MODE=1 in .env.local
echo "DATABASE_URL=postgresql://localhost:5432/penarreach" > .env.local
echo "DEMO_MODE=1" >> .env.local
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env.local
npm run db:push
npm run db:seed
npm run dev
```
