BEGIN;
CREATE TABLE public.content_image_drafts (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  path text,
  mime_type text,
  byte_size bigint,
  state text NOT NULL DEFAULT 'uploading' CHECK (state IN ('uploading','validating','ready','cancelled')),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours'
);
CREATE INDEX content_image_drafts_expiry ON public.content_image_drafts(expires_at);
ALTER TABLE public.content_image_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.content_image_drafts FROM anon, authenticated;
GRANT ALL ON public.content_image_drafts TO service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('content-image-drafts','content-image-drafts',false,5242880,ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public = false;
DROP POLICY IF EXISTS "Members upload their content images" ON storage.objects;
DROP POLICY IF EXISTS "Members remove own content images" ON storage.objects;
-- Restrictive policies also block broader pre-existing permissive policies.
CREATE POLICY "Only server inserts content images" ON storage.objects AS RESTRICTIVE FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id NOT IN ('content-images','content-image-drafts'));
CREATE POLICY "Only server updates content images" ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon, authenticated
  USING (bucket_id NOT IN ('content-images','content-image-drafts'))
  WITH CHECK (bucket_id NOT IN ('content-images','content-image-drafts'));
CREATE POLICY "Only server deletes content images" ON storage.objects AS RESTRICTIVE FOR DELETE TO anon, authenticated
  USING (bucket_id NOT IN ('content-images','content-image-drafts'));
CREATE POLICY "Draft images stay private" ON storage.objects AS RESTRICTIVE FOR SELECT TO anon, authenticated
  USING (bucket_id <> 'content-image-drafts');

-- Replace permissive writes on every notification source, including UPDATE
-- (otherwise an attacker could first change another row's actor).
DO $$
DECLARE tab text; actor text; pol record; condition text;
BEGIN
  FOREACH tab IN ARRAY ARRAY['review_highlights','highlight_comments','highlight_comment_replies','highlight_comment_reactions','highlight_reactions'] LOOP
    actor := CASE WHEN tab IN ('highlight_comment_reactions','highlight_reactions') THEN 'user_id' ELSE 'author_id' END;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=tab AND cmd IN ('ALL','INSERT','UPDATE','DELETE') LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol.policyname, tab);
    END LOOP;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tab);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tab);
    EXECUTE format('CREATE POLICY "Read notification sources" ON public.%I FOR SELECT USING (true)', tab);
    condition := format('%I = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN (''member'',''admin'') AND NOT is_deactivated)', actor);
    EXECUTE format('CREATE POLICY "Active members insert own activity" ON public.%I FOR INSERT TO authenticated WITH CHECK (%s)', tab, condition);
    EXECUTE format('CREATE POLICY "Active members update own activity" ON public.%I FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)', tab, condition, condition);
    EXECUTE format('CREATE POLICY "Active members delete own activity" ON public.%I FOR DELETE TO authenticated USING (%s)', tab, condition);
  END LOOP;
END $$;
-- Only the cleanup service can inspect references across all content.
CREATE FUNCTION public.content_image_is_referenced(p_path text) RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.reviews WHERE strpos(content_rich::text, p_path) > 0)
    OR EXISTS (SELECT 1 FROM public.topics WHERE strpos(body_rich::text, p_path) > 0)
    OR EXISTS (SELECT 1 FROM public.review_comments WHERE p_path = ANY(image_paths))
    OR EXISTS (SELECT 1 FROM public.review_comment_replies WHERE p_path = ANY(image_paths))
    OR EXISTS (SELECT 1 FROM public.topic_comments WHERE p_path = ANY(image_paths))
    OR EXISTS (SELECT 1 FROM public.topic_comment_replies WHERE p_path = ANY(image_paths))
    OR EXISTS (SELECT 1 FROM public.highlight_comments WHERE p_path = ANY(image_paths))
    OR EXISTS (SELECT 1 FROM public.highlight_comment_replies WHERE p_path = ANY(image_paths));
$$;
REVOKE ALL ON FUNCTION public.content_image_is_referenced(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.content_image_is_referenced(text) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
