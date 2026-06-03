-- SBS-32: Notifie tous les membres du groupe (sauf le déclencheur) quand un film
-- est archivé (visible=false). Appelé depuis recalculate_group_film_visibility.

create or replace function public.notify_film_archived(p_group_film_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_triggering_user uuid := auth.uid();
  v_group_id uuid;
begin
  select group_id into v_group_id
  from public.group_films
  where id = p_group_film_id;

  if v_group_id is null then return; end if;

  insert into public.notifications(user_id, type, group_film_id, triggered_by_user_id)
  select
    u.id,
    'film_archived',
    p_group_film_id,
    v_triggering_user
  from public.users u
  where u.group_id = v_group_id
    and u.id <> coalesce(v_triggering_user, '00000000-0000-0000-0000-000000000000'::uuid);
end;
$$;

grant execute on function public.notify_film_archived(uuid) to authenticated;
