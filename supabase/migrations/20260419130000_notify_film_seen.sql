-- SBS-29: notifie les membres positionnés sur un film lorsqu'un autre membre
-- le marque comme "vu". Appelé depuis l'API après le flip is_seen=false→true.

create or replace function public.notify_film_seen(p_group_film_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select gf.group_id into v_group_id
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

  if not exists (
    select 1 from public.user_film_tags
    where user_id = v_user_id
      and group_film_id = p_group_film_id
      and is_seen = true
  ) then
    return;
  end if;

  insert into public.notifications(user_id, type, group_film_id, triggered_by_user_id)
  select uft.user_id, 'film_seen', p_group_film_id, v_user_id
  from public.user_film_tags uft
  where uft.group_film_id = p_group_film_id
    and uft.is_tagged = true
    and uft.user_id <> v_user_id;
end;
$$;

grant execute on function public.notify_film_seen(uuid) to authenticated;
