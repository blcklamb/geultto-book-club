-- Grant base table privileges to the Supabase client roles.
-- Without these, RLS is never consulted and clients see
-- "permission denied for table <name>" from Postgres itself.

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.highlight_comments
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.highlight_comment_replies
  TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.highlight_comment_reactions
  TO authenticated;

-- Anonymous reads mirror the public SELECT policy.
GRANT SELECT ON public.highlight_comments TO anon;
GRANT SELECT ON public.highlight_comment_replies TO anon;
GRANT SELECT ON public.highlight_comment_reactions TO anon;

NOTIFY pgrst, 'reload schema';
