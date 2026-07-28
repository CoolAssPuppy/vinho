# Double-confirmation email change (implementation guide)

How to let a user change their primary email such that the change only takes
effect after BOTH the old address and the new address confirm. Ported from the
TripMaster implementation. Adapt paths and the email layer to this repo.

## Why this exists (read first)

Supabase's native "Secure email change" (`GOTRUE_MAILER_SECURE_EMAIL_CHANGE_ENABLED`
/ config `double_confirm_changes`) does **not** reliably enforce both-must-confirm.
Verified against GoTrue v2.189: confirming **either** single link (old- or
new-address) swaps `auth.users.email` immediately and `email_change_confirm_status`
never increments. So `supabase.auth.updateUser({ email })` is effectively a
single-confirmation change — anyone who controls just the new mailbox (or just
clicks one link) completes it.

If your product's requirement is "the old email stays unless BOTH are clicked,"
native Auth cannot deliver it. **We own the swap** instead.

How to confirm the gap yourself before building: initiate a change, pull both
tokens, confirm only one, and check `auth.users.email` in the DB — if it already
changed, native double-confirm is not enforced.

## Architecture

1. A `public.email_change_requests` table holds the pending change + two hashed,
   single-use tokens and two confirmed flags.
2. `request-email-change` edge function (auth required): the logged-in user
   initiates. It creates the request and emails BOTH the current and the new
   address with links to your web app.
3. `confirm-email-change` edge function (token-authenticated, no JWT): marks one
   side confirmed, and **only when both sides are confirmed** swaps the email via
   the admin API.
4. A web page (`/auth/email-change`) is where the email links land; it calls
   `confirm-email-change` and renders the status.
5. Clients (web/iOS/Android) call `request-email-change` instead of
   `auth.updateUser({ email })`.

Key principle: the actual `auth.users.email` swap happens in YOUR code
(`confirm-email-change`), gated on `old_confirmed && new_confirmed`.

## 1. Migration

```sql
CREATE TABLE IF NOT EXISTS "public"."email_change_requests" (
    "id" uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    "user_id" uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    "old_email" text NOT NULL,
    "new_email" text NOT NULL,
    "old_token_hash" text NOT NULL,
    "new_token_hash" text NOT NULL,
    "old_confirmed" boolean DEFAULT false NOT NULL,
    "new_confirmed" boolean DEFAULT false NOT NULL,
    "completed_at" timestamptz,
    "expires_at" timestamptz NOT NULL,
    "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX ON "public"."email_change_requests" (user_id);
CREATE INDEX ON "public"."email_change_requests" (old_token_hash);
CREATE INDEX ON "public"."email_change_requests" (new_token_hash);
CREATE INDEX ON "public"."email_change_requests" (expires_at);

ALTER TABLE "public"."email_change_requests" ENABLE ROW LEVEL SECURITY;
-- Read-own only; all writes are service-role (edge functions). No write policies.
CREATE POLICY "view own email change requests" ON "public"."email_change_requests"
    FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
GRANT ALL ON TABLE "public"."email_change_requests" TO anon, authenticated, service_role;
```

If your project uses declarative schemas, mirror this in `supabase/schemas/` so
`supabase db diff` stays drift-free. RLS notes for the advisor gauntlet: index the
FK (`user_id`), wrap `auth.uid()` as `(select auth.uid())`.

Tokens are stored as SHA-256 hex; raw tokens live only in the email links.

## 2. Token helper (`_shared/emailChangeTokens.ts`)

```ts
export function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let s = ""; for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
export async function hashToken(raw: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}
```

## 3. `request-email-change` (verify_jwt = true)

- Get the authenticated user. Validate `newEmail` (format; not equal to current).
- Generate two raw tokens; store their hashes. Set `expires_at` (e.g. +24h).
- Delete any prior pending request for the user (supersede).
- Insert the request row (service-role client).
- Email BOTH addresses with links to `${siteUrl}/auth/email-change?token=<RAW>`
  (current address gets the old token, new address gets the new token). Use your
  on-brand email layer (React Email rendered + your transactional sender).

