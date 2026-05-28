-- Review and topic comment reply tables + RLS policies.
-- Mirrors the policy shape of highlight_comment_replies.

-- Tables --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.review_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.topic_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.topic_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- RLS enable ----------------------------------------------------------------

ALTER TABLE public.review_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_replies ENABLE ROW LEVEL SECURITY;

-- Policies: review_comment_replies -----------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.review_comment_replies FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.review_comment_replies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.review_comment_replies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users based on author_id"
  ON public.review_comment_replies FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = author_id);

-- Policies: topic_comment_replies ------------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.topic_comment_replies FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.topic_comment_replies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.topic_comment_replies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users based on author_id"
  ON public.topic_comment_replies FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = author_id);

-- Ask PostgREST to reload its schema cache ---------------------------------

NOTIFY pgrst, 'reload schema';
