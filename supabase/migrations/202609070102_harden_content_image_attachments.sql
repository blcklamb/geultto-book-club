-- Enforce attachment limits even for requests that bypass the application.
BEGIN;

ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.review_comment_replies
  ADD CONSTRAINT review_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.topic_comments
  ADD CONSTRAINT topic_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.topic_comment_replies
  ADD CONSTRAINT topic_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.highlight_comments
  ADD CONSTRAINT highlight_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.highlight_comment_replies
  ADD CONSTRAINT highlight_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);

CREATE POLICY "Members remove own content images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role IN ('member', 'admin')
      AND NOT is_deactivated
  )
);
GRANT DELETE ON storage.objects TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
