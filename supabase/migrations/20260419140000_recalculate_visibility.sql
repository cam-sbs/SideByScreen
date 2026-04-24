-- SBS-30: Archivage automatique des films
-- Un film passe visible=false quand, pour chaque membre du groupe,
-- l'une des deux conditions est remplie :
--   1. le membre a marqué le film "vu" (is_seen=true)
--   2. le membre n'a pas (ou plus) tagué le film (is_tagged=false / absence de tag)
-- Tant qu'un seul membre n'est ni vu ni tagué-retiré, le film reste visible.

create or replace function public.recalculate_group_film_visibility(
  p_group_film_id uuid
)
returns boolean
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

  -- Si déjà archivé, on ne le ressuscite pas (ex. nouveau membre).
  if v_visible = false then
    return false;
  end if;

  -- Compte les membres du groupe qui ne remplissent AUCUNE des deux conditions :
  -- ni vu, ni sans tag. Autrement dit : taggés ET non vus.
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
    return false;
  end if;

  return true;
end;
$$;

grant execute on function public.recalculate_group_film_visibility(uuid) to authenticated;
