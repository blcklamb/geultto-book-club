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
  TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users only"
  ON public.schedule_timetable_items FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users only"
  ON public.schedule_timetable_items FOR DELETE
  TO authenticated USING (true);

GRANT SELECT ON public.schedule_timetable_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.schedule_timetable_items TO authenticated;

NOTIFY pgrst, 'reload schema';
