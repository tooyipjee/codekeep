# CodeKeep — External Services Reference

All services are **free tier** and **opt-in** via environment variables. The game works fully offline without any of them.

---

## Hosting & Deployment

### Vercel + Turso (Recommended — $0/month)
- **What**: Vercel runs the API as serverless functions; Turso hosts the SQLite database remotely
- **Free tiers**:
  - Vercel Hobby: 1M function invocations/month, 100 GB-hours compute
  - Turso Starter: 500 databases, 9GB storage, 500M row reads/month, 25M row writes/month
- **Config files**: `vercel.json`, `api/index.ts`
- **Setup**:
  1. **Create a Turso database**:
     ```
     turso db create codekeep
     turso db tokens create codekeep
     ```
     Save the URL (`libsql://codekeep-<you>.turso.io`) and auth token.
  2. **Deploy to Vercel**: Link your repo at https://vercel.com, set root directory to repo root.
  3. **Set environment variables** in Vercel dashboard:
     - `TURSO_DATABASE_URL` — **required** (the `libsql://...` URL from step 1)
     - `TURSO_AUTH_TOKEN` — **required** (the token from step 1)
     - `JWT_SECRET` — **required** (generate with `openssl rand -hex 32`)
     - `NODE_ENV=production`
     - `GITHUB_TOKEN` — optional, for auto-creating issues from in-game bug reports
  4. Vercel auto-deploys on push to main. Players connect with:
     ```
     pnpm play -- --online https://your-app.vercel.app
     ```
- **URLs**: https://vercel.com, https://turso.tech

### Self-Hosting (Docker Compose)
- Run `docker-compose up -d` for a local/self-hosted server
- Uses local SQLite file — no Turso account needed
- Data persists in a Docker volume (`codekeep-data`)
- Port 3000 by default, change in `docker-compose.yml`

### Quick PvP (Cloudflare Tunnel — no signup needed)
- Run the API locally and expose it to the internet in 2 commands:
  ```
  docker compose up                              # Terminal 1
  cloudflared tunnel --url http://localhost:3000  # Terminal 2
  ```
- Share the `https://xxx.trycloudflare.com` URL with friends
- SQLite lives on your disk, no database service needed

### Fly.io (Alternative — ~$5/month)
- Legacy `fly.toml` is still in the repo if you prefer Fly.io
- Setup: `fly launch` → `fly secrets set JWT_SECRET=...` → `fly deploy`

---

## Database

### Turso (Remote SQLite)
- **What**: Hosted SQLite-compatible database (libSQL). Used by the Vercel deployment.
- **Free tier**: 500 databases, 9GB storage, 500M reads/month, 25M writes/month
- **Integration**: `packages/db` uses `@libsql/client`, which connects to Turso remotely or local SQLite files
- **Setup**:
  1. `npm install -g @turso/cli && turso auth login`
  2. `turso db create codekeep`
  3. `turso db tokens create codekeep`
- **Env vars**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- **Local dev**: Set `TURSO_DATABASE_URL=file:./codekeep.db` — no Turso account needed for local development
- **URL**: https://turso.tech

---

## CI/CD

### GitHub Actions
- **What**: Automated build, test, and deploy on every push/PR to `main`
- **Free tier**: 2,000 minutes/month (private repos), unlimited (public)
- **Config**: `.github/workflows/ci.yml`
- **Jobs**:
  - `build-and-test`: pnpm install, build, test, typecheck
  - `deploy`: Vercel auto-deploys on push to main (configured in Vercel dashboard)
- **URL**: https://github.com/features/actions

---

## Error Tracking

### Sentry
- **What**: Captures unhandled exceptions in the API server
- **Free tier**: 5,000 errors/month, 1 user
- **Integration**: `packages/api/src/middleware/error-handler.ts`
- **Setup**:
  1. Create project at https://sentry.io
  2. Set `SENTRY_DSN` env var on the server
