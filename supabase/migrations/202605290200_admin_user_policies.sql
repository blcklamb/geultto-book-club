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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can select all users'
  ) THEN
    CREATE POLICY "Admins can select all users"
      ON public.users FOR SELECT
      TO authenticated
      USING (public.current_user_is_active_admin());
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
      AND policyname = 'Admins can update users'
  ) THEN
    CREATE POLICY "Admins can update users"
      ON public.users FOR UPDATE
      TO authenticated
      USING (public.current_user_is_active_admin())
      WITH CHECK (true);
  END IF;
END;
$$;

INSERT INTO public.users (id, nickname, real_name)
SELECT
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'nickname',
    au.email,
    '회원'
  ),
  COALESCE(
    au.raw_user_meta_data->>'name',
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'nickname',
    au.email,
    '회원'
  )
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;

INSERT INTO public.user_profiles (user_id)
SELECT pu.id
FROM public.users pu
LEFT JOIN public.user_profiles up ON up.user_id = pu.id
WHERE up.user_id IS NULL;

NOTIFY pgrst, 'reload schema';
