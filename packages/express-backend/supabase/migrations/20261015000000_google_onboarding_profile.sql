-- New Google users complete onboarding before their profile is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    return new;
  end if;

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

create or replace function public.complete_onboarding(
  p_dining_dollars_balance numeric,
  p_daily_spending_target numeric,
  p_calories integer,
  p_protein_g integer,
  p_carbs_g integer,
  p_fat_g integer
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text;
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;

  if p_dining_dollars_balance is null
    or p_daily_spending_target is null
    or p_calories is null
    or p_protein_g is null
    or p_carbs_g is null
    or p_fat_g is null
    or p_dining_dollars_balance < 0
    or p_daily_spending_target < 0
    or p_calories < 0
    or p_protein_g < 0
    or p_carbs_g < 0
    or p_fat_g < 0 then
    raise exception 'All onboarding values must be non-negative numbers';
  end if;

  select left(
    nullif(
      btrim(coalesce(
        u.raw_user_meta_data ->> 'display_name',
        u.raw_user_meta_data ->> 'full_name',
        u.raw_user_meta_data ->> 'name'
      )),
      ''
    ),
    80
  )
  into v_display_name
  from auth.users u
  where u.id = v_user_id;

  if not found then
    raise exception 'Authenticated user was not found';
  end if;

  insert into public.profiles (
    id,
    display_name,
    dining_dollars_balance,
    daily_spending_target,
    onboarding_completed
  )
  values (
    v_user_id,
    v_display_name,
    p_dining_dollars_balance,
    p_daily_spending_target,
    true
  )
  on conflict (id) do update set
    display_name = coalesce(public.profiles.display_name, excluded.display_name),
    dining_dollars_balance = excluded.dining_dollars_balance,
    daily_spending_target = excluded.daily_spending_target,
    onboarding_completed = true;

  insert into public.user_goals (
    user_id,
    calories,
    protein_g,
    carbs_g,
    fat_g
  )
  values (
    v_user_id,
    p_calories,
    p_protein_g,
    p_carbs_g,
    p_fat_g
  )
  on conflict (user_id) do update set
    calories = excluded.calories,
    protein_g = excluded.protein_g,
    carbs_g = excluded.carbs_g,
    fat_g = excluded.fat_g;
end;
$$;

revoke execute on function public.complete_onboarding(numeric, numeric, integer, integer, integer, integer)
  from public, anon;
grant execute on function public.complete_onboarding(numeric, numeric, integer, integer, integer, integer)
  to authenticated;
