create table if not exists public.summer_palette_boards (
  user_id uuid primary key references public.users(id) on delete cascade,
  board jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

do $$
begin
  if to_regclass('public.summer_bingo_boards') is not null then
    insert into public.summer_palette_boards (user_id, board, created_at, updated_at)
    select user_id, board, created_at, updated_at
    from public.summer_bingo_boards
    on conflict (user_id) do update
    set
      board = case
        when coalesce(excluded.updated_at, '-infinity'::timestamptz)
          >= coalesce(public.summer_palette_boards.updated_at, '-infinity'::timestamptz)
        then excluded.board
        else public.summer_palette_boards.board
      end,
      created_at = least(
        coalesce(public.summer_palette_boards.created_at, excluded.created_at),
        coalesce(excluded.created_at, public.summer_palette_boards.created_at)
      ),
      updated_at = greatest(
        coalesce(public.summer_palette_boards.updated_at, '-infinity'::timestamptz),
        coalesce(excluded.updated_at, '-infinity'::timestamptz)
      );

    drop table public.summer_bingo_boards;
  end if;
end $$;

alter table public.summer_palette_boards enable row level security;

drop policy if exists "Users can read their own summer palette board"
  on public.summer_palette_boards;
drop policy if exists "Users can insert their own summer palette board"
  on public.summer_palette_boards;
drop policy if exists "Users can update their own summer palette board"
  on public.summer_palette_boards;
drop policy if exists "Users can delete their own summer palette board"
  on public.summer_palette_boards;

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
