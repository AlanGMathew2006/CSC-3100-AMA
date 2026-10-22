alter table public.user_preferences
  add column if not exists nutrition_priorities text[] not null default '{}',
  add column if not exists budget_alerts_enabled boolean not null default true,
  add column if not exists theme text not null default 'light'
    check (theme in ('light', 'dark'));

create or replace function public.complete_onboarding_with_preferences(
  p_dining_dollars_balance numeric,
  p_daily_spending_target numeric,
  p_calories integer,
  p_protein_g integer,
  p_carbs_g integer,
  p_fat_g integer,
  p_nutrition_priorities text[],
  p_dietary_restrictions text[],
  p_preferred_location_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'An authenticated user is required';
  end if;

  perform public.complete_onboarding(
    p_dining_dollars_balance,
    p_daily_spending_target,
    p_calories,
    p_protein_g,
    p_carbs_g,
    p_fat_g
  );

  insert into public.user_preferences (
    user_id,
    nutrition_priorities,
    dietary_restrictions,
    preferred_location_ids
  )
  values (
    v_user_id,
    coalesce(p_nutrition_priorities, '{}'),
    coalesce(p_dietary_restrictions, '{}'),
    coalesce(p_preferred_location_ids, '{}')
  )
  on conflict (user_id) do update set
    nutrition_priorities = excluded.nutrition_priorities,
    dietary_restrictions = excluded.dietary_restrictions,
    preferred_location_ids = excluded.preferred_location_ids;
end;
$$;

revoke execute on function public.complete_onboarding_with_preferences(
  numeric, numeric, integer, integer, integer, integer, text[], text[], uuid[]
) from public, anon;
grant execute on function public.complete_onboarding_with_preferences(
  numeric, numeric, integer, integer, integer, integer, text[], text[], uuid[]
) to authenticated;
