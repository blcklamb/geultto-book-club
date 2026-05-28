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

NOTIFY pgrst, 'reload schema';
