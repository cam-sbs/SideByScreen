-- SBS-15 fix: amorce la ligne public.users à l'inscription et permet
-- à l'utilisateur de lire son propre profil avant d'avoir rejoint un groupe.

-- 1. Politique SELECT "self" — l'utilisateur peut toujours lire sa propre ligne
create policy "users_select_self"
  on public.users for select
  using (id = auth.uid());

-- 2. Trigger d'amorçage : crée public.users dès qu'une ligne auth.users apparaît.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill : crée la ligne public.users pour tout auth.users qui n'en a pas.
insert into public.users (id, email, name)
select
  u.id,
  u.email,
  coalesce(
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  )
from auth.users u
where u.email is not null
  and not exists (select 1 from public.users p where p.id = u.id)
on conflict (id) do nothing;
