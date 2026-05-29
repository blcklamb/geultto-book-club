-- Supabase schema draft for Geultto Book Club MVP
-- Enum for user roles
CREATE TYPE user_role AS ENUM ('pending', 'member', 'admin');

-- Users table mirrors Supabase auth.users with additional profile fields.
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text NOT NULL,
  real_name text NOT NULL,
  favorite_genres text[] DEFAULT '{}',
  recommended_book text,
  profile_emoji text DEFAULT '📚',
  profile_bg_color text DEFAULT '#F1F5F9',
  role user_role NOT NULL DEFAULT 'pending',
  is_deactivated boolean NOT NULL DEFAULT false,
  expires_at timestamptz,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  profile_image_url text,
  profile_decoration text NOT NULL DEFAULT 'none',
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date timestamptz NOT NULL,
  place text NOT NULL,
  book_title text NOT NULL,
  book_link text,
  genre_tag text,
  cohort integer,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.schedule_attendees (
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  is_attending boolean DEFAULT false,
  requested_attending boolean,
  actual_attended boolean,
  fee_paid boolean DEFAULT false,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  PRIMARY KEY(schedule_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_rich text NOT NULL,
  content_markdown text,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.review_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.review_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  highlight_text text NOT NULL,
  start_pos integer,
  end_pos integer,
  reaction text[] DEFAULT '{}',
  comment text,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Comments on a highlight (threaded, notion-style)
CREATE TABLE IF NOT EXISTS public.highlight_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  highlight_id uuid REFERENCES public.review_highlights(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Replies to a highlight comment (1-level deep)
CREATE TABLE IF NOT EXISTS public.highlight_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.highlight_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

-- Per-user emoji reactions on highlight comments
CREATE TABLE IF NOT EXISTS public.highlight_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.highlight_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  page_number text,
  text text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.quote_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (quote_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.review_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (review_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body_rich jsonb NOT NULL,
  body_markdown text,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.topic_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid REFERENCES public.topics(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.schedules(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  source_id text,
  points integer NOT NULL,
  memo text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  cohort integer NOT NULL DEFAULT 5,
  idempotency_key text NOT NULL UNIQUE
);

-- Row Level Security policies (conceptual)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlight_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select their own profile"
  ON public.users FOR SELECT
  USING ((SELECT auth.uid()) = id);
CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = id);
CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

CREATE OR REPLACE FUNCTION public.current_user_is_active_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND is_deactivated = false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_is_active_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_is_active_admin() TO authenticated;

CREATE POLICY "Admins can select all users"
  ON public.users FOR SELECT
  TO authenticated
  USING (public.current_user_is_active_admin());
CREATE POLICY "Admins can update users"
  ON public.users FOR UPDATE
  TO authenticated
  USING (public.current_user_is_active_admin())
  WITH CHECK (true);

CREATE POLICY "anyone can read schedule timetable items"
  ON public.schedule_timetable_items FOR SELECT
  TO public USING (true);
CREATE POLICY "authenticated users can insert schedule timetable items"
  ON public.schedule_timetable_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  );
CREATE POLICY "authenticated users can update schedule timetable items"
  ON public.schedule_timetable_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  );
CREATE POLICY "authenticated users can delete schedule timetable items"
  ON public.schedule_timetable_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  );

CREATE POLICY "members can insert review comment replies"
  ON public.review_comment_replies FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);
CREATE POLICY "anyone can read review comment replies"
  ON public.review_comment_replies FOR SELECT USING (true);
CREATE POLICY "members can update their review comment replies"
  ON public.review_comment_replies FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);
CREATE POLICY "members can delete their review comment replies"
  ON public.review_comment_replies FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "members can insert topic comment replies"
  ON public.topic_comment_replies FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = author_id);
CREATE POLICY "anyone can read topic comment replies"
  ON public.topic_comment_replies FOR SELECT USING (true);
CREATE POLICY "members can update their topic comment replies"
  ON public.topic_comment_replies FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = author_id)
  WITH CHECK ((SELECT auth.uid()) = author_id);
CREATE POLICY "members can delete their topic comment replies"
  ON public.topic_comment_replies FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = author_id);

CREATE POLICY "anyone can read review comment reactions"
  ON public.review_comment_reactions FOR SELECT TO public USING (true);
CREATE POLICY "members can insert their review comment reactions"
  ON public.review_comment_reactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members can delete their review comment reactions"
  ON public.review_comment_reactions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "anyone can read topic comment reactions"
  ON public.topic_comment_reactions FOR SELECT TO public USING (true);
CREATE POLICY "members can insert their topic comment reactions"
  ON public.topic_comment_reactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members can delete their topic comment reactions"
  ON public.topic_comment_reactions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "anyone can read review comment reply reactions"
  ON public.review_comment_reply_reactions FOR SELECT TO public USING (true);
CREATE POLICY "members can insert their review comment reply reactions"
  ON public.review_comment_reply_reactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members can delete their review comment reply reactions"
  ON public.review_comment_reply_reactions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "anyone can read topic comment reply reactions"
  ON public.topic_comment_reply_reactions FOR SELECT TO public USING (true);
CREATE POLICY "members can insert their topic comment reply reactions"
  ON public.topic_comment_reply_reactions FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "members can delete their topic comment reply reactions"
  ON public.topic_comment_reply_reactions FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.schedule_timetable_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_timetable_items TO authenticated;

GRANT SELECT ON public.review_comment_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_comment_replies TO authenticated;
GRANT SELECT ON public.topic_comment_replies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.topic_comment_replies TO authenticated;

