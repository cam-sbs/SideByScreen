-- Séances planifiées pour un film du groupe.
-- Un organisateur crée une séance (date/heure) et invite des membres.
-- Chaque invité accepte, décline ou annule sa venue indépendamment —
-- la séance reste pour les autres. L'annulation d'un invité déclenche
-- une notification aux autres participants.

create type screening_participant_status as enum (
  'pending',
  'accepted',
  'cancelled'
);

create table film_screenings (
  id uuid primary key default gen_random_uuid(),
  group_film_id uuid not null references group_films(id) on delete cascade,
  scheduled_by_user_id uuid not null references users(id) on delete cascade,
  scheduled_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index idx_film_screenings_group_film on film_screenings(group_film_id);
create index idx_film_screenings_scheduled_at on film_screenings(scheduled_at);

create table screening_participants (
  screening_id uuid not null references film_screenings(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  status screening_participant_status not null default 'pending',
  responded_at timestamptz,
  primary key (screening_id, user_id)
);

create index idx_screening_participants_user on screening_participants(user_id);

alter table notifications
  add column screening_id uuid references film_screenings(id) on delete cascade;

create index idx_notifications_screening_id on notifications(screening_id);

alter table film_screenings enable row level security;
alter table screening_participants enable row level security;

create policy "film_screenings_select_same_group"
  on film_screenings for select
  using (
    exists (
      select 1 from group_films gf
      where gf.id = group_film_id
        and gf.group_id = public.user_group_id()
    )
  );

create policy "screening_participants_select_same_group"
  on screening_participants for select
  using (
    exists (
      select 1 from film_screenings fs
      join group_films gf on gf.id = fs.group_film_id
      where fs.id = screening_id
        and gf.group_id = public.user_group_id()
    )
  );

-- Les écritures passent exclusivement par les RPC security definer.

-- ============================================================
-- RPC : créer une séance
-- ============================================================
create or replace function public.create_film_screening(
  p_group_film_id uuid,
  p_scheduled_at timestamptz,
  p_participant_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_id uuid;
  v_screening_id uuid;
  v_participant uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select gf.group_id
    into v_group_id
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

  insert into public.film_screenings(group_film_id, scheduled_by_user_id, scheduled_at)
  values (p_group_film_id, v_user_id, p_scheduled_at)
  returning id into v_screening_id;

  -- L'organisateur est automatiquement accepté.
  insert into public.screening_participants(screening_id, user_id, status, responded_at)
  values (v_screening_id, v_user_id, 'accepted', now());

  -- Invités : filtrés au même groupe, dédoublonnés, organisateur exclu.
  if p_participant_ids is not null then
    foreach v_participant in array p_participant_ids loop
      if v_participant = v_user_id then
        continue;
      end if;

      if not exists (
        select 1 from public.users
        where id = v_participant and group_id = v_group_id
      ) then
        continue;
      end if;

      insert into public.screening_participants(screening_id, user_id, status)
      values (v_screening_id, v_participant, 'pending')
      on conflict do nothing;

      insert into public.notifications(user_id, type, group_film_id, screening_id, triggered_by_user_id)
      values (v_participant, 'screening_invited', p_group_film_id, v_screening_id, v_user_id);
    end loop;
  end if;

  return v_screening_id;
end;
$$;

grant execute on function public.create_film_screening(uuid, timestamptz, uuid[]) to authenticated;

-- ============================================================
-- RPC : répondre à une invitation (accept / decline via 'cancelled')
-- ============================================================
create or replace function public.respond_to_screening(
  p_screening_id uuid,
  p_accept boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group_film_id uuid;
  v_organizer uuid;
  v_previous_status screening_participant_status;
  v_new_status screening_participant_status;
  v_other record;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select fs.group_film_id, fs.scheduled_by_user_id
    into v_group_film_id, v_organizer
  from public.film_screenings fs
  where fs.id = p_screening_id;

  if v_group_film_id is null then
    raise exception 'screening_not_found' using errcode = 'P0001';
  end if;

  select status
    into v_previous_status
  from public.screening_participants
  where screening_id = p_screening_id and user_id = v_user_id;

  if v_previous_status is null then
    raise exception 'not_invited' using errcode = '42501';
  end if;

  v_new_status := case when p_accept then 'accepted'::screening_participant_status
                       else 'cancelled'::screening_participant_status end;

  update public.screening_participants
     set status = v_new_status,
         responded_at = now()
   where screening_id = p_screening_id
     and user_id = v_user_id;

  -- Notifications : si cancelled après acceptation (ou par l'organisateur),
  -- prévient les autres participants encore actifs (accepted/pending).
  if v_new_status = 'cancelled'
     and coalesce(v_previous_status, 'pending') <> 'cancelled' then
    for v_other in
      select user_id
      from public.screening_participants
      where screening_id = p_screening_id
        and user_id <> v_user_id
        and status <> 'cancelled'
    loop
      insert into public.notifications(
        user_id, type, group_film_id, screening_id, triggered_by_user_id
      )
      values (
        v_other.user_id,
        'screening_cancelled',
        v_group_film_id,
        p_screening_id,
        v_user_id
      );
    end loop;
  end if;
end;
$$;

grant execute on function public.respond_to_screening(uuid, boolean) to authenticated;

alter publication supabase_realtime add table film_screenings;
alter publication supabase_realtime add table screening_participants;
