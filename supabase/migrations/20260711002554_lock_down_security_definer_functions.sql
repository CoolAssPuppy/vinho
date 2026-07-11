-- Restrict EXECUTE on SECURITY DEFINER functions.
--
-- Postgres grants EXECUTE to PUBLIC by default, so every SECURITY DEFINER
-- function in the exposed `public` schema was callable over PostgREST by
-- anon/authenticated. Several are internal (cron/edge/backfill helpers) or
-- trigger functions that should never be invoked directly. Revoking from
-- PUBLIC also drops service_role's inherited grant, so we re-grant EXECUTE to
-- service_role explicitly for the helpers that edge functions and scripts
-- call with the service key.

-- Trigger functions: fire as the table owner via the trigger mechanism and
-- are never called directly. Remove all direct EXECUTE.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.create_default_sharing_preferences()',
    'public.handle_new_user()',
    'public.send_welcome_email_on_signup()',
    'public.trigger_refresh_user_stats()',
    'public.update_vintage_community_rating()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
  end loop;
end $$;

-- Internal helpers: called only by cron, edge functions, or maintenance
-- scripts using the service role. Not for end users.
do $$
declare fn text;
begin
  foreach fn in array array[
    'public.generate_invite_code()',
    'public.get_wines_for_visual_embedding(integer, integer)',
    'public.insert_label_embedding(uuid, uuid, text, extensions.vector, text, integer)',
    'public.invoke_generate_embeddings(text, integer)',
    'public.invoke_wine_processor()',
    'public.refresh_user_wine_stats(uuid)',
    'public.update_user_producer_stats(uuid)',
    'public.update_user_region_stats(uuid)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
    execute format('grant execute on function %s to service_role', fn);
  end loop;
end $$;

-- User-facing RPCs that require a signed-in user: drop anon, keep authenticated.
revoke all on function public.get_sharing_connections_with_profiles() from public, anon;
grant execute on function public.get_sharing_connections_with_profiles() to authenticated, service_role;

revoke all on function public.get_tastings_with_sharing(integer, integer) from public, anon;
grant execute on function public.get_tastings_with_sharing(integer, integer) to authenticated, service_role;

-- get_invite_by_code stays callable by anon: the invite landing page reads it
-- before the recipient has signed in.
