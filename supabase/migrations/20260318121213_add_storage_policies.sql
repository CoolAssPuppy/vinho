-- Storage policies for scans and avatars buckets.
-- Users can only write to their own path (uid/filename). Everyone can read.

-- Scans bucket
CREATE POLICY "Users can upload their own scans"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'scans'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own scans"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'scans'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own scans"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'scans'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view all scans"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'scans');

-- Avatars bucket
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (auth.uid())::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "Users can view all avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
