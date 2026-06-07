create or replace function public.notify_watched_together(p_group_film_id uuid)
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

  -- Notify all other tagged members
  insert into public.notifications(user_id, type, group_film_id, triggered_by_user_id)
  select uft.user_id, 'film_watched_together', p_group_film_id, v_user_id
  from public.user_film_tags uft
  where uft.group_film_id = p_group_film_id
    and uft.is_tagged = true
    and uft.user_id <> v_user_id;
end;
$$;

grant execute on function public.notify_watched_together(uuid) to authenticated;
