create or replace function public.list_summer_palette_boards()
returns table (
  user_id uuid,
  nickname text,
  profile_image_url text,
  profile_decoration text,
  board jsonb,
  filled_count integer,
  is_full_clear boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_allowed boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1
    from public.users
    where id = current_user_id
      and role <> 'pending'
      and is_deactivated = false
  )
  into is_allowed;

  if not is_allowed then
    raise exception 'Only approved members can list summer palettes';
  end if;

  return query
  with board_stats as (
    select
      b.user_id as board_user_id,
      u.nickname,
      up.profile_image_url,
      coalesce(up.profile_decoration, 'none') as profile_decoration,
      b.board,
      b.updated_at,
      coalesce((
        select count(*)::integer
        from jsonb_array_elements(coalesce(b.board->'cells', '[]'::jsonb)) as cell(value)
        where cell.value->'photo'->>'dataUrl' is not null
      ), 0) as filled_count
    from public.summer_palette_boards b
    join public.users u on u.id = b.user_id
    left join public.user_profiles up on up.user_id = b.user_id
    where b.user_id <> current_user_id
      and u.role <> 'pending'
      and u.is_deactivated = false
  )
  select
    board_stats.board_user_id,
    board_stats.nickname,
    board_stats.profile_image_url,
    board_stats.profile_decoration,
    case
      when board_stats.filled_count >= 9 then board_stats.board
      else jsonb_set(
        board_stats.board,
        '{cells}',
        coalesce((
          select jsonb_agg(cell.value - 'photo' order by cell.ordinality)
          from jsonb_array_elements(coalesce(board_stats.board->'cells', '[]'::jsonb))
            with ordinality as cell(value, ordinality)
        ), '[]'::jsonb),
        true
      )
    end as board,
    board_stats.filled_count,
    board_stats.filled_count >= 9 as is_full_clear,
    board_stats.updated_at
  from board_stats
  order by board_stats.updated_at desc nulls last;
end;
$$;

revoke all on function public.list_summer_palette_boards() from public;
grant execute on function public.list_summer_palette_boards() to authenticated;

notify pgrst, 'reload schema';
