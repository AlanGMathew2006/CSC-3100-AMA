-- Auth profiles hardening. Safe to re-run. Review, then run in the Supabase SQL editor
-- (or `supabase db push`). This file is generated only; it has NOT been applied.

-- Profile row for every new auth user. Stores no credentials; passwords live only in auth.users.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(
      nullif(
        btrim(
          coalesce(
            new.raw_user_meta_data ->> 'display_name',
            new.raw_user_meta_data ->> 'full_name',
            new.raw_user_meta_data ->> 'name'
          )
        ),
        ''
      ),
      80
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Only the trigger should run this; it must not be callable through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill accounts created before the trigger existed.
insert into public.profiles (id)
select u.id
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id)
on conflict (id) do nothing;

-- Row Level Security: each signed-in user can read and update only their own row.
alter table public.profiles enable row level security;

revoke all on public.profiles from anon;
grant select, update on public.profiles to authenticated;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- No insert/delete policies: rows are created by the trigger and removed by
-- ON DELETE CASCADE when the auth user is deleted.