### SECURITY: never trust a client-supplied base URL

One link goes to the user's CURRENT address. If an attacker can set the link host,
they phish a valid token from the victim → account takeover. Validate against a
hostname allowlist; fall back to a trusted server value.

```ts
const ALLOWED_HOSTS = new Set(["localhost", "127.0.0.1", "yourdomain.com", "www.yourdomain.com"]);
function resolveSiteUrl(candidate: unknown, trusted: string): string {
  if (typeof candidate !== "string" || !candidate) return trusted;
  try { if (ALLOWED_HOSTS.has(new URL(candidate).hostname)) return candidate; } catch { /* */ }
  return trusted;
}
// const siteUrl = resolveSiteUrl(body.siteUrl, Deno.env.get("PUBLIC_SITE_URL") ?? "https://www.yourdomain.com");
```

## 4. `confirm-email-change` (verify_jwt = false)

Token-authenticated; uses the service-role client.

1. `hashToken(token)`; find the request where `old_token_hash = hash OR
   new_token_hash = hash` AND `completed_at IS NULL`. None → `{status:"invalid"}`.
2. Expired (`expires_at < now`) → `{status:"expired"}`.
3. Determine side (old vs new); set that `*_confirmed = true`.
4. Re-read both flags. If not both true → `{status:"pending_other"}`.
5. Both true → atomically claim completion
   (`update ... set completed_at=now() where id=? and completed_at is null`), then
   `supabase.auth.admin.updateUserById(user_id, { email: new_email, email_confirm: true })`.
   On swap error, roll the claim back and return `{status:"error"}`. Else
   `{status:"completed"}`.

The admin swap fires `auth.users` UPDATE OF email — if you have an
alternate-emails table, a trigger can prune the now-redundant alternate there.

## 5. Web landing page (`/auth/email-change`)

A server page reads `?token`, POSTs it to `confirm-email-change` (with the anon
apikey), and renders the status on-brand:
- `completed` — "Your email is changed."
- `pending_other` — "One step to go — confirm the other inbox; current email stays active."
- `expired` / `invalid` — start again from profile.

Links MUST point to the web app, not the Supabase gateway: the gateway requires an
apikey on `/functions/v1/*` and `/auth/v1/verify`, and building from a base that
already contains `/auth/v1` produces a broken `/auth/v1/auth/v1/verify` path.

## 6. Client integration

Replace `auth.updateUser({ email })` everywhere with an invoke of
`request-email-change`:
- Web: `supabase.functions.invoke("request-email-change", { body: { newEmail, siteUrl: window.location.origin } })`
- iOS (supabase-swift): `client.functions.invoke("request-email-change", options: .init(body: ["newEmail": newEmail]))`
- Android (supabase-kt): `client.functions.invoke("request-email-change") { setBody(...) }`

Update the UI copy to state BOTH inboxes must confirm and the current email stays
active until both are.

## 7. config + deploy

- `[functions.request-email-change] verify_jwt = true`
- `[functions.confirm-email-change] verify_jwt = false`
- Ensure your transactional email provider key + `PUBLIC_SITE_URL` are set as edge
  secrets in prod.
- Mobile apps must be rebuilt/republished to pick up the client change — the old
  `updateUser` path is single-confirm.

## 8. Prove it (the only acceptance test that matters)

Seed a request with two known token hashes, then exercise `confirm-email-change`:
- Confirm one token → `auth.users.email` UNCHANGED, status `pending_other`.
- Confirm the second → email SWAPPED, status `completed`.
- Replay a used token → `invalid`.

Also unit-test the token hashing and the `resolveSiteUrl` allowlist (assert
attacker hosts fall back to the trusted default).

## Reference implementation

TripMaster: `supabase/functions/request-email-change`, `confirm-email-change`,
`_shared/emailChangeTokens.ts`, migration `*_email_change_requests.sql`,
`tripmaster-web/app/auth/email-change/page.tsx`.
