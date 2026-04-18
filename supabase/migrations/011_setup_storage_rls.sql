-- Create storage RLS policies for work-submissions bucket
-- Policy: Allow authenticated users to upload to work-submissions bucket
CREATE POLICY "Allow authenticated users to upload to work-submissions"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'work-submissions' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Allow authenticated users to read from work-submissions bucket
CREATE POLICY "Allow authenticated users to read work-submissions"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'work-submissions' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Allow authenticated users to delete their own uploads
CREATE POLICY "Allow authenticated users to delete from work-submissions"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'work-submissions' 
    AND auth.role() = 'authenticated'
  );

-- Policy: Allow anon users to read (for public image URLs)
CREATE POLICY "Allow anon users to read work-submissions"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'work-submissions'
  );
