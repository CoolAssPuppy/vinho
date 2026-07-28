-- Storage RLS policies (storage.objects).
--
-- These live here, not in 10_public.sql, because `supabase db dump` does not
-- include the storage schema. Without them the shadow database has no storage
-- policies and `supabase db diff` emits DROP POLICY for all nine, which would
-- silently undo the DB-1 fix that scopes each user's scans and avatars to their
-- own folder.
--
-- storage.objects itself is created by the storage extension in the base image,
-- so this file only declares the policies on it.

create policy "Authenticated users can upload wine images" on storage.objects as PERMISSIVE for INSERT to authenticated
  with check ((bucket_id = 'wine-images'::text));

create policy "Users can delete their own avatars" on storage.objects as PERMISSIVE for DELETE to public
  using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can delete their own scans" on storage.objects as PERMISSIVE for DELETE to public
  using (((bucket_id = 'scans'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can update their own avatars" on storage.objects as PERMISSIVE for UPDATE to public
  using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can update their own scans" on storage.objects as PERMISSIVE for UPDATE to public
  using (((bucket_id = 'scans'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can upload their own avatars" on storage.objects as PERMISSIVE for INSERT to public
  with check (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can upload their own scans" on storage.objects as PERMISSIVE for INSERT to public
  with check (((bucket_id = 'scans'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can view their own avatars" on storage.objects as PERMISSIVE for SELECT to public
  using (((bucket_id = 'avatars'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

create policy "Users can view their own scans" on storage.objects as PERMISSIVE for SELECT to public
  using (((bucket_id = 'scans'::text) AND ((auth.uid())::text = (string_to_array(name, '/'::text))[1])));

