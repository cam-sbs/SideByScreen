-- SBS-26: Fonction atomique d'ajout d'un film dans un groupe
-- Insère l'entrée group_films, tague automatiquement l'ajouteur,
-- et crée une notification pour les autres membres du groupe.

create or replace function public.add_group_film(p_tmdb_id integer)
returns table(id uuid, already_exists boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_film_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select group_id into v_group_id from public.users where id = v_user_id;
  if v_group_id is null then
    raise exception 'no_group' using errcode = 'P0001';
  end if;

  select gf.id into v_film_id
  from public.group_films gf
  where gf.group_id = v_group_id and gf.tmdb_id = p_tmdb_id;

  if v_film_id is not null then
    id := v_film_id;
    already_exists := true;
    return next;
    return;
  end if;

  insert into public.group_films(group_id, tmdb_id, added_by_user_id)
  values (v_group_id, p_tmdb_id, v_user_id)
  returning group_films.id into v_film_id;

  insert into public.user_film_tags(user_id, group_film_id, is_tagged)
  values (v_user_id, v_film_id, true);

  insert into public.notifications(user_id, type, group_film_id, triggered_by_user_id)
  select u.id, 'film_added', v_film_id, v_user_id
  from public.users u
  where u.group_id = v_group_id and u.id <> v_user_id;

  id := v_film_id;
  already_exists := false;
  return next;
end;
$$;

grant execute on function public.add_group_film(integer) to authenticated;
