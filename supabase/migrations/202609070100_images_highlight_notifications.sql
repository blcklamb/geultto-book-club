-- Additive migration: deploy before the application using these columns.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-images', 'content-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY "Read content images" ON storage.objects FOR SELECT USING (bucket_id = 'content-images');
CREATE POLICY "Members upload their content images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'content-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('member','admin') AND NOT is_deactivated)
);

ALTER TABLE public.review_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.review_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.topic_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.topic_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.highlight_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.highlight_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
COMMIT;
