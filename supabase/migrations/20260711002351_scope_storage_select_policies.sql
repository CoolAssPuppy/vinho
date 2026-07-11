-- Scope storage listing to the owner's own folder.
--
-- The `scans` and `avatars` buckets are public, so object access via public
-- URL never consults RLS. The broad SELECT policies (bucket_id = '...') only
-- governed the list/search API, where they let any authenticated user
-- enumerate every user's files. No client lists these buckets; they only use
-- getPublicUrl and direct object reads. Scope SELECT to the owner folder so a
-- user can still list their own uploads but not everyone else's.

drop policy if exists "Users can view all scans" on storage.objects;
drop policy if exists "Users can view all avatars" on storage.objects;

create policy "Users can view their own scans"
  on storage.objects for select
  using (
    bucket_id = 'scans'
    and (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can view their own avatars"
  on storage.objects for select
  using (
    bucket_id = 'avatars'
    and (auth.uid())::text = (string_to_array(name, '/'))[1]
  );
