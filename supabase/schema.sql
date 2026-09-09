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

CREATE TABLE IF NOT EXISTS public.schedule_timetable_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
  position integer NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  detail text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now())
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

-- One spellcheck request is allowed for each review/user pair. A new review's
-- UUID is generated in the write form before the review row is submitted.
CREATE TABLE IF NOT EXISTS public.review_spellcheck_uses (
  review_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  used_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (review_id, user_id)
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

CREATE TABLE IF NOT EXISTS public.review_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.review_comments(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS public.review_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.review_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.review_comment_reply_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid REFERENCES public.review_comment_replies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (reply_id, user_id, emoji)
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

CREATE TABLE IF NOT EXISTS public.topic_comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.topic_comments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (comment_id, user_id, emoji)
);

CREATE TABLE IF NOT EXISTS public.topic_comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid REFERENCES public.topic_comments(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.topic_comment_reply_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid REFERENCES public.topic_comment_replies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT timezone('utc', now()),
  UNIQUE (reply_id, user_id, emoji)
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

CREATE TABLE IF NOT EXISTS public.summer_palette_boards (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  board jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

-- Row Level Security policies (conceptual)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_timetable_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_spellcheck_uses ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.review_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_comment_reply_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topic_comment_reply_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summer_palette_boards ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY "users can record their own review spellcheck use"
  ON public.review_spellcheck_uses FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "users can remove their own failed review spellcheck use"
  ON public.review_spellcheck_uses FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can read their own summer palette board"
  ON public.summer_palette_boards FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own summer palette board"
  ON public.summer_palette_boards FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  );

CREATE POLICY "Users can update their own summer palette board"
  ON public.summer_palette_boards FOR UPDATE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND EXISTS (
      SELECT 1
      FROM public.users
      WHERE id = (SELECT auth.uid())
        AND role <> 'pending'
        AND is_deactivated = false
    )
  );

CREATE POLICY "Users can delete their own summer palette board"
  ON public.summer_palette_boards FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE OR REPLACE FUNCTION public.list_summer_palette_boards()
RETURNS TABLE (
  user_id uuid,
  nickname text,
  profile_image_url text,
  profile_decoration text,
  board jsonb,
  filled_count integer,
  is_full_clear boolean,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  is_allowed boolean := false;
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
  INTO is_allowed;

  IF NOT is_allowed THEN
    RAISE EXCEPTION 'Only approved members can list summer palettes';
  END IF;

  RETURN QUERY
  WITH board_stats AS (
    SELECT
      b.user_id AS board_user_id,
      u.nickname,
      up.profile_image_url,
      COALESCE(up.profile_decoration, 'none') AS profile_decoration,
      b.board,
      b.updated_at,
      COALESCE((
        SELECT count(*)::integer
        FROM jsonb_array_elements(COALESCE(b.board->'cells', '[]'::jsonb)) AS cell(value)
        WHERE cell.value->'photo'->>'dataUrl' IS NOT NULL
      ), 0) AS filled_count
    FROM public.summer_palette_boards b
    JOIN public.users u ON u.id = b.user_id
    LEFT JOIN public.user_profiles up ON up.user_id = b.user_id
    WHERE b.user_id <> current_user_id
      AND u.role <> 'pending'
      AND u.is_deactivated = false
  )
  SELECT
    board_stats.board_user_id,
    board_stats.nickname,
    board_stats.profile_image_url,
    board_stats.profile_decoration,
    CASE
      WHEN board_stats.filled_count >= 9 THEN board_stats.board
      ELSE jsonb_set(
        board_stats.board,
        '{cells}',
        COALESCE((
          SELECT jsonb_agg(cell.value - 'photo' ORDER BY cell.ordinality)
          FROM jsonb_array_elements(COALESCE(board_stats.board->'cells', '[]'::jsonb))
            WITH ORDINALITY AS cell(value, ordinality)
        ), '[]'::jsonb),
        true
      )
    END AS board,
    board_stats.filled_count,
    board_stats.filled_count >= 9 AS is_full_clear,
    board_stats.updated_at
  FROM board_stats
  ORDER BY board_stats.updated_at DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.list_summer_palette_boards() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_summer_palette_boards() TO authenticated;

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

GRANT INSERT, DELETE ON public.review_spellcheck_uses TO authenticated;

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

-- Content attachments and saved highlight notifications (2026-09-07).
-- Additive migration: deploy before the application using these columns.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('content-images', 'content-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;
CREATE POLICY "Read content images" ON storage.objects FOR SELECT USING (bucket_id = 'content-images');
CREATE POLICY "Members upload their content images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'content-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.users WHERE id = (SELECT auth.uid()) AND role IN ('member','admin') AND NOT is_deactivated)
);

ALTER TABLE public.review_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.review_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.topic_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.topic_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.highlight_comments ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.highlight_comment_replies ADD COLUMN image_paths text[] NOT NULL DEFAULT '{}';

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

-- Only this RPC can update read_at; recipients cannot rewrite notification data.
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

-- Attachment safeguards (2026-09-07).
BEGIN;
ALTER TABLE public.review_comments
  ADD CONSTRAINT review_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.review_comment_replies
  ADD CONSTRAINT review_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.topic_comments
  ADD CONSTRAINT topic_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.topic_comment_replies
  ADD CONSTRAINT topic_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.highlight_comments
  ADD CONSTRAINT highlight_comments_image_paths_limit CHECK (cardinality(image_paths) <= 1);
ALTER TABLE public.highlight_comment_replies
  ADD CONSTRAINT highlight_comment_replies_image_paths_limit CHECK (cardinality(image_paths) <= 1);
CREATE POLICY "Members remove own content images" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'content-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = (SELECT auth.uid())
      AND role IN ('member', 'admin')
      AND NOT is_deactivated
  )
);
GRANT DELETE ON storage.objects TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;

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