GRANT SELECT ON public.review_comment_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_comment_reactions TO authenticated;
GRANT SELECT ON public.topic_comment_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.topic_comment_reactions TO authenticated;
GRANT SELECT ON public.review_comment_reply_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_comment_reply_reactions TO authenticated;
GRANT SELECT ON public.topic_comment_reply_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.topic_comment_reply_reactions TO authenticated;

CREATE OR REPLACE FUNCTION public.replace_schedule_timetable_items(
  p_schedule_id uuid,
  p_items jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  can_edit boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = current_user_id
      AND role <> 'pending'
      AND is_deactivated = false
  )
  INTO can_edit;

  IF NOT can_edit THEN
    RAISE EXCEPTION 'Only approved members can edit timetable items';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.schedules WHERE id = p_schedule_id) THEN
    RAISE EXCEPTION 'Schedule not found';
  END IF;

  DELETE FROM public.schedule_timetable_items
  WHERE schedule_id = p_schedule_id;

  INSERT INTO public.schedule_timetable_items (
    schedule_id,
    position,
    start_time,
    end_time,
    detail
  )
  SELECT
    p_schedule_id,
    (row_number() OVER () - 1)::integer,
    item.start_time::time,
    item.end_time::time,
    btrim(item.detail)
  FROM jsonb_to_recordset(COALESCE(p_items, '[]'::jsonb)) AS item(
    start_time text,
    end_time text,
    detail text
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.replace_schedule_timetable_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_schedule_timetable_items(uuid, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_point_transactions_for_source(
  p_source_type text,
  p_source_ids text[],
  p_cohort integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_admin boolean;
  allowed boolean := false;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = current_user_id
      AND role = 'admin'
      AND is_deactivated = false
  )
  INTO is_admin;

  IF is_admin THEN
    allowed := true;
  ELSIF p_source_type = 'quote_submission' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.quotes
      WHERE id::text = ANY(p_source_ids)
        AND author_id = current_user_id
    )
    INTO allowed;
  ELSIF p_source_type = 'topic_submission' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.topics
      WHERE id::text = ANY(p_source_ids)
        AND author_id = current_user_id
    )
    INTO allowed;
  ELSIF p_source_type IN ('review_submission', 'late_review') THEN
    SELECT EXISTS (
      SELECT 1 FROM public.reviews
      WHERE id::text = ANY(p_source_ids)
        AND author_id = current_user_id
    )
    INTO allowed;
  ELSIF p_source_type = 'review_comment' THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.review_comments rc
      JOIN public.reviews r ON r.id = rc.review_id
      WHERE rc.id::text = ANY(p_source_ids)
        AND r.author_id = current_user_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.highlight_comments hc
      JOIN public.review_highlights rh ON rh.id = hc.highlight_id
      JOIN public.reviews r ON r.id = rh.review_id
      WHERE hc.id::text = ANY(p_source_ids)
        AND r.author_id = current_user_id
    )
    INTO allowed;
  END IF;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Not allowed to delete point transactions for this source';
  END IF;

  DELETE FROM public.point_transactions
  WHERE cohort = p_cohort
    AND source_type = p_source_type
    AND source_id = ANY(p_source_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.recompute_review_rank_bonus_points(
  p_schedule_id uuid,
  p_cohort integer DEFAULT 5
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  allowed boolean;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = current_user_id
      AND role IN ('member', 'admin')
      AND is_deactivated = false
  )
  INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'Not allowed to recompute review rank bonus points';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.schedules
    WHERE id = p_schedule_id
      AND cohort = p_cohort
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.point_transactions
  WHERE cohort = p_cohort
    AND schedule_id = p_schedule_id
    AND source_type IN (
      'review_first_bonus',
      'review_second_bonus',
      'review_third_bonus'
    );

  INSERT INTO public.point_transactions (
    user_id,
    schedule_id,
    source_type,
    source_id,
    points,
    memo,
    cohort,
    idempotency_key
  )
  SELECT
    ranked.author_id,
    p_schedule_id,
    CASE ranked.rank_no
      WHEN 1 THEN 'review_first_bonus'
      WHEN 2 THEN 'review_second_bonus'
      ELSE 'review_third_bonus'
    END,
    ranked.id::text,
    CASE ranked.rank_no
      WHEN 1 THEN 10
      WHEN 2 THEN 6
      ELSE 3
    END,
    '독후감 제출 ' || ranked.rank_no || '등 자동 보너스',
    p_cohort,
    'review_rank_bonus:' || p_schedule_id::text || ':' || ranked.rank_no || ':' || ranked.id::text
  FROM (
    SELECT
      r.id,
      r.author_id,
      row_number() OVER (ORDER BY r.created_at ASC, r.id ASC) AS rank_no
    FROM public.reviews r
    JOIN public.users u ON u.id = r.author_id
    WHERE r.schedule_id = p_schedule_id
      AND u.is_deactivated = false
  ) ranked
  WHERE ranked.rank_no <= 3
  ON CONFLICT (idempotency_key) DO NOTHING;
END;
$$;

-- Example RLS policies (pseudo configuration; adjust in Supabase dashboard):
--   * users: users can select/update their own row. Admins can select all and update role.
--   * schedules: everyone can select. Only admins can insert/update/delete.
--   * schedule_attendees: members can select their own attendance row; admins can manage all rows.
--   * reviews/quotes/topics: authors can update/delete their own content; everyone signed-in can select; pending role blocked from inserts.
--   * fee_paid column should only be updateable by admins via separate policy.

-- Functions and triggers for updated_at tracking (optional for MVP) can be added later.
