# NextMsg Production Runbook

## Architecture Overview

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL via Prisma ORM
- **Auth**: NextAuth.js (GitHub + Google OAuth)
- **AI Provider**: xAI (`grok-4.6`) with circuit breaker protection
- **Runtime**: Node.js 19+

## Environment Variables

### Required
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | NextAuth session encryption secret |
| `XAI_API_KEY` | xAI API key for Grok provider |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |

### Optional
| Variable | Default | Description |
|----------|---------|-------------|
| `NEXTMSG_DEBUG_AI` | `false` | Enable AI debug logging |
| `NODE_ENV` | `development` | Set to `production` for prod |

## Health Check

```
GET /api/health
```

Returns:
- `status`: "ok" or "degraded"
- `version`: Application version
- `uptime`: Seconds since start
- `metrics`: Request counts and error rates
- `circuitBreaker`: Provider circuit breaker state

**Never** exposes secrets, API keys, or database credentials.

## Monitoring

### Structured Logging

All log output is structured JSON. Key log events:

| Event | Description |
|-------|-------------|
| `ai_request_completed` | AI provider call completed |
| `ai_request_error` | AI provider call failed |
| `api_request_completed` | API request completed |
| `security_event` | Security-related event |
| `database_query` | Database operation logged |

### Metrics

In-process counters (reset on restart):

- Request counts per operation
- Error rates
- Duration (min/max/avg)

Access via `GET /api/health`.

### Circuit Breaker

The xAI provider uses a circuit breaker:
- **CLOSED**: Normal operation
- **OPEN**: Provider failures exceeded threshold (5), requests blocked
- **HALF_OPEN**: Cooldown elapsed (60s), single probe request allowed

State is visible in health endpoint response.

## Rate Limiting

| Route | Limit | Window |
|-------|-------|--------|
| `/api/analyze/text` | 30 req | 1 min |
| `/api/analyze/screenshot` | 30 req | 1 min |
| `/api/conversation/coach` | 30 req | 1 min |
| `/api/draft/*` | 30 req | 1 min |

Rate limits are per-client IP. Standard headers returned:
- `X-RateLimit-Limit`
- `X-RateLimit-Remaining`
- `X-RateLimit-Reset`
- `Retry-After` (when blocked)

## Security

### Headers (set in next.config.ts)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security` (production only)

### Authentication
- API routes: `/api/memory`, `/api/replies/*` require session
- Public routes: `/api/auth/*`, `/api/health`
- Other API routes: Rate limited but not auth-gated (analyze, coach, drafts)

### Input Validation
- Zod schemas on all API inputs
- Payload size limits enforced
- Prompt injection detection on user text
- String sanitization with length caps

## Database

### Indexes
- `conversations`: `profileId`, `(profileId, createdAt DESC)`
- `conversation_messages`: `conversationId`, `(conversationId, ordering)`
- `generated_replies`: `conversationId`

### Migrations
```bash
npx prisma migrate deploy
npx prisma generate
```

## Deployment

### Build
```bash
npm run build
```

### Start
```bash
npm start
```

### Pre-deployment Checklist
1. `npx tsc --noEmit` -- TypeScript clean
2. `npm test` -- All tests pass
3. `npm run lint` -- No lint errors
4. `npm run build` -- Build succeeds
5. `npm run eval:smoke` -- Evaluation framework runs
6. `npx prisma migrate deploy` -- Database up to date
7. Environment variables configured

## Troubleshooting

### Provider Circuit Open
If health shows circuit breaker open:
1. Check xAI API status
2. Verify `XAI_API_KEY` is valid
3. Wait 60s for automatic half_open transition
4. Manually reset: Restart the server

### Rate Limited
If receiving 429 responses:
1. Check client IP via `X-Forwarded-For`
2. Reduce request frequency
3. Rate limit resets after 1 minute window

### Database Connection
If seeing connection errors:
1. Verify `DATABASE_URL` is correct
2. Check PostgreSQL is running
3. Run `npx prisma db push` to sync schema
