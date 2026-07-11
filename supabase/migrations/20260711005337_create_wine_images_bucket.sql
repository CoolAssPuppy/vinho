-- Provision the wine-images storage bucket.
--
-- The Vivino migration stores downloaded wine images in a `wine-images`
-- bucket, but it was never provisioned. The runtime tried to create it with
-- the anon key (which lacks bucket-creation privilege), silently failed, and
-- fell back to hotlinking external Vivino CDN URLs. Create the bucket here so
-- it exists in every environment, and grant authenticated users INSERT so the
-- user-triggered migration can upload (upload uses upsert:false, so INSERT is
-- sufficient; the bucket is public, so reads go through the public URL).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wine-images',
  'wine-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy "Authenticated users can upload wine images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'wine-images');
