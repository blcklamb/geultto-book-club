create table if not exists public.user_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  profile_image_url text,
  created_at timestamptz default timezone('utc', now()),
  updated_at timestamptz default timezone('utc', now())
);

alter table public.user_profiles enable row level security;

create policy "User profiles are readable"
on public.user_profiles for select
using (true);

create policy "Users can insert their own avatar profile"
on public.user_profiles for insert
with check ((select auth.uid()) = user_id);

create policy "Users can update their own avatar profile"
on public.user_profiles for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Profile images are readable"
on storage.objects for select
using (bucket_id = 'profile-images');

create policy "Users can upload their own profile images"
on storage.objects for insert
with check (
  bucket_id = 'profile-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can update their own profile images"
on storage.objects for update
using (
  bucket_id = 'profile-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);

create policy "Users can delete their own profile images"
on storage.objects for delete
using (
  bucket_id = 'profile-images'
  and (select auth.uid())::text = (storage.foldername(name))[1]
);
