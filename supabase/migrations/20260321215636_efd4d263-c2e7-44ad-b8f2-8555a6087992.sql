CREATE POLICY "Allow public uploads to images bucket"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Allow public read from images bucket"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'images');