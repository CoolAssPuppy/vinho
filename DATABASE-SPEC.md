# Vinho Vector Wine Database Specification

## Executive summary

This specification defines the architecture for transforming Vinho into the world's preeminent wine database by implementing vector-based wine matching. When users scan a wine label, we will first search our internal vector database for a match before invoking OpenAI, dramatically reducing costs and building a proprietary wine knowledge base.

### Key metrics

| Metric | Current | With Vector Matching |
|--------|---------|---------------------|
| **Cost per scan (new wine)** | $0.002-0.004 | $0.002-0.004 |
| **Cost per scan (known wine)** | $0.002-0.004 | ~$0.0001 |
| **Expected match rate (year 1)** | 0% | 30-40% |
| **Expected match rate (year 3)** | 0% | 70-80% |
| **Latency (new wine)** | 3-8 seconds | 3-8 seconds |
| **Latency (known wine)** | 3-8 seconds | 200-500ms |

---

## 1. Architecture overview

### 1.1 Current pipeline

```
User Scan → Image Upload → wines_added_queue → process-wine-queue
                                                      ↓
                                              OpenAI Vision API
                                                      ↓
                                              Extract Wine Data
                                                      ↓
                                              Upsert to Database
                                                      ↓
                                              wines_enrichment_queue
```

### 1.2 Proposed pipeline with vector matching

```
User Scan → Image Upload → wines_added_queue → process-wine-queue
                                                      ↓
                                              Generate Label Embedding
                                                      ↓
                                         ┌────────────┴────────────┐
                                         ↓                         ↓
                                  Vector Search              No Match Found
                                  (wine_embeddings)                ↓
                                         ↓                   OpenAI Vision API
                                  Match Found?                     ↓
                                         ↓                   Extract Wine Data
                                    Yes: Reuse                     ↓
                                    Existing Wine            Generate Wine Embedding
                                         ↓                         ↓
                                         └──────────┬──────────────┘
                                                    ↓
                                            Create Tasting Record
                                                    ↓
                                            wines_enrichment_queue
```

### 1.3 Dual embedding strategy

We employ two distinct embedding types:

1. **Label Embeddings** - Visual/OCR representation of scanned wine labels
   - Used for: Matching incoming scans to known wines
   - Source: CLIP or similar vision-language model
   - Dimensions: 512-768

2. **Wine Identity Embeddings** - Semantic representation of wine identity
   - Used for: Deduplication, similarity search, recommendations
   - Source: Text embedding model (OpenAI text-embedding-3-small or gte-small)
   - Dimensions: 384-1536
   - Input: Structured wine data (producer + name + region + varietals)

---

## 2. Database schema

### 2.1 New tables

#### `wine_embeddings` - Core vector storage

```sql
-- Wine identity embeddings for matching and similarity search
create table wine_embeddings (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references wines(id) on delete cascade,

  -- Wine identity embedding (semantic representation)
  -- Generated from: producer_name + wine_name + region + country + varietals
  identity_embedding vector(384),

  -- The canonical text used to generate the identity embedding
  -- Stored for debugging and re-embedding if model changes
  identity_text text not null,

  -- Model metadata for versioning
  embedding_model text not null default 'gte-small',
  embedding_version integer not null default 1,

  -- Quality and confidence metrics
  data_completeness_score numeric(3,2) not null default 0.0,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Ensure one embedding per wine per model version
  unique(wine_id, embedding_model, embedding_version)
);

-- HNSW index for fast approximate nearest neighbor search
-- Using cosine distance as embeddings are normalized
create index wine_embeddings_identity_idx
  on wine_embeddings
  using hnsw (identity_embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- B-tree index for wine lookups
create index wine_embeddings_wine_id_idx on wine_embeddings(wine_id);

-- Enable RLS
alter table wine_embeddings enable row level security;

-- Public read access (wine database is shared knowledge)
create policy "Wine embeddings are publicly readable"
  on wine_embeddings for select
  using (true);

-- Only service role can insert/update
create policy "Service role can manage wine embeddings"
  on wine_embeddings for all
  using (auth.role() = 'service_role');
```

#### `label_embeddings` - Visual scan matching

