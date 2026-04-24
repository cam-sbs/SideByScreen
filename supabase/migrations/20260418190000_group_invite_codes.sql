-- SBS-17: Codes d'invitation + fonctions d'onboarding (créer / rejoindre un groupe).

-- 1. Colonne invite_code sur groups, unique.
alter table public.groups
  add column invite_code text unique;

-- 2. Générateur de code: 8 caractères alphanumériques sans 0/O/1/I.
create or replace function public.generate_group_invite_code()
returns text
language plpgsql
as $$
declare
  chars constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..8 loop
      code := code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    end loop;
    exit when not exists (select 1 from public.groups where invite_code = code);
  end loop;
  return code;
end;
$$;

-- 3. Backfill des groupes existants puis NOT NULL.
update public.groups
set invite_code = public.generate_group_invite_code()
where invite_code is null;

alter table public.groups alter column invite_code set not null;

-- 4. create_and_join_group : crée le groupe et place l'utilisateur dedans.
create or replace function public.create_and_join_group(group_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group_id uuid;
  new_code text;
  current_user_id uuid := auth.uid();
  trimmed_name text;
begin
  if current_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  trimmed_name := btrim(coalesce(group_name, ''));
  if trimmed_name = '' then
    raise exception 'GROUP_NAME_REQUIRED';
  end if;
  if char_length(trimmed_name) > 50 then
    raise exception 'GROUP_NAME_TOO_LONG';
  end if;

  if exists (
    select 1 from public.users
    where id = current_user_id and group_id is not null
  ) then
    raise exception 'ALREADY_IN_GROUP';
  end if;

  new_code := public.generate_group_invite_code();

  insert into public.groups (name, invite_code)
  values (trimmed_name, new_code)
  returning id into new_group_id;

  update public.users
  set group_id = new_group_id
  where id = current_user_id;

  return new_group_id;
end;
$$;

-- 5. join_group_by_code : rejoint un groupe via son code d'invitation.
create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
  current_user_id uuid := auth.uid();
  normalized text;
begin
  if current_user_id is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  normalized := upper(btrim(coalesce(code, '')));
  if normalized = '' then
    raise exception 'INVITE_CODE_REQUIRED';
  end if;

  select id into target_group_id
  from public.groups
  where invite_code = normalized;

  if target_group_id is null then
    raise exception 'INVITE_CODE_NOT_FOUND';
  end if;

  if exists (
    select 1 from public.users
    where id = current_user_id and group_id is not null
  ) then
    raise exception 'ALREADY_IN_GROUP';
  end if;

  update public.users
  set group_id = target_group_id
  where id = current_user_id;

  return target_group_id;
end;
$$;

revoke all on function public.create_and_join_group(text) from public;
revoke all on function public.join_group_by_code(text) from public;
grant execute on function public.create_and_join_group(text) to authenticated;
grant execute on function public.join_group_by_code(text) to authenticated;
