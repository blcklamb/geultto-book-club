alter table public.user_profiles
add column if not exists profile_decoration text not null default 'none';
