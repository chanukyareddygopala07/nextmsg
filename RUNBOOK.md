# NEXTMSG Production Operations Runbook

## Application Unavailable

### Symptoms
- Health endpoint returns 503
- Users cannot load the application
- All requests return 500

### Investigation
1. Check `GET /api/health` — identify which component is degraded
2. Check database connectivity: health endpoint `database.status` field
3. Check environment validation: health endpoint `errors` and `warnings` fields
4. Check circuit breaker states: health endpoint `circuitBreakers` field
5. Check Vercel deployment status in dashboard

### Resolution
- **Database down**: Restart PostgreSQL, verify connection string, check Supabase dashboard
- **Database prepared statement error**: Ensure using direct connection (port 5432), not pooler (port 6543)
- **Environment misconfiguration**: Set missing variables in Vercel dashboard, redeploy
- **Circuit breaker open**: Wait for cooldown (60s), investigate provider issues
- **Deployment failed**: Check Vercel build logs, fix errors, redeploy

## AI Provider Failing

### Symptoms
- Generation requests return 401, 429, 502, or 504
- Circuit breaker state is "open"
- High error rate in AI metrics

### Investigation
1. Check provider status page:
   - xAI: https://status.x.ai
   - OpenRouter: https://status.openrouter.ai
   - Ollama: check local server status
2. Check API key validity
3. Check rate limit headers in responses
4. Check circuit breaker state via health endpoint
5. Check application logs for `ai_request_error` events

### Resolution
- **401 Unauthorized**: Rotate API key in provider dashboard, update in Vercel
- **429 Rate Limited**: Wait for rate limit reset, reduce request frequency
- **502/504 Provider Error**: Provider outage — wait for recovery or switch provider
- **Circuit breaker open**: Wait 60s for cooldown, or manually reset by restarting app

### Provider Switching
To switch AI providers:
1. Set `AI_PROVIDER` environment variable to new provider in Vercel dashboard
2. Set corresponding API key (`XAI_API_KEY`, `OPENROUTER_API_KEY`)
3. Redeploy application
4. Verify health endpoint shows new provider configuration

### Quick Provider Switch Commands
```bash
# Via Vercel CLI
vercel env add AI_PROVIDER production
# Enter: openrouter (or xai, ollama)

vercel env add OPENROUTER_API_KEY production
# Enter: sk-or-v1-...

vercel --prod
```

## Database Failure

### Symptoms
- Health endpoint shows `database.status: "disconnected"`
- Application logs show database connection errors
- Prisma query errors
- "prepared statement already exists" error

### Investigation
1. Check Supabase dashboard → Database → Health
2. Verify `DATABASE_URL` uses direct connection (port 5432), not pooler (port 6543)
3. Check connection pool limits in Supabase dashboard
4. Check for long-running queries blocking connections
5. Verify database server resources (CPU, memory, disk)
6. Check Supabase status page: https://status.supabase.com

### Resolution
- **Connection refused**: Restart PostgreSQL, check firewall rules
- **Connection pool exhausted**: Increase pool size or add PgBouncer
- **Disk full**: Clean up old data, increase storage
- **Authentication failed**: Verify credentials in `DATABASE_URL`

### Recovery
1. Restore from backup if data corruption occurred
2. Run `npx prisma migrate deploy` if migrations are pending
3. Verify health endpoint shows `database.status: "connected"`

## High Latency

### Symptoms
- Generation requests take > 5 seconds
- UI appears slow or unresponsive
- Timeout errors increasing

### Investigation
1. Check AI provider latency in metrics (`ai:chat` operation)
2. Check database query latency
3. Check application logs for slow request warnings
4. Monitor request count and concurrent connections

### Resolution
- **AI provider slow**: Check provider status, consider switching
- **Database slow**: Check for slow queries, add indexes, optimize
- **High traffic**: Scale Vercel instance, optimize caching
- **Cold starts**: Consider keeping functions warm

## Rate Limit Spike

### Symptoms
- Many 429 responses
- Users complaining about being blocked
- Rate limit headers showing 0 remaining

### Investigation
1. Check which endpoints are hitting limits
2. Identify if spike is from legitimate users or abuse
3. Check rate limit headers for window information
4. Review IP addresses triggering limits