```sql
-- Label embeddings for matching scanned images to known wines
create table label_embeddings (
  id uuid primary key default gen_random_uuid(),
  wine_id uuid not null references wines(id) on delete cascade,
  vintage_id uuid references vintages(id) on delete set null,

  -- Visual embedding of the wine label
  -- Generated from: CLIP model on label image
  label_embedding vector(512),

  -- Source image reference (for debugging)
  source_image_url text,
  source_scan_id uuid references scans(id) on delete set null,

  -- OCR text extracted from label (useful for hybrid search)
  ocr_text text,

  -- Model metadata
  embedding_model text not null default 'clip-vit-base-patch32',
  embedding_version integer not null default 1,

  -- Quality metrics
  image_quality_score numeric(3,2),
  ocr_confidence numeric(3,2),

  -- Timestamps
  created_at timestamptz not null default now(),

  -- Allow multiple label images per wine (front, back, different vintages)
  unique(wine_id, source_image_url)
);

-- HNSW index for visual similarity search
create index label_embeddings_visual_idx
  on label_embeddings
  using hnsw (label_embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- B-tree indexes
create index label_embeddings_wine_id_idx on label_embeddings(wine_id);
create index label_embeddings_vintage_id_idx on label_embeddings(vintage_id);

-- Enable RLS
alter table label_embeddings enable row level security;

-- Public read access
create policy "Label embeddings are publicly readable"
  on label_embeddings for select
  using (true);

-- Service role management
create policy "Service role can manage label embeddings"
  on label_embeddings for all
  using (auth.role() = 'service_role');
```

#### `embedding_jobs_queue` - Async embedding generation

```sql
-- Queue for generating embeddings asynchronously
create table embedding_jobs_queue (
  id uuid primary key default gen_random_uuid(),

  -- Job type: 'wine_identity' or 'label_visual'
  job_type text not null check (job_type in ('wine_identity', 'label_visual')),

  -- Reference to the wine/scan
  wine_id uuid references wines(id) on delete cascade,
  vintage_id uuid references vintages(id) on delete set null,
  scan_id uuid references scans(id) on delete set null,

  -- Input data
  input_text text, -- For identity embeddings
  input_image_url text, -- For label embeddings

  -- Job status
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),

  -- Processing metadata
  retry_count integer not null default 0,
  error_message text,

  -- Priority (higher = process first)
  priority integer not null default 0,

  -- Timestamps
  created_at timestamptz not null default now(),
  processed_at timestamptz,

  -- Idempotency
  idempotency_key text unique
);

-- Index for claiming jobs
create index embedding_jobs_queue_status_priority_idx
  on embedding_jobs_queue(status, priority desc, created_at)
  where status = 'pending';

-- Enable RLS
alter table embedding_jobs_queue enable row level security;

-- Service role only
create policy "Service role manages embedding jobs"
  on embedding_jobs_queue for all
  using (auth.role() = 'service_role');
```

### 2.2 Modifications to existing tables

#### Add embedding reference to `wines` table

```sql
-- Add computed identity text column for consistency
alter table wines
  add column identity_text text generated always as (
    coalesce(
      (select p.name from producers p where p.id = producer_id),
      'Unknown Producer'
    ) || ' | ' || name
  ) stored;

-- Add flag to indicate if wine has been vectorized
alter table wines
  add column is_vectorized boolean not null default false;

-- Index for finding non-vectorized wines
create index wines_not_vectorized_idx on wines(id) where not is_vectorized;
```

#### Add match metadata to `scans` table

```sql
-- Track how the wine was matched
alter table scans
  add column match_method text
    check (match_method in ('vector_identity', 'vector_label', 'openai_vision', 'manual'));

-- Track the similarity score if matched via vector
alter table scans
  add column vector_similarity numeric(5,4);

-- Track if this scan contributed to the embedding database
alter table scans
  add column contributed_to_embeddings boolean not null default false;
```

---

## 3. Core functions

### 3.1 Wine identity text generation

