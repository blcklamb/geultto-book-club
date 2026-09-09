-- Apply after 202609070100_images_highlight_notifications.sql.
BEGIN;

CREATE TABLE public.highlight_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid NOT NULL REFERENCES public.review_highlights(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL CHECK (char_length(emoji) BETWEEN 1 AND 32),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (highlight_id, user_id, emoji)
);
ALTER TABLE public.highlight_reactions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.highlight_reactions TO anon, authenticated;
GRANT INSERT, DELETE ON public.highlight_reactions TO authenticated;
CREATE POLICY "Read highlight reactions" ON public.highlight_reactions FOR SELECT USING (true);
CREATE POLICY "Members add own highlight reactions" ON public.highlight_reactions FOR INSERT TO authenticated WITH CHECK (
  user_id = (SELECT auth.uid()) AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('member','admin') AND NOT is_deactivated)
);
CREATE POLICY "Remove own highlight reactions" ON public.highlight_reactions FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TABLE public.highlight_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  actor_nickname text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('highlight','comment','reply','highlight_reaction','comment_reaction')),
  review_id uuid REFERENCES public.reviews(id) ON DELETE SET NULL,
  highlight_id uuid REFERENCES public.review_highlights(id) ON DELETE SET NULL,
  comment_id uuid REFERENCES public.highlight_comments(id) ON DELETE SET NULL,
  reply_id uuid REFERENCES public.highlight_comment_replies(id) ON DELETE SET NULL,
  excerpt text NOT NULL DEFAULT '',
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (recipient_id, source_table, source_id)
);
CREATE INDEX highlight_notifications_recipient_created ON public.highlight_notifications(recipient_id, created_at DESC, id DESC);
CREATE INDEX highlight_notifications_unread ON public.highlight_notifications(recipient_id) WHERE read_at IS NULL;
ALTER TABLE public.highlight_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.highlight_notifications FROM anon, authenticated;
GRANT SELECT ON public.highlight_notifications TO authenticated;
CREATE POLICY "Read own highlight notifications" ON public.highlight_notifications FOR SELECT TO authenticated USING (recipient_id = (SELECT auth.uid()));

CREATE FUNCTION public.read_highlight_notifications(p_ids uuid[] DEFAULT NULL, p_before timestamptz DEFAULT now()) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.highlight_notifications SET read_at = now()
  WHERE recipient_id = auth.uid() AND read_at IS NULL
    AND ((p_ids IS NOT NULL AND id = ANY(p_ids)) OR (p_ids IS NULL AND created_at <= p_before));
$$;
REVOKE ALL ON FUNCTION public.read_highlight_notifications(uuid[], timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.read_highlight_notifications(uuid[], timestamptz) TO authenticated;

CREATE FUNCTION public.notify_highlight_activity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  target_user uuid;
  actor uuid;
  target_review uuid;
  target_highlight uuid;
  target_comment uuid;
  target_reply uuid;
  notification_kind text;
  preview text;
BEGIN
  IF TG_TABLE_NAME = 'review_highlights' THEN
    actor := NEW.author_id; target_highlight := NEW.id; target_review := NEW.review_id;
    SELECT author_id INTO target_user FROM public.reviews WHERE id = target_review;
    notification_kind := 'highlight'; preview := NEW.highlight_text;
  ELSIF TG_TABLE_NAME IN ('highlight_comments', 'highlight_reactions') THEN
    target_highlight := NEW.highlight_id;
    SELECT author_id, review_id INTO target_user, target_review FROM public.review_highlights WHERE id = target_highlight;
    IF TG_TABLE_NAME = 'highlight_comments' THEN
      actor := NEW.author_id; target_comment := NEW.id; notification_kind := 'comment'; preview := COALESCE(NULLIF(NEW.body, ''), '이미지');
    ELSE
      actor := NEW.user_id; notification_kind := 'highlight_reaction'; preview := NEW.emoji;
    END IF;
  ELSE
    target_comment := NEW.comment_id;
    SELECT c.author_id, c.highlight_id, h.review_id INTO target_user, target_highlight, target_review
      FROM public.highlight_comments c JOIN public.review_highlights h ON h.id = c.highlight_id WHERE c.id = target_comment;
    IF TG_TABLE_NAME = 'highlight_comment_replies' THEN
      actor := NEW.author_id; target_reply := NEW.id; notification_kind := 'reply'; preview := COALESCE(NULLIF(NEW.body, ''), '이미지');
    ELSE
      actor := NEW.user_id; notification_kind := 'comment_reaction'; preview := NEW.emoji;
    END IF;
  END IF;
  IF target_user IS NULL OR actor IS NULL OR target_user = actor THEN RETURN NEW; END IF;
  INSERT INTO public.highlight_notifications(recipient_id, actor_id, actor_nickname, kind, review_id, highlight_id, comment_id, reply_id, excerpt, source_table, source_id)
  SELECT target_user, actor, COALESCE(nickname, '익명'), notification_kind, target_review, target_highlight, target_comment, target_reply, left(preview, 160), TG_TABLE_NAME, NEW.id
    FROM public.users WHERE id = actor
  ON CONFLICT (recipient_id, source_table, source_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_highlight_activity() FROM PUBLIC;
CREATE TRIGGER notify_new_highlight AFTER INSERT ON public.review_highlights FOR EACH ROW EXECUTE FUNCTION public.notify_highlight_activity();
CREATE TRIGGER notify_highlight_comment AFTER INSERT ON public.highlight_comments FOR EACH ROW EXECUTE FUNCTION public.notify_highlight_activity();
CREATE TRIGGER notify_highlight_reply AFTER INSERT ON public.highlight_comment_replies FOR EACH ROW EXECUTE FUNCTION public.notify_highlight_activity();
CREATE TRIGGER notify_highlight_reaction AFTER INSERT ON public.highlight_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_highlight_activity();
CREATE TRIGGER notify_highlight_comment_reaction AFTER INSERT ON public.highlight_comment_reactions FOR EACH ROW EXECUTE FUNCTION public.notify_highlight_activity();

DO $$
DECLARE tab text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  FOREACH tab IN ARRAY ARRAY['review_highlights','highlight_comments','highlight_comment_replies','highlight_comment_reactions','highlight_reactions','highlight_notifications'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tab) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tab);
    END IF;
  END LOOP;
END $$;
NOTIFY pgrst, 'reload schema';
COMMIT;
