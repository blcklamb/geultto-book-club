alter table public.users
  add column if not exists is_deactivated boolean not null default false;

alter table public.schedule_attendees
  add column if not exists requested_attending boolean,
  add column if not exists actual_attended boolean;

update public.schedule_attendees
set requested_attending = coalesce(requested_attending, is_attending)
where requested_attending is null;

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  schedule_id uuid references public.schedules(id) on delete set null,
  source_type text not null,
  source_id text,
  points integer not null,
  memo text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  idempotency_key text not null unique
);

create index if not exists point_transactions_user_created_idx
  on public.point_transactions(user_id, created_at desc);

create index if not exists point_transactions_schedule_source_idx
  on public.point_transactions(schedule_id, source_type);

alter table public.point_transactions enable row level security;

create policy "Users can read own point transactions"
  on public.point_transactions
  for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from public.users admin_user
      where admin_user.id = auth.uid()
        and admin_user.role = 'admin'
        and admin_user.is_deactivated = false
    )
  );

create policy "Authenticated users can insert point transactions"
  on public.point_transactions
  for insert
  with check (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.users target_user
      where target_user.id = user_id
        and target_user.is_deactivated = false
    )
  );

grant select, insert on public.point_transactions to authenticated;
