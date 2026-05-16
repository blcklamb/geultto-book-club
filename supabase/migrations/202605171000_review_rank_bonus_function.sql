create or replace function public.recompute_review_rank_bonus_points(
  p_schedule_id uuid,
  p_cohort integer default 5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  allowed boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1
    from public.users
    where id = current_user_id
      and role in ('member', 'admin')
      and is_deactivated = false
  )
  into allowed;

  if not allowed then
    raise exception 'Not allowed to recompute review rank bonus points';
  end if;

  if not exists (
    select 1
    from public.schedules
    where id = p_schedule_id
      and cohort = p_cohort
  ) then
    return;
  end if;

  delete from public.point_transactions
  where cohort = p_cohort
    and schedule_id = p_schedule_id
    and source_type in (
      'review_first_bonus',
      'review_second_bonus',
      'review_third_bonus'
    );

  insert into public.point_transactions (
    user_id,
    schedule_id,
    source_type,
    source_id,
    points,
    memo,
    cohort,
    idempotency_key
  )
  select
    ranked.author_id,
    p_schedule_id,
    case ranked.rank_no
      when 1 then 'review_first_bonus'
      when 2 then 'review_second_bonus'
      else 'review_third_bonus'
    end,
    ranked.id::text,
    case ranked.rank_no
      when 1 then 10
      when 2 then 6
      else 3
    end,
    '독후감 제출 ' || ranked.rank_no || '등 자동 보너스',
    p_cohort,
    'review_rank_bonus:' || p_schedule_id::text || ':' || ranked.rank_no || ':' || ranked.id::text
  from (
    select
      r.id,
      r.author_id,
      row_number() over (order by r.created_at asc, r.id asc) as rank_no
    from public.reviews r
    join public.users u on u.id = r.author_id
    where r.schedule_id = p_schedule_id
      and u.is_deactivated = false
  ) ranked
  where ranked.rank_no <= 3
  on conflict (idempotency_key) do nothing;
end;
$$;

revoke all on function public.recompute_review_rank_bonus_points(uuid, integer) from public;
grant execute on function public.recompute_review_rank_bonus_points(uuid, integer) to authenticated;
