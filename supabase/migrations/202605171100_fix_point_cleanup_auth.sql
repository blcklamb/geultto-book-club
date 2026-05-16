create or replace function public.delete_point_transactions_for_source(
  p_source_type text,
  p_source_ids text[],
  p_cohort integer default 5
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  is_admin boolean;
  allowed boolean := false;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select exists (
    select 1
    from public.users
    where id = current_user_id
      and role = 'admin'
      and is_deactivated = false
  )
  into is_admin;

  if is_admin then
    allowed := true;
  elsif p_source_type = 'quote_submission' then
    select (
      select count(*)
      from public.quotes
      where id::text = any(p_source_ids)
        and author_id = current_user_id
    ) = array_length(p_source_ids, 1)
    into allowed;
  elsif p_source_type = 'topic_submission' then
    select (
      select count(*)
      from public.topics
      where id::text = any(p_source_ids)
        and author_id = current_user_id
    ) = array_length(p_source_ids, 1)
    into allowed;
  elsif p_source_type in ('review_submission', 'late_review') then
    select (
      select count(*)
      from public.reviews
      where id::text = any(p_source_ids)
        and author_id = current_user_id
    ) = array_length(p_source_ids, 1)
    into allowed;
  elsif p_source_type = 'review_comment' then
    select (
      (
        select count(*)
        from public.review_comments rc
        join public.reviews r on r.id = rc.review_id
        where rc.id::text = any(p_source_ids)
          and r.author_id = current_user_id
      ) + (
        select count(*)
        from public.highlight_comments hc
        join public.review_highlights rh on rh.id = hc.highlight_id
        join public.reviews r on r.id = rh.review_id
        where hc.id::text = any(p_source_ids)
          and r.author_id = current_user_id
      )
    ) = array_length(p_source_ids, 1)
    into allowed;
  end if;

  if not allowed then
    raise exception 'Not allowed to delete point transactions for this source';
  end if;

  delete from public.point_transactions
  where cohort = p_cohort
    and source_type = p_source_type
    and source_id = any(p_source_ids);
end;
$$;

revoke all on function public.delete_point_transactions_for_source(text, text[], integer) from public;
grant execute on function public.delete_point_transactions_for_source(text, text[], integer) to authenticated;
