# NEXTMSG Production Release Checklist

## Pre-Deployment

### Environment Variables
- [x] `DATABASE_URL` — PostgreSQL connection string (Required)
- [x] `AUTH_SECRET` — Cryptographically random secret, NOT a weak value (Required in production)
- [x] `AUTH_URL` — Application base URL (Required)
- [x] `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` — GitHub OAuth credentials (at least one provider)
- [x] `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials (at least one provider)
- [x] `AI_PROVIDER` — One of: `xai`, `openrouter`, `ollama` (Required)
- [x] `XAI_API_KEY` / `OPENROUTER_API_KEY` — AI provider API key (Required for chosen provider)
- [x] `NEXTMSG_LOG_LEVEL` — Logging level: `debug`, `info`, `warn`, `error` (Default: `info` in production)

### Database
- [x] PostgreSQL database provisioned (Supabase, PostgreSQL 17.6)
- [x] `prisma migrate deploy` — Initial migration applied (20260908000000_init)
- [x] `prisma generate` — Client generation in build command
- [x] Database connection verified via health endpoint (connected, ~1.3s latency)
- [x] All 20 tables with indexes and foreign keys
- [x] Direct connection (port 5432) for Prisma compatibility

### Secrets
- [x] All development secrets rotated if repo was ever shared
- [x] No API keys in `.env` or `.env.local` committed to git
- [x] `.env*` files in `.gitignore`
- [x] No secrets in source code (verified via grep)
- [x] No secrets in client bundles (verified via build audit)
- [x] `.env.example` contains only placeholder values

### Authentication
- [x] GitHub OAuth app configured with correct callback URL
- [x] Google OAuth app configured with correct redirect URI
- [x] `AUTH_SECRET` is cryptographically random (32+ bytes)
- [x] Session strategy: JWT
- [x] Login page at `/login` with OAuth buttons
- [x] Signup page at `/signup`
- [x] Middleware protects all non-public routes

### Build
- [x] `npm run build` succeeds with no errors
- [x] `npx tsc --noEmit` passes with no errors
- [x] `npm run lint` passes (no new errors)
- [x] `npx vitest run` passes all tests (3,863)

### Security Headers
- [x] `X-Content-Type-Options: nosniff`
- [x] `X-Frame-Options: DENY`
- [x] `Content-Security-Policy` configured (self + AI providers only)
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy` restricts camera, microphone, geolocation
- [x] `Strict-Transport-Security` in production (max-age=63072000)
- [x] `poweredByHeader: false`
- [x] `X-XSS-Protection: 1; mode=block`
- [x] `X-DNS-Prefetch-Control: on`

### Rate Limiting
- [x] Default: 30 requests/minute per identifier
- [x] Generation endpoints: 10 requests/minute per identifier
- [x] Rate limit headers included in responses (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset)
- [x] 429 status code returned when exceeded
- [x] Sliding window with automatic cleanup

### Health Checks
- [x] `GET /api/health` returns 200 when healthy
- [x] `GET /api/health` returns 503 when degraded
- [x] Database connectivity check passes (raw SQL query)
- [x] Environment validation passes
- [x] Circuit breaker states healthy
- [x] Metrics summary included

### AI Provider
- [x] Circuit breaker: 5 failures → open, 60s cooldown, 2 successes → close
- [x] Retry: 2 retries, exponential backoff (1s-30s)
- [x] Rate limit errors carry retry-after header
- [x] Provider fallback chains (OpenRouter)
- [x] Request timeout: 90s (cloud) / 120s (Ollama)
- [x] Debug logging gated by `NEXTMSG_DEBUG_AI=true`

## Deployment

### Vercel
- [x] `vercel.json` configured with `prisma generate && next build`
- [x] `installCommand: npm install --legacy-peer-deps`
- [x] Environment variables set in Vercel dashboard (Production)
- [x] `DATABASE_URL` points to hosted PostgreSQL (Supabase, direct connection)
- [x] Domain configured and SSL active
- [x] Preview deployments working

