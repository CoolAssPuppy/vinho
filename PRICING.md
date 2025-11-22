# Vinho cost basis analysis

This document provides a detailed breakdown of the costs associated with processing wine scans, to be used for pricing in-app purchases and web credits.

## Executive summary

| Metric | Value |
|--------|-------|
| **Average cost per scan** | $0.0025 - $0.004 |
| **Best case (clear label)** | $0.0003 |
| **Worst case (blurry, escalated)** | $0.0045 |
| **Recommended margin** | 5-10x cost |
| **Suggested retail price per scan** | $0.02 - $0.04 |

---

## Cost breakdown by service

### 1. OpenAI API costs

The wine scanning pipeline uses OpenAI's vision and chat completion APIs.

#### Primary extraction (every scan)

| Model | Input tokens | Output tokens | Cost per 1K input | Cost per 1K output | Est. cost/call |
|-------|-------------|---------------|-------------------|-------------------|----------------|
| GPT-4o-mini | ~500 | ~200 | $0.00015 | $0.0006 | **$0.00020** |

**Note:** Image tokens add ~85 tokens per image tile. A typical wine label photo uses 1-4 tiles.

#### Model escalation (30-40% of scans)

When initial confidence score is below 0.6, the system escalates to GPT-4o:

| Model | Input tokens | Output tokens | Cost per 1K input | Cost per 1K output | Est. cost/call |
|-------|-------------|---------------|-------------------|-------------------|----------------|
| GPT-4o | ~500 | ~200 | $0.0025 | $0.01 | **$0.0033** |

**Escalation rate:** ~35% of scans (based on label quality variability)

#### Data enrichment (50-70% of scans)

When wine data is incomplete (missing year, varietals, region, etc.):

| Model | Input tokens | Output tokens | Cost per 1K input | Cost per 1K output | Est. cost/call |
|-------|-------------|---------------|-------------------|-------------------|----------------|
| GPT-4o-mini | ~350 | ~200 | $0.00015 | $0.0006 | **$0.00017** |

**Enrichment rate:** ~60% of scans require enrichment

---

### 2. Supabase storage costs

Wine label images are stored in Supabase Storage.

| Metric | Value |
|--------|-------|
| Average image size | 2-4 MB |
| Storage location | Supabase Storage (S3-compatible) |
| Retention period | 1 year |
| Free tier | 1 GB |
| Paid rate | $0.021/GB/month |

#### Annual storage cost per image

```
Average image: 3 MB = 0.003 GB
Monthly cost: 0.003 GB x $0.021 = $0.000063
Annual cost: $0.000063 x 12 = $0.00076
```

**Annual storage cost per scan: ~$0.0008**

---

### 3. Supabase edge functions

Edge functions are billed by invocations and compute time.

| Metric | Value |
|--------|-------|
| Free tier | 500,000 invocations/month |
| Paid rate | $2 per million invocations |
| Average execution time | 2-5 seconds |
| Compute rate | $0.0000135/GB-second |

#### Functions invoked per scan

| Function | Invocations | Est. GB-seconds |
|----------|-------------|-----------------|
| scan-wine-label | 1 | 0.5 |
| process-wine-queue | 1-2 | 2.0 |
| process-enrichment-queue | 0-1 | 1.0 |

**Total per scan:** 2-4 invocations, ~3.5 GB-seconds

**Cost per scan:** ~$0.00005 (negligible with free tier)

---

### 4. Supabase database

Database operations are included in the Supabase plan.

| Operation | Count per scan |
|-----------|---------------|
| Reads | 5-10 |
| Writes/Upserts | 6-8 |

**Cost:** Included in Supabase plan (no per-operation cost)

---

### 5. Vercel compute (web app)

The web application runs on Vercel.

| Metric | Value |
|--------|-------|
| Serverless function invocations | Free tier: 100,000/month |
| Function duration | Pro: 1,000 GB-hours |
| Edge function invocations | 1,000,000/month |

**For scan operations:** Most compute happens in Supabase edge functions, not Vercel. Vercel primarily serves the UI and proxies requests.

**Est. Vercel cost per scan:** ~$0.00001 (negligible)

---

## Scenario-based cost analysis

### Scenario 1: Best case (clear label, complete data)

A well-lit photo of a standard wine label with all information visible:

| Component | Cost |
|-----------|------|
| GPT-4o-mini extraction | $0.00020 |
| Model escalation | $0.00 (not needed) |
| Data enrichment | $0.00 (not needed) |
| Image storage (annual) | $0.00076 |
| Edge functions | $0.00005 |
| **Total** | **$0.00101** |

### Scenario 2: Average case

Typical scan with some data missing, no escalation:

| Component | Cost |
|-----------|------|
| GPT-4o-mini extraction | $0.00020 |
| Model escalation | $0.00 (35% chance) |
| Data enrichment | $0.00017 |
| Image storage (annual) | $0.00076 |
| Edge functions | $0.00005 |
| **Total** | **$0.00118** |

### Scenario 3: Worst case (blurry label, escalation needed)

Poor quality photo requiring model escalation and full enrichment:

| Component | Cost |
|-----------|------|
| GPT-4o-mini extraction | $0.00020 |
| GPT-4o escalation | $0.00330 |
| Data enrichment | $0.00017 |
| Image storage (annual) | $0.00076 |
| Edge functions | $0.00005 |
| **Total** | **$0.00448** |

