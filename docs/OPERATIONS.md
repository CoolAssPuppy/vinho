# Vinho Operations Guide

## Deployment

### Web Application (Vercel)

#### Initial Setup

```bash
# Link Vercel project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Deploy to production
vercel --prod
```

#### Environment Variables

```env
# Production (.env.production)
NEXT_PUBLIC_SUPABASE_URL=https://aghiopwrzzvamssgcwpv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>

# Preview (.env.preview)
NEXT_PUBLIC_SUPABASE_URL=https://preview-branch.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<preview_anon_key>
```

#### Deployment Process

1. Push to `main` branch triggers production deploy
2. PR creates preview deployment
3. Vercel runs build checks
4. Deploy completes in ~2 minutes

#### Rollback

```bash
# List deployments
vercel ls

# Rollback to previous
vercel rollback <deployment-url>

# Or use Vercel dashboard instant rollback
```

### iOS Application

#### TestFlight Release

```bash
# Archive build
xcodebuild archive \
  -scheme Vinho \
  -archivePath ./build/Vinho.xcarchive

# Export for App Store
xcodebuild -exportArchive \
  -archivePath ./build/Vinho.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ./ExportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app \
  -f ./build/Vinho.ipa \
  -t ios \
  -u <apple-id> \
  -p <app-specific-password>
```

#### App Store Release Process

1. Submit build through TestFlight
2. Internal testing (1-2 days)
3. External beta testing (1 week)
4. Submit for review
5. Release to App Store

#### Version Management

```
Major.Minor.Patch (Build)
1.0.0 (100) - Initial release
1.0.1 (101) - Bug fixes
1.1.0 (110) - New features
```

### Database (Supabase)

#### Migration Deployment

```bash
# Preview migrations on branch
supabase db push --dry-run

# Apply to production
supabase db push

# Generate fresh types
supabase gen types typescript \
  --project-id aghiopwrzzvamssgcwpv \
  > packages/db-types/src/database.types.ts

# Dump schema for backup
supabase db dump \
  --project-ref aghiopwrzzvamssgcwpv \
  > supabase/vinho.sql
```

#### Branching Strategy

```bash
# Create development branch
supabase branches create develop

# List branches
supabase branches list

# Merge to production
supabase branches merge develop
```

## Monitoring

### Application Monitoring

#### Web Metrics

- Core Web Vitals (LCP, FID, CLS)
- JavaScript errors
- API response times
- User sessions

```typescript
// Monitoring setup
export function initMonitoring() {
  // Web Vitals
  reportWebVitals((metric) => {
    analytics.track("web_vital", {
      name: metric.name,
      value: metric.value,
    });
  });

  // Error boundaries
  window.addEventListener("error", (event) => {
    logger.error("Uncaught error", {
      message: event.message,
      stack: event.error?.stack,
    });
  });
}
```

#### iOS Monitoring

```swift
// Crash reporting
func setupCrashReporting() {
    NSSetUncaughtExceptionHandler { exception in
        Logger.error("Uncaught exception", [
            "name": exception.name.rawValue,
            "reason": exception.reason ?? "",
            "stack": exception.callStackSymbols
        ])
    }
}
```

### Database Monitoring

#### Query Performance

```sql
-- Slow query log
SELECT
  query,
  calls,
  mean_exec_time,
  total_exec_time
FROM pg_stat_statements
WHERE mean_exec_time > 100
ORDER BY mean_exec_time DESC;
```

#### Index Usage

```sql
-- Find missing indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

#### Connection Pool

```sql
-- Monitor connection usage
SELECT
  state,
  COUNT(*)
FROM pg_stat_activity
GROUP BY state;
```

### Edge Function Monitoring

#### Logging

```typescript
// Structured logging in Edge Functions
import { logger } from "../utils/logger";