### Resolution
- **Legitimate spike**: Increase limits temporarily in `src/lib/rate-limit.ts`, redeploy
- **Abuse**: Block offending IPs, implement stricter limits
- **Misconfigured limits**: Adjust `GENERATION_CONFIG.maxRequests` in `rate-limit.ts`

### Rate Limit Configuration
```typescript
// Default: 30 requests/minute
const DEFAULT_CONFIG = { windowMs: 60_000, maxRequests: 30 };

// Generation: 10 requests/minute
const GENERATION_CONFIG = { windowMs: 60_000, maxRequests: 10 };
```

## Authentication Failures

### Symptoms
- Users cannot log in
- Session expires immediately
- 401 errors on authenticated requests

### Investigation
1. Check `AUTH_SECRET` is set and not weak
2. Check OAuth provider configuration (GitHub, Google)
3. Check callback URLs match provider configuration
4. Check browser cookies are not blocked
5. Check NextAuth version compatibility

### Resolution
- **Weak AUTH_SECRET**: Generate new secret with `openssl rand -base64 32`, update in Vercel
- **OAuth misconfiguration**: Update provider settings with correct URLs
- **Cookie issues**: Check `secure`, `httpOnly`, `sameSite` settings
- **Session expired**: Check JWT expiration settings

### OAuth Callback URLs
```
GitHub: https://your-domain.com/api/auth/callback/github
Google: https://your-domain.com/api/auth/callback/google
```

## Rollback

### When to Rollback
- Critical security vulnerability introduced
- Major functionality broken
- Performance degradation severe enough to affect users

### Rollback Steps
1. **Vercel**: Go to Dashboard → Deployments → Promote previous deployment
2. **Database**: Do NOT rollback migrations unless absolutely necessary
3. **Verify**: Check health endpoint returns 200
4. **Test**: Verify login, generation, and workspace functionality
5. **Communicate**: Notify users if service was degraded

### Post-Rollback
1. Investigate root cause of failure
2. Fix issues in development
3. Run full test suite (`npx vitest run`)
4. Run TypeScript check (`npx tsc --noEmit`)
5. Run build (`npm run build`)
6. Deploy with confidence

## Monitoring Commands

### Check Health
```bash
curl https://your-domain.com/api/health
```

### Check Health (JSON formatted)
```bash
curl -s https://your-domain.com/api/health | python3 -m json.tool
```

### Check Metrics
```bash
curl https://your-domain.com/api/health | jq .metrics
```

### Check Circuit Breakers
```bash
curl https://your-domain.com/api/health | jq .circuitBreakers
```

### Check Database
```bash
curl https://your-domain.com/api/health | jq .database
```

### Check Environment
```bash
curl https://your-domain.com/api/health | jq .errors, .warnings
```

## Log Analysis

### Key Log Events
- `ai_request_completed` — AI provider call completed
- `ai_request_error` — AI provider call failed
- `api_request_completed` — API request completed
- `api_request_error` — API request failed
- `database_query` — Database query executed
- `security_event` — Security event detected
- `retry_attempt` — Retry attempt in progress

### Log Format
```json
{
  "level": "info",
  "timestamp": "2026-09-08T22:00:00.000Z",
  "event": "ai_request_completed",
  "operation": "chat",
  "model": "grok-4.6",
  "durationMs": 1200,
  "success": true,
  "retryCount": 0
}
```

### Filtering Errors in Vercel
```bash
# In Vercel logs, filter by level
level:error

# Filter by event
event:ai_request_error

# Filter by operation
operation:chat

# Filter by duration (>5s)
durationMs:>5000
```

## Emergency Procedures

### Complete Outage
1. Check Vercel status: https://status.vercel.com
2. Check database status (Supabase/Neon dashboard)
3. Check AI provider status
4. If all external services are up, check deployment status
5. Rollback to last known good deployment

### Data Breach
1. Rotate all secrets immediately (AUTH_SECRET, API keys)
2. Check access logs for unauthorized access
3. Review workspace isolation
4. Document the incident
5. Notify affected users

### Performance Degradation
1. Check health endpoint for degraded components
2. Check AI provider latency
3. Check database connection pool
4. Consider temporarily increasing rate limits
5. Monitor recovery
