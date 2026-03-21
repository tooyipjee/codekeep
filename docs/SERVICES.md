# CodeKeep — External Services Reference

All services are **free tier** and **opt-in** via environment variables. The game works fully offline without any of them.

---

## Hosting & Deployment

### Fly.io (Server Hosting)
- **What**: Runs the `@codekeep/api` Hono server in a Docker container
- **Free tier**: 3 shared VMs (256MB each), 160GB outbound bandwidth/month
- **Config files**: `Dockerfile`, `fly.toml`, `docker-compose.yml` (self-host)
- **Setup**:
  1. `fly launch` from repo root
  2. `fly volumes create codekeep_data --region sjc --size 1`
  3. `fly secrets set JWT_SECRET=your-secret`
  4. `fly deploy`
- **Env vars on Fly**: `CODEKEEP_PORT`, `CODEKEEP_HOST`, `CODEKEEP_DB_PATH`, `NODE_ENV`
- **URL**: https://fly.io

### Self-Hosting (Docker Compose)
- Run `docker-compose up -d` for a local/self-hosted server
- Data persists in a Docker volume (`codekeep-data`)
- Port 3000 by default, change in `docker-compose.yml`

---

## CI/CD

### GitHub Actions
- **What**: Automated build, test, and deploy on every push/PR to `main`
- **Free tier**: 2,000 minutes/month (private repos), unlimited (public)
- **Config**: `.github/workflows/ci.yml`
- **Jobs**:
  - `build-and-test`: pnpm install, build, test, typecheck
  - `deploy`: Fly.io deploy on merge to main
- **Required secret**: `FLY_API_TOKEN` (from Fly.io dashboard)
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
  2. Add HTTP(s) monitor pointing to `https://your-app.fly.dev/healthz`
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
- **Required for auto-creation**: `GITHUB_TOKEN` env var with `repo` scope
- **Env vars**: `GITHUB_TOKEN`, `GITHUB_REPO` (defaults to `tooyipjee/codekeep`)

---

## Health Endpoints

Built into the API, no external service needed:

| Endpoint | Purpose |
|----------|---------|
| `GET /healthz` | Returns version, uptime, DB status, player count, environment |
| `GET /readyz` | Kubernetes-style readiness probe (503 if DB is down) |

---

## Environment Variable Summary

| Variable | Service | Required? | Where to set |
|----------|---------|-----------|-------------|
| `SENTRY_DSN` | Sentry | Optional | Fly.io secrets |
| `LOGTAIL_TOKEN` | Better Stack | Optional | Fly.io secrets |
| `GITHUB_TOKEN` | GitHub Issues API | Optional | Fly.io secrets |
| `GITHUB_REPO` | GitHub Issues API | Optional | Fly.io secrets (default: `tooyipjee/codekeep`) |
| `JWT_SECRET` | Auth | Recommended | Fly.io secrets |
| `FLY_API_TOKEN` | GitHub Actions deploy | Required for CI deploy | GitHub repo secrets |
| `CODEKEEP_DB_PATH` | SQLite | Optional | `fly.toml` (default: `./codekeep.db`) |
| `CODEKEEP_PORT` | API server | Optional | `fly.toml` (default: `8080`) |
| `CODEKEEP_HOST` | API server | Optional | `fly.toml` (default: `0.0.0.0`) |
| `NODE_ENV` | All | Optional | `fly.toml` (default: `development`) |

---

## Cost: $0/month

All services above operate within their free tiers for a typical indie game:
- < 5K errors/month (Sentry)
- < 1GB logs/month (Logtail)
- < 3 VMs needed (Fly.io)
- < 2K CI minutes/month (GitHub Actions)
- < 50 monitors (UptimeRobot)
