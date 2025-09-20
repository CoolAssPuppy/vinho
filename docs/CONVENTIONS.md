# Vinho Development Conventions

## Code Style

### TypeScript

- Strict mode always enabled
- No `any` types - use `unknown` and narrow
- Explicit return types for public functions
- Interfaces for data shapes, types for unions/aliases
- Zod schemas for runtime validation

```typescript
// Good
interface Wine {
  id: string;
  name: string;
  producerId: string;
}

type Verdict = "liked" | "disliked";

function calculateScore(tastings: Tasting[]): number {
  // implementation
}

// Bad
function process(data: any) {
  // no type safety
}
```

### File Organization

- Files under 500 lines
- Functions under 30-40 lines
- Classes under 200 lines
- One component per file
- Colocate tests with source

```
src/
  components/
    wine-card/
      wine-card.tsx
      wine-card.test.tsx
      wine-card.module.css
      index.ts
```

### Naming

- PascalCase: Components, classes, types
- camelCase: Functions, variables, file names
- kebab-case: Folders, URL slugs
- UPPER_SNAKE: Environment variables
- Boolean prefixes: `is`, `has`, `can`, `should`

```typescript
// Component
export function WineCard() {}

// Function
function calculateSimilarity() {}

// Boolean
const isAuthenticated = true;
const hasOfflineData = false;
```

### Imports

Group and order imports:

1. External libraries
2. Internal packages
3. Relative imports

```typescript
// External
import { useState } from "react";
import { z } from "zod";

// Internal packages
import { Database } from "@vinho/db-types";

// Relative
import { WineCard } from "../components";
import { useAuth } from "./hooks";
```

## Git Workflow

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance
- `docs/description` - Documentation
- `test/description` - Test additions

### Commit Messages

Present tense, imperative mood:

- `feat: add wine scanning`
- `fix: correct RLS policy for tastings`
- `chore: update dependencies`
- `docs: add API examples`
- `test: add Edge Function tests`

Include context when not obvious:

```
feat: add pgvector similarity search

Implements taste preference vectors for personalized
recommendations. Uses cosine similarity with a
shortlist plus rerank approach for performance.
```

### Pull Requests

Use template:

```markdown
## Summary

Brief description of changes

## Type

- [ ] Feature
- [ ] Bug fix
- [ ] Chore
- [ ] Documentation

## Checklist

- [ ] Tests pass locally
- [ ] TypeScript builds without errors
- [ ] Lint passes
- [ ] Documentation updated
- [ ] Database migrations tested
- [ ] RLS policies verified
```

## Testing

### Test Files

- Unit tests: `*.test.ts` or `*.spec.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.ts`

### Test Structure

```typescript
describe('WineCard', () => {
  it('should display wine name', () => {
    // Arrange
    const wine = { name: 'Pinot Noir' }

    // Act
    render(<WineCard wine={wine} />)

    // Assert
    expect(screen.getByText('Pinot Noir')).toBeInTheDocument()
  })
})
```

### Coverage Goals

- Unit: 80% for business logic
- Integration: Critical paths covered
- E2E: Happy paths and key error states
- RLS: Every policy has a test

## Database Conventions

### Table Naming

- Plural, snake_case: `wines`, `wine_list_items`
- Junction tables: `wine_varietals`
- Views: Descriptive with `_view` suffix

### Column Naming

- snake_case: `created_at`, `wine_id`
- Foreign keys: `table_id` pattern
- Booleans: `is_` prefix
- Timestamps: `_at` suffix

### RLS Policies

Every user table must have RLS:

```sql
ALTER TABLE tastings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tastings"
  ON tastings FOR SELECT
  USING (auth.uid() = user_id);
```

### Migrations

- Sequential numbering: `0001_initial.sql`
- Descriptive names: `0002_add_wine_vectors.sql`
- Include rollback comments
- Test on preview branch first

## API Conventions

### Server Actions

Zod validation required:

```typescript
const CreateTastingSchema = z.object({
  vintageId: z.string().uuid(),
  verdict: z.enum(["liked", "disliked"]),
  notes: z.string().optional(),
});

export async function createTasting(input: unknown) {
  const data = CreateTastingSchema.parse(input);
  // implementation
}
```

### Edge Functions

- Validate input with Zod
- Return consistent error shapes
- Log errors with context
- Never expose internal errors

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
```

## Security

### Environment Variables

- Never commit `.env` files
- Use `NEXT_PUBLIC_` prefix for client variables
- Document all required variables
- Provide `.env.example`

### Data Access

- All queries through Supabase client
- RLS enabled on all user tables
- Service role only in Edge Functions
- No raw SQL from clients

### Authentication

- Supabase Auth for all platforms
- Secure session storage
- Refresh tokens automatically
- Sign out on security errors

## Performance

### Images

- WebP with fallbacks
- Responsive sizes
- Lazy loading
- Blur placeholders

### Data Fetching

- Server components when possible
- React Query for client caching
- Pagination for lists
- Debounce search inputs

### Bundle Size

- Dynamic imports for heavy components
- Tree shake unused code
- Analyze with `next-bundle-analyzer`
- Target < 200KB initial JS

## Documentation

### Code Comments

- JSDoc for public APIs
- Explain complex algorithms
- Document business rules
- Link to relevant ADRs

```typescript
/**
 * Calculate wine similarity using varietal vectors
 * @param userVector - User preference vector (256d)
 * @param wineVector - Wine varietal vector (256d)
 * @returns Cosine similarity score (0-1)
 * @see ADR-0003 for vector implementation details
 */
function calculateSimilarity(
  userVector: Float32Array,
  wineVector: Float32Array,
): number {
  // implementation
}
```

### README Files

Each package should have:

- Purpose and scope
- Setup instructions
- API documentation
- Test commands
- Architecture decisions

## Accessibility

### Web

- Semantic HTML
- ARIA labels where needed
- Keyboard navigation
- Focus management
- Alt text for images
- Contrast ratios (WCAG AA)

### iOS

- VoiceOver support
- Dynamic Type
- Reduce Motion respect
- High contrast mode
- Haptic feedback

## Monitoring

### Error Tracking

- Structured error logs
- User context (no PII)
- Environment tags
- Alert on error spikes

### Performance

- Core Web Vitals
- Database query times
- Edge Function latency
- Bundle size tracking

## Review Checklist

Before PR:

- [ ] Tests pass
- [ ] Types check
- [ ] Lint clean
- [ ] Documentation updated
- [ ] Accessibility checked
- [ ] Performance impact considered
- [ ] Security reviewed
- [ ] RLS policies tested
