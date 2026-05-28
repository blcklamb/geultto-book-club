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

CREATE INDEX IF NOT EXISTS schedule_timetable_items_schedule_position_idx
  ON public.schedule_timetable_items(schedule_id, position);

ALTER TABLE public.schedule_timetable_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users"
  ON public.schedule_timetable_items FOR SELECT
  TO public USING (true);

CREATE POLICY "Enable insert for authenticated users only"
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

CREATE POLICY "Enable update for authenticated users only"
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

CREATE POLICY "Enable delete for authenticated users only"
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

GRANT SELECT ON public.schedule_timetable_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_timetable_items TO authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_schedule_timetable_items(uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.replace_schedule_timetable_items(uuid, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
