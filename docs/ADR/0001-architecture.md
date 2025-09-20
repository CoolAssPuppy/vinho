# ADR-0001: Architecture Decisions

## Status

Accepted

## Context

Building Vinho as a production-ready wine tracking and recommendation system by November 1, 2025. The system needs to support web and iOS platforms, offline-first mobile experience, and sophisticated geospatial and similarity matching.

## Decisions

### Monorepo Structure

**Decision:** Turborepo with pnpm workspaces

**Rationale:**

- Shared type definitions between web and backend
- Atomic commits across stack changes
- Single CI/CD pipeline
- Better dependency management with pnpm

### Web Architecture

**Decision:** Next.js 15 App Router with Server Components

**Rationale:**

- Server components reduce client bundle size
- Built-in server actions for mutations
- Streaming and suspense for better UX
- Edge runtime compatibility with Supabase Functions
- Vercel deployment optimization

### iOS Architecture

**Decision:** SwiftUI with modular feature architecture

**Rationale:**

- Native performance for maps and camera
- Universal app support (iPhone, iPad, Mac Catalyst, Vision)
- MapKit for native clustering and performance
- Vision framework for wine label OCR
- SwiftData or GRDB for offline queue

### Backend and Database

**Decision:** Supabase with PostgreSQL, PostGIS, pgvector

**Rationale:**

- Managed PostgreSQL with built-in auth
- PostGIS for vineyard geometries and spatial queries
- pgvector for wine similarity matching
- Row Level Security for data isolation
- Edge Functions for serverless compute
- Real-time subscriptions if needed

### State Management

**Decision:**

- Web: Server state with React Query for caching
- iOS: SwiftUI @State with Combine for reactivity

**Rationale:**

- Minimize client state complexity
- Server components handle most state
- React Query provides caching and optimistic updates
- SwiftUI built-in state management is sufficient

### Routing

**Decision:**

- Web: Next.js App Router file-based routing
- iOS: NavigationStack with programmatic navigation

**Rationale:**

- Standard patterns for each platform
- Type-safe routing on web with TypeScript
- Deep linking support on both platforms

### Authentication

**Decision:** Supabase Auth with email/password and OAuth

**Rationale:**

- Managed auth service with RLS integration
- Built-in email verification and password reset
- OAuth providers for convenience
- Secure session management

### Search and Recommendations

**Decision:** PostgreSQL full-text search, trigram matching, pgvector similarity

**Rationale:**

- No additional search infrastructure needed
- Trigram for fuzzy wine name matching
- pgvector for taste preference vectors
- SQL-based recommendations for transparency

### Offline Support

**Decision:** iOS offline queue with background sync

**Rationale:**

- Critical for field use without connectivity
- SwiftData or GRDB for local storage
- BackgroundTasks for retry logic
- Conflict resolution through timestamps

### Testing Strategy

**Decision:** Comprehensive testing pyramid

**Rationale:**

- Vitest for web unit tests (fast, ESM native)
- Testing Library for component tests
- Playwright for web E2E
- XCTest for iOS unit and UI tests
- Deno test for Edge Functions
- RLS tests with multiple users

### Deployment

**Decision:**

- Web: Vercel
- iOS: App Store via TestFlight
- Database: Supabase Cloud

**Rationale:**

- Vercel optimized for Next.js
- Native app distribution via App Store
- Managed database reduces ops burden

## Consequences

### Positive

- Rapid development with managed services
- Type safety across stack
- Native performance where needed
- Offline-first mobile experience
- Scalable architecture

### Negative

- Vendor lock-in with Supabase
- Learning curve for team members new to stack
- Coordination complexity across monorepo

### Mitigation

- Abstract Supabase client behind service layers
- Document patterns and conventions thoroughly
- Use conventional commits and PR templates
