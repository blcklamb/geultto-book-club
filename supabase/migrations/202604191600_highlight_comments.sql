-- Highlight comment tables + RLS policies.
-- Policy shape mirrors public.review_comments (verified from dashboard):
--   SELECT: public, true
--   INSERT: authenticated, true
--   UPDATE: authenticated, true / true
--   DELETE: authenticated, auth.uid() = owner column

-- Tables --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.highlight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid REFERENCES public.review_highlights(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.highlight_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.highlight_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.highlight_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.highlight_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (comment_id, user_id, emoji)
);

-- RLS enable ----------------------------------------------------------------

ALTER TABLE public.highlight_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies: highlight_comments ---------------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.highlight_comments FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.highlight_comments FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.highlight_comments FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users based on author_id"
  ON public.highlight_comments FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = author_id);

-- Policies: highlight_comment_replies --------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.highlight_comment_replies FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.highlight_comment_replies FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.highlight_comment_replies FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users based on author_id"
  ON public.highlight_comment_replies FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = author_id);

-- Policies: highlight_comment_reactions ------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.highlight_comment_reactions FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.highlight_comment_reactions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.highlight_comment_reactions FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for users based on user_id"
  ON public.highlight_comment_reactions FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Ask PostgREST to reload its schema cache ---------------------------------

NOTIFY pgrst, 'reload schema';
