-- SBS-salon: Update recalculate_group_film_visibility to branch on screen_status.
-- Cinema: archive when no group member is both tagged and unseen (existing rule).
-- Salon: archive when all tagged members have confirmed watched_together_at.

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
  v_group_id      uuid;
  v_visible       boolean;
  v_screen_status text;
  v_unresolved    integer;
begin
  select group_id, visible, screen_status
    into v_group_id, v_visible, v_screen_status
  from public.group_films
  where id = p_group_film_id;

  if v_group_id is null then
    return null;
  end if;

  if v_visible = false then
    return 'already_archived';
  end if;

  if v_screen_status = 'salon' then
    -- Salon rule: at least one tagged member required, and all tagged must have confirmed.
    if not exists (
      select 1 from public.user_film_tags
      where group_film_id = p_group_film_id
        and is_tagged = true
    ) then
      return 'visible';
    end if;

    select count(*)
      into v_unresolved
    from public.user_film_tags
    where group_film_id = p_group_film_id
      and is_tagged = true
      and watched_together_at is null;
  else
    -- Cinema rule: archive when no member is tagged-and-unseen.
    select count(*)
      into v_unresolved
    from public.users u
    left join public.user_film_tags uft
      on uft.user_id = u.id
     and uft.group_film_id = p_group_film_id
    where u.group_id = v_group_id
      and coalesce(uft.is_tagged, false) = true
      and coalesce(uft.is_seen, false) = false;
  end if;

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
