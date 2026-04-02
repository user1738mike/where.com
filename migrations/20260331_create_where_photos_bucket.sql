-- Create the where-photos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('where-photos', 'where-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their own photos
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'where-photos'
  AND (storage.foldername(name))[1] = 'profile-photos'
);

-- Allow authenticated users to update (upsert) their own photos
CREATE POLICY "Authenticated users can update their photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'where-photos'
  AND (storage.foldername(name))[1] = 'profile-photos'
);

-- Allow public read access to all photos
CREATE POLICY "Public read access to where-photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'where-photos');