export default async function handler(req: Request) {
  const startTime = Date.now();

  try {
    logger.info("Request received", {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers),
    });

    const result = await processRequest(req);

    logger.info("Request completed", {
      duration: Date.now() - startTime,
      status: "success",
    });

    return result;
  } catch (error) {
    logger.error("Request failed", {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime,
    });
    throw error;
  }
}
```

## Backup and Recovery

### Database Backups

#### Automated Backups

- Daily automated backups (30-day retention)
- Point-in-time recovery (7 days)
- Cross-region backup replication

#### Manual Backup

```bash
# Full database dump
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Specific tables
pg_dump $DATABASE_URL \
  -t tastings \
  -t wines \
  -t vintages \
  > data_backup.sql

# With compression
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz
```

#### Restore Process

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Restore specific tables
psql $DATABASE_URL \
  -c "TRUNCATE tastings, wines, vintages CASCADE" \
  -f data_backup.sql
```

### Application Backups

#### Code Repository

- Git repository on GitHub
- Protected main branch
- Tag releases
- Mirror to backup remote

```bash
# Tag release
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0

# Backup to second remote
git remote add backup <backup-url>
git push backup --all
git push backup --tags
```

#### Asset Backups

```bash
# Backup user uploads
aws s3 sync \
  s3://vinho-production/uploads \
  s3://vinho-backups/uploads \
  --delete

# Backup photos
rclone sync \
  supabase:photos \
  backup:photos \
  --progress
```

## Incident Response

### Severity Levels

#### SEV1 - Critical

- Complete outage
- Data loss
- Security breach
- Response: Immediate, all hands

#### SEV2 - Major

- Partial outage
- Key feature broken
- Performance degradation >50%
- Response: Within 30 minutes

#### SEV3 - Minor

- Single feature issue
- Performance degradation <50%
- Non-critical bug
- Response: Within 2 hours

#### SEV4 - Low

- UI issues
- Documentation problems
- Enhancement requests
- Response: Next business day

### Response Playbook

#### 1. Identify Issue

```bash
# Check service health
curl https://api.vinho.app/health

# Check database
supabase db-health

# Check Edge Functions
supabase functions list --status

# Check iOS crash reports
xcrun simctl list devices
```

#### 2. Communicate

- Update status page
- Notify team via Slack
- Post user-facing message
- Start incident channel

#### 3. Mitigate

```bash
# Scale resources
vercel scale vinho-web --min 2 --max 10

# Enable maintenance mode
vercel env add NEXT_PUBLIC_MAINTENANCE_MODE=true

# Rollback if needed
vercel rollback

# Disable problematic features
UPDATE feature_flags SET enabled = false WHERE name = 'new_feature';
```

#### 4. Resolve

- Fix root cause
- Test thoroughly
- Deploy fix
- Verify resolution

#### 5. Post-Mortem

- Document timeline
- Identify root cause
- List action items
- Update runbooks

### Common Issues

#### High Database CPU

```sql
-- Kill long-running queries
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes';

-- Disable expensive features temporarily
UPDATE feature_flags SET enabled = false
WHERE name IN ('recommendations', 'similarity_search');
```

#### Memory Issues

```bash
# Restart Edge Functions
supabase functions deploy <function-name> --restart

# Clear cache
redis-cli FLUSHDB

# Increase memory limits
vercel env add NODE_OPTIONS="--max-old-space-size=4096"
```

#### API Rate Limiting

```typescript
// Emergency rate limit adjustment
export const rateLimits = {
  auth: process.env.EMERGENCY_MODE ? 50 : 5,
  search: process.env.EMERGENCY_MODE ? 100 : 30,
  export: process.env.EMERGENCY_MODE ? 10 : 5,
};
```

## Security

### Security Updates

#### Dependency Updates

```bash
# Check for vulnerabilities
npm audit
pnpm audit

# Auto-fix
npm audit fix
pnpm audit --fix

# Update all dependencies
pnpm update --latest

# iOS dependencies
swift package update
pod update
```

#### Security Headers

