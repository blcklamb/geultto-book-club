-- 브라우저는 publishable 키로 PostgREST에 직접 접근할 수 있으므로, RLS가
-- 본인 행 여부만 확인하면 pending/비활성 회원이 /api/summer-palette/board 의
-- 승인 검사와 사진 용량 검증을 우회해 직접 보드를 저장할 수 있다.
-- 다른 승인 회원 전용 테이블과 동일하게 INSERT/UPDATE 정책에 승인 회원 조건을 추가한다.

drop policy if exists "Users can insert their own summer palette board"
  on public.summer_palette_boards;
drop policy if exists "Users can update their own summer palette board"
  on public.summer_palette_boards;

create policy "Users can insert their own summer palette board"
on public.summer_palette_boards for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role <> 'pending'
      and is_deactivated = false
  )
);

create policy "Users can update their own summer palette board"
on public.summer_palette_boards for update
to authenticated
using (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role <> 'pending'
      and is_deactivated = false
  )
)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role <> 'pending'
      and is_deactivated = false
  )
);

notify pgrst, 'reload schema';