```sql
-- Generate canonical identity text for a wine
-- This text is used to generate the identity embedding
create or replace function generate_wine_identity_text(p_wine_id uuid)
returns text
language plpgsql
stable
as $$
declare
  v_result text;
  v_wine record;
  v_producer_name text;
  v_region_name text;
  v_country text;
  v_varietals text[];
begin
  -- Get wine details
  select w.*, p.name as producer_name, r.name as region_name, r.country
  into v_wine
  from wines w
  left join producers p on p.id = w.producer_id
  left join regions r on r.id = p.region_id
  where w.id = p_wine_id;

  if not found then
    return null;
  end if;

  -- Get varietals for this wine (from any vintage)
  select array_agg(distinct gv.name order by gv.name)
  into v_varietals
  from vintages v
  join wine_varietals wv on wv.vintage_id = v.id
  join grape_varietals gv on gv.id = wv.varietal_id
  where v.wine_id = p_wine_id;

  -- Build identity text
  -- Format: "Producer Name | Wine Name | Region, Country | Varietal1, Varietal2"
  v_result := coalesce(v_wine.producer_name, 'Unknown Producer') || ' | ' || v_wine.name;

  if v_wine.region_name is not null then
    v_result := v_result || ' | ' || v_wine.region_name;
    if v_wine.country is not null then
      v_result := v_result || ', ' || v_wine.country;
    end if;
  elsif v_wine.country is not null then
    v_result := v_result || ' | ' || v_wine.country;
  end if;

  if v_varietals is not null and array_length(v_varietals, 1) > 0 then
    v_result := v_result || ' | ' || array_to_string(v_varietals, ', ');
  end if;

  return v_result;
end;
$$;
```

### 3.2 Vector similarity search

```sql
-- Search for matching wines by identity embedding
create or replace function match_wine_by_identity(
  query_embedding vector(384),
  match_threshold float default 0.85,
  match_count int default 5
)
returns table (
  wine_id uuid,
  wine_name text,
  producer_name text,
  similarity float,
  data_completeness numeric
)
language sql
stable
as $$
  select
    we.wine_id,
    w.name as wine_name,
    p.name as producer_name,
    1 - (we.identity_embedding <=> query_embedding) as similarity,
    we.data_completeness_score as data_completeness
  from wine_embeddings we
  join wines w on w.id = we.wine_id
  left join producers p on p.id = w.producer_id
  where 1 - (we.identity_embedding <=> query_embedding) > match_threshold
  order by we.identity_embedding <=> query_embedding
  limit match_count;
$$;

-- Search for matching wines by label embedding
create or replace function match_wine_by_label(
  query_embedding vector(512),
  match_threshold float default 0.80,
  match_count int default 5
)
returns table (
  wine_id uuid,
  vintage_id uuid,
  wine_name text,
  producer_name text,
  similarity float,
  vintage_year int
)
language sql
stable
as $$
  select
    le.wine_id,
    le.vintage_id,
    w.name as wine_name,
    p.name as producer_name,
    1 - (le.label_embedding <=> query_embedding) as similarity,
    v.year as vintage_year
  from label_embeddings le
  join wines w on w.id = le.wine_id
  left join producers p on p.id = w.producer_id
  left join vintages v on v.id = le.vintage_id
  where 1 - (le.label_embedding <=> query_embedding) > match_threshold
  order by le.label_embedding <=> query_embedding
  limit match_count;
$$;
```

### 3.3 Hybrid matching (combining identity and label)

```sql
-- Hybrid search combining both embedding types
-- Uses Reciprocal Rank Fusion (RRF) to combine results
create or replace function match_wine_hybrid(
  identity_embedding vector(384) default null,
  label_embedding vector(512) default null,
  identity_weight float default 0.6,
  label_weight float default 0.4,
  match_threshold float default 0.75,
  match_count int default 5
)
returns table (
  wine_id uuid,
  vintage_id uuid,
  wine_name text,
  producer_name text,
  combined_score float,
  identity_similarity float,
  label_similarity float,
  match_source text
)
language plpgsql
stable
as $$
declare
  rrf_k constant int := 60; -- RRF smoothing constant
begin
  return query
  with identity_matches as (
    select
      we.wine_id,
      null::uuid as vintage_id,
      1 - (we.identity_embedding <=> identity_embedding) as similarity,
      row_number() over (order by we.identity_embedding <=> identity_embedding) as rank
    from wine_embeddings we
    where identity_embedding is not null
      and 1 - (we.identity_embedding <=> identity_embedding) > match_threshold
    limit match_count * 2
  ),
  label_matches as (
    select
      le.wine_id,
      le.vintage_id,
      1 - (le.label_embedding <=> label_embedding) as similarity,
      row_number() over (order by le.label_embedding <=> label_embedding) as rank
    from label_embeddings le
    where label_embedding is not null
      and 1 - (le.label_embedding <=> label_embedding) > match_threshold
    limit match_count * 2
  ),
  combined as (
    select
      coalesce(im.wine_id, lm.wine_id) as wine_id,
      lm.vintage_id,
      im.similarity as identity_sim,
      lm.similarity as label_sim,
      -- RRF score calculation
      coalesce(identity_weight / (rrf_k + im.rank), 0) +
      coalesce(label_weight / (rrf_k + lm.rank), 0) as rrf_score,
      case
        when im.wine_id is not null and lm.wine_id is not null then 'hybrid'
        when im.wine_id is not null then 'identity'
        else 'label'
      end as source
    from identity_matches im
    full outer join label_matches lm on im.wine_id = lm.wine_id
  )
  select
    c.wine_id,
    c.vintage_id,
    w.name as wine_name,
    p.name as producer_name,
    c.rrf_score as combined_score,
    c.identity_sim as identity_similarity,
    c.label_sim as label_similarity,
    c.source as match_source
  from combined c
  join wines w on w.id = c.wine_id
  left join producers p on p.id = w.producer_id
  order by c.rrf_score desc
  limit match_count;
end;
$$;
```

