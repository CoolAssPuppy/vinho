# Lessons

Patterns worth remembering, captured as they come up. Newest first.

## Feature parity must include visual parity

Matching routes and actions did not make the Android app match iOS. The Android
release used a different palette, larger controls, labeled bottom navigation, a
camera emoji, and unrelated gradients. Mobile parity checks must cover brand
colors, navigation structure, icons, empty states, spacing, and screenshots on
both platforms before a store release.

## Verify generated mobile release configuration on a device

A signed Android bundle can compile while required runtime values are empty.
Vinho's release script read older Doppler names, so the first Play build opened
but could not connect to Supabase. Release checks must compare secret names with
the active production config, reject empty required values, and sign in to the
store build on a device or emulator before upload.

## Verify store state before reporting a release

An uploaded binary, a tester group, and an active tester rollout are separate
store states. Check App Store Connect build-to-group membership and tester
state, plus the Google Play track and opted-in tester count, before saying a
release reached testers.

## Audit live Supabase advisors, including extension-owned objects

Repository policy tests excluded PostGIS's `spatial_ref_sys`, but the hosted
security advisor still reported it as an exposed table. The unused `http`
extension also granted outbound request functions to API roles. A database
audit must check the live security advisor and extension grants, not only app
tables and committed policies. Remove unused extensions before documenting an
advisor warning as a platform exception.

## Scan pipeline: client-orchestrated multi-step writes lose data

All three clients (iOS, Android, web) submitted a scan as four sequential
network calls (storage upload, scans insert, queue insert, edge-function
invoke). If the client is interrupted after the upload, the photo lands in
storage but no scan/queue row is ever created, and nothing recovers it. This
lost real user data in July 2026.

How to apply: multi-step writes that must all-or-nothing succeed belong behind
a single atomic operation (an RPC or edge function that creates the rows in one
transaction after the upload), not stitched together on the client. Add a
server-side sweep (`repair_orphaned_scans`, 10-min cron) as a safety net.

## pg_cron does not accept 6-field cron expressions

`'*/15 * * * * *'` (6 fields, intending every 15 seconds) is silently parsed as
the 5-field `'*/15 * * * *'` — every 15 minutes. For sub-minute cadence use
pg_cron's interval syntax `'15 seconds'` (valid range 1-59 seconds). Anything
`>= 60` seconds must use standard 5-field cron (`'* * * * *'` = every minute).

## Public Supabase buckets don't need a broad SELECT policy

For a public bucket, object access via the public URL never consults RLS. A
broad `SELECT` policy (`bucket_id = '...'`) only governs the list/search API,
where it lets any user enumerate everyone's files. Scope SELECT to the owner
folder; public URLs keep working.

## Revoking a function's EXECUTE from PUBLIC also drops service_role

Postgres grants function EXECUTE to PUBLIC by default. When locking a
SECURITY DEFINER function down (`revoke ... from public, anon, authenticated`),
service_role loses its inherited grant too. Re-grant explicitly
(`grant execute ... to service_role`) for any function cron/edge functions call
with the service key.
- Treat mobile parity as a release gate from the start. Compile success on both platforms does not prove feature parity. Maintain a feature matrix, test reachable flows on both apps, and block release when either platform has an unmatched action or screen.
- When the user asks a status question during an active implementation, answer it and continue the implementation. A status response does not end the assigned work.
