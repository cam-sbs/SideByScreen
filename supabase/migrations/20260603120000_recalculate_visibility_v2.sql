-- SBS-32: Mise à jour de recalculate_group_film_visibility
-- - Retourne 'just_archived' | 'already_archived' | 'visible' (text au lieu de boolean)
-- - Appelle notify_film_archived lors du premier passage à visible=false

drop function if exists public.recalculate_group_film_visibility(uuid);

create function public.recalculate_group_film_visibility(
  p_group_film_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_unresolved integer;
  v_visible boolean;
begin
  select group_id, visible
    into v_group_id, v_visible
  from public.group_films
  where id = p_group_film_id;

  if v_group_id is null then
    return null;
  end if;

  if v_visible = false then
    return 'already_archived';
  end if;

  select count(*)
    into v_unresolved
  from public.users u
  left join public.user_film_tags uft
    on uft.user_id = u.id
   and uft.group_film_id = p_group_film_id
  where u.group_id = v_group_id
    and coalesce(uft.is_tagged, false) = true
    and coalesce(uft.is_seen, false) = false;

  if v_unresolved = 0 then
    update public.group_films
       set visible = false
     where id = p_group_film_id;

    perform public.notify_film_archived(p_group_film_id);

    return 'just_archived';
  end if;

  return 'visible';
end;
$$;

grant execute on function public.recalculate_group_film_visibility(uuid) to authenticated;