### 3.4 Embedding job queue management

```sql
-- Claim embedding jobs for processing
create or replace function claim_embedding_jobs(
  p_job_type text,
  p_limit int default 10
)
returns table (
  id uuid,
  job_type text,
  wine_id uuid,
  vintage_id uuid,
  scan_id uuid,
  input_text text,
  input_image_url text
)
language plpgsql
as $$
begin
  return query
  update embedding_jobs_queue ejq
  set
    status = 'processing',
    updated_at = now()
  where ejq.id in (
    select ej.id
    from embedding_jobs_queue ej
    where ej.status = 'pending'
      and ej.job_type = p_job_type
    order by ej.priority desc, ej.created_at
    limit p_limit
    for update skip locked
  )
  returning
    ejq.id,
    ejq.job_type,
    ejq.wine_id,
    ejq.vintage_id,
    ejq.scan_id,
    ejq.input_text,
    ejq.input_image_url;
end;
$$;
```

---

## 4. Edge function modifications

### 4.1 New edge function: `generate-embeddings`

This function generates embeddings using the built-in Supabase AI runtime for text embeddings (gte-small) and optionally CLIP for visual embeddings.

```typescript
// supabase/functions/generate-embeddings/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// Use Supabase's built-in embedding model
const embeddingModel = new Supabase.ai.Session('gte-small');

interface EmbeddingJob {
  id: string;
  job_type: 'wine_identity' | 'label_visual';
  wine_id: string;
  vintage_id: string | null;
  scan_id: string | null;
  input_text: string | null;
  input_image_url: string | null;
}

async function generateTextEmbedding(text: string): Promise<number[]> {
  const output = await embeddingModel.run(text, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(output.data);
}

async function processIdentityJob(job: EmbeddingJob): Promise<void> {
  if (!job.input_text) {
    throw new Error('No input text provided for identity embedding');
  }

  const embedding = await generateTextEmbedding(job.input_text);

  // Calculate data completeness score based on input richness
  const parts = job.input_text.split(' | ');
  const completeness = Math.min(parts.length / 4, 1.0);

  // Upsert the embedding
  const { error } = await supabase
    .from('wine_embeddings')
    .upsert({
      wine_id: job.wine_id,
      identity_embedding: JSON.stringify(embedding),
      identity_text: job.input_text,
      embedding_model: 'gte-small',
      embedding_version: 1,
      data_completeness_score: completeness,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'wine_id,embedding_model,embedding_version'
    });

  if (error) throw error;

  // Mark wine as vectorized
  await supabase
    .from('wines')
    .update({ is_vectorized: true })
    .eq('id', job.wine_id);
}

async function processLabelJob(job: EmbeddingJob): Promise<void> {
  // For now, we'll use text-based matching from OCR
  // TODO: Integrate CLIP model for true visual embeddings
  // This can be done via external API or when Supabase adds vision model support

  if (!job.input_image_url) {
    throw new Error('No input image URL provided for label embedding');
  }

  // Placeholder: In production, call CLIP API or similar
  // For now, skip label embeddings until vision model is integrated
  console.log(`Label embedding generation pending vision model integration: ${job.id}`);
}

Deno.serve(async (req) => {
  try {
    const { job_type = 'wine_identity', limit = 10 } = await req.json();

    // Claim jobs
    const { data: jobs, error: claimError } = await supabase
      .rpc('claim_embedding_jobs', {
        p_job_type: job_type,
        p_limit: limit
      });

    if (claimError) throw claimError;
    if (!jobs || jobs.length === 0) {
      return Response.json({ processed: 0, message: 'No jobs to process' });
    }

    let processed = 0;
    let failed = 0;

    for (const job of jobs as EmbeddingJob[]) {
      try {
        if (job.job_type === 'wine_identity') {
          await processIdentityJob(job);
        } else {
          await processLabelJob(job);
        }

        // Mark job completed
        await supabase
          .from('embedding_jobs_queue')
          .update({
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('id', job.id);

        processed++;
      } catch (error) {
        // Mark job failed
        await supabase
          .from('embedding_jobs_queue')
          .update({
            status: 'failed',
            error_message: error.message,
            retry_count: job.retry_count + 1
          })
          .eq('id', job.id);

        failed++;
        console.error(`Failed to process job ${job.id}:`, error);
      }
    }

    return Response.json({ processed, failed, total: jobs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

### 4.2 Modified `process-wine-queue` - Add vector matching

The key modification is to attempt vector matching BEFORE calling OpenAI:

```typescript
// Add to process-wine-queue/index.ts

