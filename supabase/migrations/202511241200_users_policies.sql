-- Allow signed-in users to manage their own profile row in public.users
create policy "Users can select their own profile"
on public.users for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.users for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.users for update
using (auth.uid() = id)
with check (auth.uid() = id);