- **Env var**: `SENTRY_DSN`
- **What it captures**: Unhandled route errors with request context (method, path, player ID)

### CLI Crash Reporter (built-in, no service needed)
- **What**: Saves crash reports to `~/.config/codekeep/crashes/` as JSON
- **Integration**: `packages/cli/src/lib/crash-reporter.ts`, `ErrorBoundary.tsx`
- **Generates**: Pre-filled GitHub Issue URL with error details

---

## Logging

### Better Stack / Logtail
- **What**: Structured log aggregation for API requests
- **Free tier**: 1GB/month, 3-day retention
- **Integration**: `packages/api/src/middleware/request-logger.ts`
- **Setup**:
  1. Sign up at https://betterstack.com/logtail
  2. Create a source, get your token
  3. Set `LOGTAIL_TOKEN` env var on the server
- **Env var**: `LOGTAIL_TOKEN`
- **What it logs**: Every request (method, path, status, duration, player ID)

---

## Uptime Monitoring

### UptimeRobot
- **What**: External HTTP monitoring — pings `/healthz` and alerts on downtime
- **Free tier**: 50 monitors, 5-minute check intervals
- **Setup**:
  1. Sign up at https://uptimerobot.com
  2. Add HTTP(s) monitor pointing to `https://your-app.vercel.app/healthz`
  3. Set alert contacts (email, Slack, etc.)
- **No env var needed** — purely external

---

## Bug Tracking & Feedback

### GitHub Issues
- **What**: Bug reports, feature requests, crash reports
- **Free tier**: Unlimited (public repos)
- **Templates**: `.github/ISSUE_TEMPLATE/` (bug_report, feature_request, crash_report)
- **In-game**: Settings → Report Bug generates a GitHub Issue URL
- **API**: `POST /feedback/bug` and `POST /feedback/feature` auto-create issues
- **Auth**: Requires player authentication (JWT or API key) — anonymous submissions blocked
- **Rate limit**: 5 requests per hour per IP
- **Required for auto-creation**: `GITHUB_TOKEN` env var with `repo` scope
- **Env vars**: `GITHUB_TOKEN`, `GITHUB_REPO` (defaults to `tooyipjee/codekeep`)

---

## Health Endpoints

Built into the API, no external service needed:

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Returns version, uptime, DB status, player count, environment |
| `GET /readyz` | Readiness probe (503 if DB is down) |

---

## Environment Variable Summary

| Variable | Service | Required? | Where to set |
|----------|---------|-----------|-------------|
| `TURSO_DATABASE_URL` | Turso / libSQL | **Required for Vercel** | Vercel env vars |
| `TURSO_AUTH_TOKEN` | Turso | **Required for Vercel** | Vercel env vars |
| `JWT_SECRET` | Auth | **Required in production** | Vercel env vars |
| `SENTRY_DSN` | Sentry | Optional | Vercel env vars |
| `LOGTAIL_TOKEN` | Better Stack | Optional | Vercel env vars |
| `GITHUB_TOKEN` | GitHub Issues API | Optional | Vercel env vars |
| `GITHUB_REPO` | GitHub Issues API | Optional | Vercel env vars (default: `tooyipjee/codekeep`) |
| `PORT` | API server | Auto-set by platform | Platform (auto) |
| `CODEKEEP_PORT` | API server (fallback) | Optional | Docker/self-host (default: `3000`) |
| `CODEKEEP_HOST` | API server | Optional | Docker/self-host (default: `0.0.0.0`) |
| `NODE_ENV` | All | Optional | Platform env vars (default: `development`) |

---

## Cost: $0/month

All services above operate within their free tiers for a typical indie game:
- < 5K errors/month (Sentry)
- < 1GB logs/month (Logtail)
- < 1M function invocations/month (Vercel)
- < 500M row reads/month (Turso)
- < 2K CI minutes/month (GitHub Actions)
- < 50 monitors (UptimeRobot)
