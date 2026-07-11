-- SECURITY DEFINER function lockdown (migration 20260711002523).
-- Internal/cron/trigger functions must NOT be executable by anon/authenticated;
-- service_role keeps EXECUTE. The invite-lookup and sharing RPCs stay callable
-- by the roles that need them.
begin;
select plan(7);

-- Helper: does a role have EXECUTE on a public function by name?
-- (has_function_privilege over the specific overloads we locked down.)

-- Internal helpers: anon must NOT execute.
select ok(
  not has_function_privilege('anon', 'public.insert_label_embedding(uuid, uuid, text, extensions.vector, text, integer)', 'EXECUTE'),
  'anon cannot execute insert_label_embedding');

select ok(
  not has_function_privilege('anon', 'public.invoke_wine_processor()', 'EXECUTE'),
  'anon cannot execute invoke_wine_processor');

select ok(
  not has_function_privilege('authenticated', 'public.refresh_user_wine_stats(uuid)', 'EXECUTE'),
  'authenticated cannot execute refresh_user_wine_stats');

-- Trigger functions: no direct EXECUTE for anon/authenticated.
select ok(
  not has_function_privilege('anon', 'public.handle_new_user()', 'EXECUTE'),
  'anon cannot execute the handle_new_user trigger function');

-- service_role retains EXECUTE on the internal helpers it calls.
select ok(
  has_function_privilege('service_role', 'public.invoke_wine_processor()', 'EXECUTE'),
  'service_role can still execute invoke_wine_processor');

-- Intentionally public: the invite landing page reads this before sign-in.
select ok(
  has_function_privilege('anon', 'public.get_invite_by_code(text)', 'EXECUTE'),
  'anon can still execute get_invite_by_code (invite landing page)');

-- Signed-in users keep the sharing RPC they need.
select ok(
  has_function_privilege('authenticated', 'public.get_tastings_with_sharing(integer, integer)', 'EXECUTE'),
  'authenticated can still execute get_tastings_with_sharing');

select * from finish();
rollback;
