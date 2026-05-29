-- Per-user emoji reactions on review comment replies and topic comment replies.
-- Mirrors the shape of highlight_comment_reactions.

-- Tables --------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.review_comment_reply_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid REFERENCES public.review_comment_replies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (reply_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.topic_comment_reply_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid REFERENCES public.topic_comment_replies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (reply_id, user_id, emoji)
);

-- RLS enable ----------------------------------------------------------------

ALTER TABLE public.review_comment_reply_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_reply_reactions ENABLE ROW LEVEL SECURITY;

-- Policies: review_comment_reply_reactions ----------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.review_comment_reply_reactions FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.review_comment_reply_reactions FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable delete for reaction owner"
  ON public.review_comment_reply_reactions FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

-- Policies: topic_comment_reply_reactions -----------------------------------

CREATE POLICY "Enable read access for all users"
  ON public.topic_comment_reply_reactions FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
  ON public.topic_comment_reply_reactions FOR INSERT
  TO authenticated WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Enable delete for reaction owner"
  ON public.topic_comment_reply_reactions FOR DELETE
  TO authenticated USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.review_comment_reply_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_comment_reply_reactions TO authenticated;

GRANT SELECT ON public.topic_comment_reply_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.topic_comment_reply_reactions TO authenticated;

-- Ask PostgREST to reload its schema cache ----------------------------------

NOTIFY pgrst, 'reload schema';