```typescript
// Next.js security headers
module.exports = {
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block",
        },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'",
        },
      ],
    },
  ],
};
```

### Access Control

#### Database Access

```sql
-- Review permissions
SELECT
  grantee,
  privilege_type,
  table_name
FROM information_schema.role_table_grants
WHERE grantee NOT IN ('postgres', 'supabase_admin');

-- Revoke unnecessary permissions
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM suspicious_role;
```

#### API Keys Rotation

```bash
# Rotate Supabase keys
supabase keys rotate

# Update environment variables
vercel env rm NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY

# Restart services
vercel redeploy --prod
```

## Performance Optimization

### Database Optimization

#### Query Optimization

```sql
-- Add missing indexes
CREATE INDEX idx_tastings_user_date
ON tastings(user_id, tasted_at DESC);

CREATE INDEX idx_wines_search
ON wines USING gin(name gin_trgm_ops);

-- Update statistics
ANALYZE tastings;
ANALYZE wines;
ANALYZE vintages;

-- Vacuum tables
VACUUM ANALYZE;
```

#### Connection Pooling

```typescript
// Supabase client configuration
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    db: {
      schema: "public",
    },
    global: {
      headers: {
        "x-connection-pool": "true",
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  },
);
```

### Application Performance

#### Bundle Optimization

```javascript
// Next.js config
module.exports = {
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lodash", "date-fns"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
};
```

#### Caching Strategy

```typescript
// API response caching
export async function GET(request: Request) {
  return new Response(data, {
    headers: {
      "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      "CDN-Cache-Control": "max-age=3600",
    },
  });
}
```

## Release Process

### Version Planning

- Monthly feature releases (x.Y.0)
- Weekly bug fix releases (x.y.Z)
- Hotfixes as needed

### Release Checklist

#### Pre-Release

- [ ] All tests passing
- [ ] Security audit clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Migration tested on preview

#### Release

- [ ] Tag release in Git
- [ ] Deploy web to production
- [ ] Submit iOS to TestFlight
- [ ] Run smoke tests
- [ ] Update status page

#### Post-Release

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Plan next iteration

### Rollback Plan

#### Immediate Rollback

```bash
# Web application
vercel rollback

# Database migration
psql $DATABASE_URL < rollback_script.sql

# Edge Functions
supabase functions deploy --version previous

# iOS (via App Store Connect)
# Remove build from sale
# Expedite review for previous version
```

## Maintenance

### Scheduled Maintenance

#### Planning

- Schedule during low-traffic hours
- Minimum 48-hour notice
- Update status page
- Send email notifications

#### Maintenance Mode

```typescript
// Enable maintenance mode
export async function middleware(request: NextRequest) {
  if (process.env.NEXT_PUBLIC_MAINTENANCE_MODE === "true") {
    return NextResponse.rewrite(new URL("/maintenance", request.url));
  }
}
```

#### Maintenance Page

```tsx
export default function Maintenance() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1>Scheduled Maintenance</h1>
        <p>We'll be back shortly. Thank you for your patience.</p>
        <p>Expected completion: {process.env.NEXT_PUBLIC_MAINTENANCE_END}</p>
      </div>
    </div>
  );
}
```

### Health Checks

#### API Health Endpoint

```typescript
// /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    storage: await checkStorage(),
    functions: await checkFunctions(),
  };

  const healthy = Object.values(checks).every((check) => check.status === "ok");

  return Response.json({
    status: healthy ? "healthy" : "degraded",
    checks,
    timestamp: new Date().toISOString(),
  });
}
```

#### Automated Monitoring

```yaml
# GitHub Actions health check
name: Health Check
on:
  schedule:
    - cron: "*/5 * * * *"
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check API health
        run: |
          response=$(curl -s https://api.vinho.app/health)
          if [[ $(echo $response | jq -r .status) != "healthy" ]]; then
            curl -X POST $SLACK_WEBHOOK -d '{"text":"API health check failed"}'
          fi
```
