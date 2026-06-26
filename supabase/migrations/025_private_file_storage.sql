-- Harden property file storage: private bucket + signed-URL access.
-- Files are now referenced by storage path (not a public URL) and served
-- through /api/files/[id], which re-checks auth + RLS on every open and
-- issues a short-lived signed URL.

-- Private bucket (not publicly readable). Service role handles upload/sign.
INSERT INTO storage.buckets (id, name, public)
VALUES ('property-files', 'property-files', false)
ON CONFLICT (id) DO NOTHING;

-- Track where the object actually lives; file_url is now optional (legacy).
ALTER TABLE property_files ALTER COLUMN file_url DROP NOT NULL;
ALTER TABLE property_files ADD COLUMN IF NOT EXISTS storage_bucket TEXT;
ALTER TABLE property_files ADD COLUMN IF NOT EXISTS storage_path TEXT;
