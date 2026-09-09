-- One successful spellcheck request per review and author. New reviews receive
-- their UUID before submission, so the same key is carried into reviews.id.
CREATE TABLE IF NOT EXISTS public.review_spellcheck_uses (
  review_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (review_id, user_id)
);

ALTER TABLE public.review_spellcheck_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can record their own review spellcheck use"
  ON public.review_spellcheck_uses
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can remove their own failed review spellcheck use"
  ON public.review_spellcheck_uses
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

GRANT INSERT, DELETE ON public.review_spellcheck_uses TO authenticated;