// Generate embedding for incoming scan data
async function generateScanEmbedding(ocrText: string): Promise<number[]> {
  const embeddingModel = new Supabase.ai.Session('gte-small');
  const output = await embeddingModel.run(ocrText, {
    mean_pool: true,
    normalize: true,
  });
  return Array.from(output.data);
}

// Attempt to match wine using vector search
async function attemptVectorMatch(
  ocrText: string | null,
  imageUrl: string
): Promise<{ matched: boolean; wineId?: string; vintageId?: string; similarity?: number }> {
  if (!ocrText || ocrText.length < 10) {
    return { matched: false };
  }

  try {
    // Generate embedding from OCR text
    const embedding = await generateScanEmbedding(ocrText);

    // Search for matches
    const { data: matches, error } = await supabase
      .rpc('match_wine_by_identity', {
        query_embedding: JSON.stringify(embedding),
        match_threshold: 0.85,
        match_count: 3
      });

    if (error || !matches || matches.length === 0) {
      return { matched: false };
    }

    const bestMatch = matches[0];

    // High confidence match
    if (bestMatch.similarity >= 0.90 && bestMatch.data_completeness >= 0.5) {
      console.log(`Vector match found: ${bestMatch.wine_name} (${bestMatch.similarity.toFixed(3)})`);

      // Get or create vintage for this wine
      const vintageId = await getOrCreateVintageForMatch(bestMatch.wine_id, ocrText);

      return {
        matched: true,
        wineId: bestMatch.wine_id,
        vintageId,
        similarity: bestMatch.similarity
      };
    }

    return { matched: false };
  } catch (error) {
    console.error('Vector match error:', error);
    return { matched: false };
  }
}

// Modified processJob function
async function processJob(job: Job) {
  try {
    // ... existing idempotency check ...

    // NEW: Attempt vector match first
    const vectorMatch = await attemptVectorMatch(job.ocr_text, job.image_url);

    if (vectorMatch.matched && vectorMatch.wineId && vectorMatch.vintageId) {
      // Skip OpenAI - use matched wine
      console.log(`Using vector match for job ${job.id}`);

      // Update scan with match info
      if (job.scan_id) {
        await supabase
          .from('scans')
          .update({
            matched_vintage_id: vectorMatch.vintageId,
            confidence: vectorMatch.similarity,
            match_method: 'vector_identity'
          })
          .eq('id', job.scan_id);
      }

      // Create tasting record
      await createTastingFromMatch(job, vectorMatch.vintageId);

      // Mark completed
      await markCompleted(job.id, {
        match_method: 'vector',
        similarity: vectorMatch.similarity,
        wine_id: vectorMatch.wineId,
        vintage_id: vectorMatch.vintageId
      });

      return { ok: true, matchMethod: 'vector' };
    }

    // No vector match - proceed with OpenAI extraction
    // ... existing OpenAI extraction code ...

    // After successful OpenAI extraction, queue for embedding generation
    await queueEmbeddingGeneration(wineId, job.scan_id);

    return { ok: true, matchMethod: 'openai' };
  } catch (error) {
    // ... existing error handling ...
  }
}

