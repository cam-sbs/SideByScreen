-- SBS-31: notifie l'ajouteur d'un film lorsqu'un autre membre se positionne
-- (is_tagged=false→true). Appelé depuis l'API après l'upsert.

create or replace function public.notify_film_tagged(p_group_film_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_added_by uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select gf.group_id, gf.added_by_user_id
    into v_group_id, v_added_by
  from public.group_films gf
  where gf.id = p_group_film_id;

  if v_group_id is null then
    raise exception 'film_not_found' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.users
    where id = v_user_id and group_id = v_group_id
  ) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- Pas de notif si c'est l'ajouteur qui se (re)tague lui-même.
  if v_added_by = v_user_id then
    return;
  end if;

  -- Vérifie que le tag est bien effectif côté DB.
  if not exists (
    select 1 from public.user_film_tags
    where user_id = v_user_id
      and group_film_id = p_group_film_id
      and is_tagged = true
  ) then
    return;
  end if;

  insert into public.notifications(user_id, type, group_film_id, triggered_by_user_id)
  values (v_added_by, 'film_tagged', p_group_film_id, v_user_id);
end;
$$;

grant execute on function public.notify_film_tagged(uuid) to authenticated;
