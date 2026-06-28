create table if not exists public.summer_palette_boards (
  user_id uuid primary key references public.users(id) on delete cascade,
  board jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.summer_palette_boards enable row level security;

create policy "Users can read their own summer palette board"
on public.summer_palette_boards for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own summer palette board"
on public.summer_palette_boards for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own summer palette board"
on public.summer_palette_boards for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own summer palette board"
on public.summer_palette_boards for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.summer_palette_boards to authenticated;

notify pgrst, 'reload schema';