// Queue embedding generation for new wines
async function queueEmbeddingGeneration(wineId: string, scanId: string | null) {
  const identityText = await supabase
    .rpc('generate_wine_identity_text', { p_wine_id: wineId })
    .single();

  if (identityText.data) {
    await supabase.from('embedding_jobs_queue').insert({
      job_type: 'wine_identity',
      wine_id: wineId,
      scan_id: scanId,
      input_text: identityText.data,
      priority: 1
    });
  }
}
```

---

## 5. Data migration

### 5.1 Initial embedding generation for existing wines

```sql
-- Generate embeddings for all existing wines
-- Run this as a one-time migration after deploying the schema

-- Queue all existing wines for embedding generation
insert into embedding_jobs_queue (job_type, wine_id, input_text, priority)
select
  'wine_identity',
  w.id,
  generate_wine_identity_text(w.id),
  -- Higher priority for wines with more complete data
  case
    when p.name is not null and r.name is not null then 2
    when p.name is not null then 1
    else 0
  end as priority
from wines w
left join producers p on p.id = w.producer_id
left join regions r on r.id = p.region_id
where not w.is_vectorized
  and generate_wine_identity_text(w.id) is not null
on conflict (idempotency_key) do nothing;
```

### 5.2 Scheduled job for embedding generation

```sql
-- Use pg_cron to process embedding queue regularly
select cron.schedule(
  'process-wine-embeddings',
  '*/30 * * * *', -- Every 30 minutes
  $$
  select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/generate-embeddings',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := '{"job_type": "wine_identity", "limit": 50}'::jsonb
  )
  $$
);
```

---

## 6. Vector buckets (future optimization)

### 6.1 When Vector Buckets becomes GA

Supabase Vector Buckets (currently in Private Alpha) uses Apache Iceberg for cost-effective storage of large vector datasets. When it becomes generally available, we should consider migrating label embeddings to Vector Buckets for these benefits:

| Aspect | pgvector (Current) | Vector Buckets (Future) |
|--------|-------------------|------------------------|
| **Storage cost** | Higher (in-database) | Lower (object storage) |
| **Query latency** | 10-50ms | 100-500ms |
| **Best for** | Hot data, real-time | Cold data, batch |
| **Scale** | Millions | Billions |

### 6.2 Migration path

1. **Phase 1 (Now)**: Use pgvector for all embeddings
   - Identity embeddings: ~1000 wines = ~1.5MB
   - Label embeddings: ~5000 images = ~10MB

2. **Phase 2 (10K+ wines)**: Keep identity embeddings in pgvector, consider Vector Buckets for label embeddings

3. **Phase 3 (100K+ wines)**: Full Vector Buckets migration for archival/cold embeddings

### 6.3 Hybrid architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Query Flow                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Incoming Scan → Generate Embedding                              │
│                        ↓                                         │
│              ┌────────┴────────┐                                │
│              ↓                 ↓                                 │
│       pgvector (hot)    Vector Buckets (cold)                   │
│       - Recent wines    - Historical labels                      │
│       - Identity emb    - Archived embeddings                   │
│       - <50ms latency   - <500ms latency                        │
│              ↓                 ↓                                 │
│              └────────┬────────┘                                │
│                       ↓                                          │
│              Combine Results (RRF)                               │
│                       ↓                                          │
│              Return Best Match                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Monitoring and observability

### 7.1 Key metrics to track

```sql
-- Create a view for monitoring embedding health
create or replace view embedding_stats as
select
  -- Total coverage
  (select count(*) from wines) as total_wines,
  (select count(*) from wines where is_vectorized) as vectorized_wines,
  (select count(*) from wine_embeddings) as total_embeddings,
  (select count(*) from label_embeddings) as total_label_embeddings,

  -- Queue health
  (select count(*) from embedding_jobs_queue where status = 'pending') as pending_jobs,
  (select count(*) from embedding_jobs_queue where status = 'failed') as failed_jobs,

  -- Match statistics (from scans)
  (select count(*) from scans where match_method = 'vector_identity') as vector_matches,
  (select count(*) from scans where match_method = 'openai_vision') as openai_matches,
  (select avg(vector_similarity) from scans where match_method = 'vector_identity') as avg_vector_similarity,

  -- Cost savings estimate
  (select count(*) * 0.003 from scans where match_method = 'vector_identity') as estimated_savings_usd;