### Weighted average cost

Based on observed patterns:
- 40% best case: $0.00101
- 25% average case: $0.00118
- 35% worst case: $0.00448

**Weighted average: $0.00234 per scan**

---

## Monthly volume projections

| Monthly scans | OpenAI cost | Storage (annual) | Edge functions | Total monthly |
|---------------|-------------|------------------|----------------|---------------|
| 1,000 | $2.34 | $0.76 | $0.05 | **$3.15** |
| 5,000 | $11.70 | $3.80 | $0.25 | **$15.75** |
| 10,000 | $23.40 | $7.60 | $0.50 | **$31.50** |
| 50,000 | $117.00 | $38.00 | $2.50 | **$157.50** |
| 100,000 | $234.00 | $76.00 | $5.00 | **$315.00** |

---

## Pricing recommendations

### Scan pack options

Based on a 5-10x markup for sustainability and profit:

| Pack size | Cost basis | 5x markup | 10x markup | Suggested price |
|-----------|------------|-----------|------------|-----------------|
| 10 scans | $0.023 | $0.12 | $0.23 | **$0.99** |
| 25 scans | $0.059 | $0.29 | $0.59 | **$1.99** |
| 50 scans | $0.117 | $0.59 | $1.17 | **$2.99** |
| 100 scans | $0.234 | $1.17 | $2.34 | **$4.99** |
| 250 scans | $0.585 | $2.93 | $5.85 | **$9.99** |
| 500 scans | $1.170 | $5.85 | $11.70 | **$14.99** |

### Subscription model alternative

| Tier | Monthly scans | Cost basis | Suggested price | Margin |
|------|---------------|------------|-----------------|--------|
| Free | 5 | $0.012 | $0.00 | Loss leader |
| Basic | 50 | $0.117 | $4.99/month | 42x |
| Pro | 200 | $0.468 | $9.99/month | 21x |
| Unlimited | 1000+ | $2.34+ | $19.99/month | 8.5x |

---

## Cost optimization opportunities

### Currently implemented

1. **GPT-4o-mini by default** - 12x cheaper than GPT-4o
2. **Confidence-based escalation** - Only use expensive model when needed
3. **Conditional enrichment** - Skip if data is complete
4. **Idempotency keys** - Prevent duplicate processing
5. **Async queue processing** - Batch operations efficiently

### Future optimizations

1. **Image compression** - Reduce storage costs by 50-70%
2. **Prompt caching** - OpenAI prompt caching could reduce costs 50%
3. **Local OCR preprocessing** - Reduce token usage
4. **Model fine-tuning** - Could reduce escalation rate
5. **Regional caching** - Cache common wine data locally

---

## Apple/Google payment processing fees

Remember to factor in payment processor fees:

| Platform | Fee structure |
|----------|---------------|
| Apple App Store | 15-30% of sale |
| Google Play | 15-30% of sale |
| Stripe (web) | 2.9% + $0.30 per transaction |

### Adjusted pricing with App Store fees (30%)

| Pack | Raw price | After 30% fee | Net revenue |
|------|-----------|---------------|-------------|
| 10 scans @ $0.99 | $0.99 | $0.30 fee | $0.69 net |
| 50 scans @ $2.99 | $2.99 | $0.90 fee | $2.09 net |
| 100 scans @ $4.99 | $4.99 | $1.50 fee | $3.49 net |
| 250 scans @ $9.99 | $9.99 | $3.00 fee | $6.99 net |

### Profit margins after fees

| Pack | Cost basis | Net revenue | Profit | Margin |
|------|------------|-------------|--------|--------|
| 10 scans | $0.023 | $0.69 | $0.67 | 29x |
| 50 scans | $0.117 | $2.09 | $1.97 | 17x |
| 100 scans | $0.234 | $3.49 | $3.26 | 14x |
| 250 scans | $0.585 | $6.99 | $6.40 | 11x |

---

## Data sources and assumptions

### OpenAI pricing (as of January 2025)

| Model | Input (per 1K tokens) | Output (per 1K tokens) |
|-------|----------------------|------------------------|
| GPT-4o | $0.0025 | $0.01 |
| GPT-4o-mini | $0.00015 | $0.0006 |

### Supabase pricing

| Resource | Free tier | Pro plan |
|----------|-----------|----------|
| Storage | 1 GB | 100 GB included |
| Edge invocations | 500K/month | 2M/month |
| Database | 500 MB | 8 GB |

### Vercel pricing

| Resource | Hobby | Pro |
|----------|-------|-----|
| Serverless functions | 100K/month | 1M/month |
| Edge functions | 1M/month | Unlimited |
| Bandwidth | 100 GB | 1 TB |

---

## Revision history

| Date | Change |
|------|--------|
| 2025-01-22 | Initial cost analysis |

---

## Next steps

1. [ ] Implement scan credit system in database
2. [ ] Add in-app purchase integration (iOS)
3. [ ] Add Google Play billing integration (Android)
4. [ ] Add Stripe integration for web purchases
5. [ ] Create admin dashboard for monitoring scan costs
6. [ ] Set up cost alerts for OpenAI spend
