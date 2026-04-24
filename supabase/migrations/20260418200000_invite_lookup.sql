-- SBS-19: Lookup d'un groupe par code d'invitation (utilisé par la page /invite/[code]).

create or replace function public.lookup_group_by_invite_code(code text)
returns table(id uuid, name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text;
begin
  normalized := upper(btrim(coalesce(code, '')));
  if normalized = '' then
    raise exception 'INVITE_CODE_REQUIRED';
  end if;

  return query
    select g.id, g.name
    from public.groups g
    where g.invite_code = normalized;
end;
$$;

revoke all on function public.lookup_group_by_invite_code(text) from public;
grant execute on function public.lookup_group_by_invite_code(text) to authenticated, anon;
