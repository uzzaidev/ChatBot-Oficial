# Troubleshooting Guide

## PostgreSQL Connection Issues

### Error: "Connection terminated due to connection timeout"

**Symptoms:**
- Error message in logs: `Error: Connection terminated due to connection timeout`
- Error occurs in webhook processing (`/api/webhook/route.ts`)
- Timeout after ~10-30 seconds
- More common during cold starts or high traffic

**Root Cause:**
This error occurs in serverless environments (Vercel/AWS Lambda) where:
1. Each function invocation is stateless
2. Connection pools don't persist between invocations
3. Cold starts require more time to establish database connections
4. Default timeouts may be too aggressive for serverless

**Solutions Implemented:**

#### 1. Optimized Timeout Configuration
Database timeouts have been configured to accommodate serverless cold starts:
```typescript
// src/lib/postgres.ts
connectionTimeoutMillis: 10000, // 10 seconds - fail fast on connection
statement_timeout: 30000,       // 30 seconds - allows cold start queries
query_timeout: 30000,           // 30 seconds - sufficient for complex queries
```

**Important:** Client-side timeout has been removed. PostgreSQL's native `statement_timeout` is more reliable and prevents premature query cancellation during cold starts.

#### 2. Automatic Retry Logic
Transient connection failures are automatically retried up to 2 times with exponential backoff:
- Retries on: timeout, connection terminated, ECONNREFUSED, ETIMEDOUT
- Backoff: 500ms, 1s between retries
- Non-retryable errors fail immediately
- Database timeout errors (from PostgreSQL) are retryable if caused by cold starts

#### 3. Pool Age Management
Connection pools are automatically recreated after 60 seconds to prevent stale connections in serverless environments.

#### 4. Use Direct Connection (Recommended for Vercel)
For Vercel deployments, use `POSTGRES_URL_NON_POOLING` environment variable:

```env
# .env.local or Vercel Environment Variables
POSTGRES_URL_NON_POOLING=postgresql://username:your-password@hostname:5432/database
```

**Where to find this:**
1. Go to your Supabase dashboard
2. Settings → Database
3. Copy the "Connection string" under "Direct connection" (NOT "Connection pooling")
4. Replace the placeholders with your actual database credentials

**Why this helps:**
- Supabase's connection pooler adds another layer that can timeout
- Direct connections bypass the pooler
- Better suited for serverless environments with short-lived connections

### Monitoring Connection Health

Check your logs for these indicators:

**Healthy Connection:**
```
[Postgres] 🔍 Query: SELECT * FROM "Clientes WhatsApp" WHERE...
[Postgres] ✅ Query OK (245ms) - 1 rows
```

**Connection Issues:**
```
[Postgres] ❌ Query ERRO (12326ms) - Attempt 1/3: Error: Connection terminated
[Postgres] 🔄 Retry attempt 1/2
```

**Pool Recreation:**
```
[Postgres] ♻️ Pool age limit exceeded, recreating...
[Postgres] 🆕 Creating new connection pool
```

### Additional Recommendations

1. **Monitor Query Performance**
   - Queries should complete in < 1s typically
   - If queries consistently take > 5s, investigate database performance
   - Add indexes on frequently queried columns

2. **Database Connection Limits**
   - Supabase free tier: 100 concurrent connections
   - Each serverless invocation uses 1-10 connections
   - Monitor connection usage in Supabase dashboard

3. **Optimize Queries**
   - Use `LIMIT` clauses to prevent large result sets
   - Add proper indexes for WHERE clauses
   - Avoid N+1 query patterns

4. **Consider Supabase REST API**
   - For read-heavy operations, consider using Supabase's REST API
   - REST API is stateless and doesn't require connection pooling
   - Good for simple CRUD operations

### Still Having Issues?

If connection timeouts persist:

1. **Check Database Load**
   - Go to Supabase Dashboard → Database → Query Performance
   - Look for slow queries or high CPU usage

2. **Verify Network Connectivity**
   - Ensure firewall rules allow connections from Vercel IPs
   - Check if database is accessible from your deployment region

3. **Increase Vercel Function Timeout**
   - Default is 10s for Hobby tier
   - Pro tier allows up to 60s for Edge Functions, 300s for Serverless Functions
   - Enterprise tier offers extended limits
   - May need to upgrade plan for longer-running operations
   - See: https://vercel.com/docs/functions/serverless-functions/runtimes#max-duration

4. **Contact Support**
   - Supabase: support@supabase.io
   - Vercel: vercel.com/support
   - Include error logs and request IDs

## Other Common Issues

### Redis Connection Errors

**Error:** `ECONNREFUSED` or `Redis connection failed`

**Solution:**
- Verify `REDIS_URL` is correct in environment variables
- Ensure Redis instance is running and accessible
- Check network connectivity and firewall rules

### Meta API Errors

**Error:** `Failed to send WhatsApp message`

**Solution:**
- Verify `META_ACCESS_TOKEN` is valid and not expired
- Check `META_PHONE_NUMBER_ID` is correct
- Ensure phone number is registered with Meta Business

### OpenAI/Groq API Errors

**Error:** `API key invalid` or `Rate limit exceeded`

**Solution:**
- Verify API keys are correct in environment variables
- Check API usage limits and quotas
- Ensure sufficient credits/balance in API account