### Post-Deployment
- [x] Health endpoint returns 200
- [x] Login/signup flow works
- [x] AI generation works with correct provider
- [x] Rate limiting active
- [x] Error logging working (structured JSON)
- [x] No 500 errors in logs

## Monitoring

### Key Metrics
- [x] Request count and success rate (in-memory metrics)
- [x] AI provider latency and failure rate (per-operation tracking)
- [x] Rate limit events (logged)
- [x] Circuit breaker state changes (logged)
- [x] Database query errors (logged at error level)
- [x] Semantic validation failures (logged)
- [x] Pre-send HIGH_RISK rate (logged)

### Structured Logging
- [x] JSON format to stdout/stderr
- [x] Request context (requestId, userId) via AsyncLocalStorage
- [x] Specialized loggers: AI, API, database, security, mode
- [x] No secrets in logs
- [x] No raw conversation content in logs

### Alerts (NOT CONFIGURED — Production Gap)
- [ ] Health endpoint returns 503
- [ ] AI provider failure rate > 10%
- [ ] Circuit breaker opens
- [ ] Database connection failures
- [ ] Rate limit spike

## Rollback

### Steps
1. Go to Vercel Dashboard → Deployments
2. Find the last known good deployment
3. Click "Promote to Production"
4. If database migration was applied, do NOT rollback the migration
5. Verify health endpoint returns 200
6. Verify login and generation work

### Database
- [x] Backup before migration (provider responsibility)
- [x] Migration is forward-only (no destructive rollback)
- [x] Recovery documentation exists (RUNBOOK.md)

## Security

### Verification
- [x] No secrets in logs
- [x] No conversation content in logs by default
- [x] CSP headers prevent XSS
- [x] No CORS wildcard with credentials
- [x] Authentication required for all non-public routes (middleware)
- [x] Workspace isolation verified (User A cannot access User B data)
- [x] Prompt injection resistance verified (9 patterns detected)
- [x] Payload size limits enforced (per-field)
- [x] Input sanitization (string truncation)
- [x] Client bundle audit — no secrets exposed
- [x] Build artifact audit — no secrets in config files

## Data Handling

### Retention
- [x] Memory model supports expiration (`expiresAt`)
- [x] Memory model supports soft delete (`isActive`)
- [x] Preferences scoped to user (`userId`)
- [x] Cascade deletes on user relations
- [x] Set-null for optional foreign keys

### Deletion
- [x] User deletion cascades to all related data
- [x] Workspace deletion cascades to participants and messages
- [x] Conversation deletion cascades to messages and replies

## Smoke Tests

- [x] 236 launch-readiness + production DB tests passing
- [x] Environment validation (missing, invalid, weak secrets)
- [x] Health endpoint (200/503 behavior)
- [x] Authentication (auth module, middleware, ownership)
- [x] Authorization (401, 403, 404, 429, 500 responses)
- [x] Rate limiting (allow, block, reset, headers)
- [x] Circuit breaker (closed, open, recovery)
- [x] Retry logic (exponential backoff, retry-after)
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Prompt injection (9 patterns, false positive check)
- [x] Input validation (payload limits, sanitization)
- [x] Prisma migration (all tables, indexes, foreign keys)
- [x] Build artifacts (no secrets in config)
- [x] Multilingual encoding (Unicode, emoji, Telugu, Hindi, Tamil)
- [x] Concurrency (rate limiter, circuit breaker, cache isolation)
- [x] Cache isolation (request-scoped, no cross-request leakage)
- [x] API route structure (24 routes verified)
- [x] PostgreSQL integration (CRUD, transactions, isolation)
- [x] Workspace isolation (User A cannot access User B data)
- [x] Message ordering integrity
- [x] Memory persistence with limit
- [x] Preference persistence
- [x] Feedback persistence
- [x] Multilingual persistence (Telugu, Hindi, Tamil, Hinglish)
