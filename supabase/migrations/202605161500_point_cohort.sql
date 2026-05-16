alter table public.point_transactions
  add column if not exists cohort integer not null default 5;

create index if not exists point_transactions_cohort_user_created_idx
  on public.point_transactions(cohort, user_id, created_at desc);
