BEGIN;

-- A user keeps one server-issued ID for an unsaved review. Refreshing the form
-- therefore cannot mint unlimited IDs and bypass the one-use constraint.
CREATE TABLE public.review_spellcheck_drafts (
  review_id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);
ALTER TABLE public.review_spellcheck_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.review_spellcheck_drafts FROM anon, authenticated;
GRANT ALL ON public.review_spellcheck_drafts TO service_role;

CREATE FUNCTION public.remove_submitted_review_spellcheck_draft()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM public.review_spellcheck_drafts
  WHERE review_id = NEW.id AND user_id = NEW.author_id;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.remove_submitted_review_spellcheck_draft() FROM PUBLIC;

CREATE TRIGGER remove_submitted_review_spellcheck_draft
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.remove_submitted_review_spellcheck_draft();

-- Usage rows are an internal reservation. Browser clients must not be able to
-- remove a successful use, while the server can always release failed calls.
DROP POLICY IF EXISTS "users can record their own review spellcheck use"
  ON public.review_spellcheck_uses;
DROP POLICY IF EXISTS "users can remove their own failed review spellcheck use"
  ON public.review_spellcheck_uses;
REVOKE ALL ON public.review_spellcheck_uses FROM anon, authenticated;
GRANT ALL ON public.review_spellcheck_uses TO service_role;

COMMIT;
