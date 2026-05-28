-- Per-user emoji reactions on review comments and topic comments.
-- Mirrors the shape of highlight_comment_reactions.

-- Tables --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.review_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.topic_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.topic_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (comment_id, user_id, emoji)
);

-- RLS enable ----------------------------------------------------------------

ALTER TABLE public.review_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_reactions ENABLE ROW LEVEL SECURITY;

-- Policies: review_comment_reactions ----------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.review_comment_reactions FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.review_comment_reactions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable delete for reaction owner"
  ON public.review_comment_reactions FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Policies: topic_comment_reactions -----------------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.topic_comment_reactions FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.topic_comment_reactions FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable delete for reaction owner"
  ON public.topic_comment_reactions FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Ask PostgREST to reload its schema cache ----------------------------------

NOTIFY pgrst, 'reload schema';