```

### 7.2 Alerts

Set up alerts for:
- Embedding queue backlog > 1000 jobs
- Failed jobs > 5% of total
- Vector match rate drops below 20% (after ramp-up)
- Average similarity score drops below 0.85

---

## 8. Cost analysis

### 8.1 Embedding generation costs

| Operation | Model | Cost per 1K tokens | Est. per wine |
|-----------|-------|-------------------|---------------|
| Identity embedding | gte-small (local) | $0 | $0 |
| Label embedding | CLIP (external) | ~$0.0001 | ~$0.0001 |

### 8.2 Storage costs

| Data | Size per record | Records (Year 1) | Monthly cost |
|------|----------------|------------------|--------------|
| Identity embeddings | ~1.5KB | 5,000 | ~$0.15 |
| Label embeddings | ~2KB | 10,000 | ~$0.40 |
| **Total** | | | **~$0.55** |

### 8.3 Projected savings

| Scenario | Scans/month | Match rate | OpenAI calls avoided | Monthly savings |
|----------|-------------|------------|---------------------|-----------------|
| Year 1 | 5,000 | 30% | 1,500 | $4.50 |
| Year 2 | 20,000 | 50% | 10,000 | $30.00 |
| Year 3 | 100,000 | 70% | 70,000 | $210.00 |

---

## 9. Security considerations

### 9.1 RLS policies

- Wine embeddings are publicly readable (shared knowledge base)
- Only service role can write embeddings
- Users cannot inject malicious embeddings

### 9.2 Rate limiting

- Embedding generation is async and rate-limited
- Vector search queries limited to 100/minute per user
- Bulk operations require service role

### 9.3 Data integrity

- Embeddings are versioned to support model upgrades
- Original source data preserved for re-embedding
- Checksums on embedding vectors to detect corruption

---

## 10. Implementation roadmap

### Phase 1: Foundation (Week 1-2)
- [ ] Deploy new database tables and functions
- [ ] Create `generate-embeddings` edge function
- [ ] Backfill identity embeddings for existing wines

### Phase 2: Integration (Week 3-4)
- [ ] Modify `process-wine-queue` to attempt vector matching
- [ ] Add monitoring and metrics
- [ ] Test with production traffic (shadow mode)

### Phase 3: Optimization (Week 5-6)
- [ ] Tune similarity thresholds based on real data
- [ ] Implement label embeddings (when vision model available)
- [ ] Add hybrid search combining identity + label

### Phase 4: Scale (Ongoing)
- [ ] Monitor match rates and adjust
- [ ] Evaluate Vector Buckets when GA
- [ ] Expand to wine similarity recommendations

---

## Appendix A: Embedding model selection

### Text embeddings (Identity)

| Model | Dimensions | Performance | Cost | Recommendation |
|-------|-----------|-------------|------|----------------|
| gte-small | 384 | Good | Free (local) | **Primary choice** |
| text-embedding-3-small | 1536 | Better | $0.02/1M | Fallback |
| text-embedding-3-large | 3072 | Best | $0.13/1M | Not needed |

### Visual embeddings (Labels)

| Model | Dimensions | Performance | Cost | Recommendation |
|-------|-----------|-------------|------|----------------|
| CLIP ViT-B/32 | 512 | Good | ~$0.001/image | **Primary choice** |
| CLIP ViT-L/14 | 768 | Better | ~$0.002/image | For high-value matches |

---

## Appendix B: Index tuning

### HNSW parameters

```sql
-- For ~10K vectors (current scale)
create index using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);
-- Provides: ~95% recall, <20ms queries

-- For ~100K vectors (future scale)
create index using hnsw (embedding vector_cosine_ops)
with (m = 24, ef_construction = 100);
-- Provides: ~98% recall, <50ms queries

-- For ~1M vectors (long-term)
create index using hnsw (embedding vector_cosine_ops)
with (m = 32, ef_construction = 128);
-- Provides: ~99% recall, <100ms queries
```

---

## Appendix C: Testing strategy

### Unit tests
- Embedding generation produces correct dimensions
- Similarity search returns expected results
- RRF fusion correctly combines scores

### Integration tests
- End-to-end scan with vector match
- End-to-end scan with OpenAI fallback
- Embedding queue processing

### Performance tests
- Vector search latency at various scales
- Embedding generation throughput
- Concurrent query performance

---

*Last updated: 2025-01-22*
*Version: 1.0*
*Author: Vinho Engineering*
