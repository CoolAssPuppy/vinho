-- Storage bucket policies for authenticated uploads and public reads.

-- Scans bucket: authenticated users can upload, everyone can read (public bucket)
CREATE POLICY "Authenticated users can upload scans"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'scans');

CREATE POLICY "Authenticated users can read scans"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'scans');

CREATE POLICY "Public read access for scans"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'scans');

-- Avatars bucket: authenticated users can upload/update, everyone can read
CREATE POLICY "Authenticated users can upload avatars"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can update avatars"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read access for avatars"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'avatars');
