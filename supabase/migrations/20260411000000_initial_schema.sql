-- SBS-11: Schéma de base de données initial SideByScreen

-- ============================================================
-- TABLES
-- ============================================================

-- Groupes d'utilisateurs
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- Utilisateurs (extension de auth.users)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  avatar_url text,
  email text not null,
  group_id uuid references groups(id) on delete set null
);

-- Films ajoutés dans un groupe
create table group_films (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references groups(id) on delete cascade,
  tmdb_id integer not null,
  added_by_user_id uuid not null references users(id) on delete cascade,
  added_at timestamptz not null default now(),
  visible boolean not null default true,

  constraint group_films_group_tmdb_unique unique (group_id, tmdb_id)
);

-- Tags utilisateur sur les films du groupe
create table user_film_tags (
  user_id uuid not null references users(id) on delete cascade,
  group_film_id uuid not null references group_films(id) on delete cascade,
  is_seen boolean not null default false,
  is_tagged boolean not null default false,
  seen_at timestamptz,

  primary key (user_id, group_film_id)
);

-- Notifications
create type notification_type as enum (
  'film_added',
  'film_tagged',
  'film_seen'
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  type notification_type not null,
  group_film_id uuid references group_films(id) on delete cascade,
  triggered_by_user_id uuid references users(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- ============================================================
-- INDEX
-- ============================================================

create index idx_users_group_id on users(group_id);
create index idx_group_films_group_id on group_films(group_id);
create index idx_group_films_added_by on group_films(added_by_user_id);
create index idx_user_film_tags_group_film_id on user_film_tags(group_film_id);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_created_at on notifications(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table users enable row level security;
alter table groups enable row level security;
alter table group_films enable row level security;
alter table user_film_tags enable row level security;
alter table notifications enable row level security;

-- Helper: récupère le group_id de l'utilisateur courant
create or replace function public.user_group_id()
returns uuid
language sql
stable
security definer
as $$
  select group_id from public.users where id = auth.uid()
$$;

-- --- USERS ---

-- Un utilisateur ne voit que les membres de son groupe
create policy "users_select_same_group"
  on users for select
  using (group_id = public.user_group_id());

-- Un utilisateur ne peut modifier que son propre profil
create policy "users_update_own"
  on users for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Insertion lors de l'inscription
create policy "users_insert_own"
  on users for insert
  with check (id = auth.uid());

-- --- GROUPS ---

-- Un utilisateur ne voit que son propre groupe
create policy "groups_select_own"
  on groups for select
  using (id = public.user_group_id());

-- --- GROUP_FILMS ---

-- Un utilisateur ne voit que les films de son groupe
create policy "group_films_select_same_group"
  on group_films for select
  using (group_id = public.user_group_id());

-- Un utilisateur peut ajouter un film dans son groupe
create policy "group_films_insert_same_group"
  on group_films for insert
  with check (
    group_id = public.user_group_id()
    and added_by_user_id = auth.uid()
  );

-- Un utilisateur peut modifier les films de son groupe
create policy "group_films_update_same_group"
  on group_films for update
  using (group_id = public.user_group_id());

-- --- USER_FILM_TAGS ---

-- Un utilisateur ne voit que les tags de son groupe
create policy "user_film_tags_select_same_group"
  on user_film_tags for select
  using (
    exists (
      select 1 from group_films gf
      where gf.id = group_film_id
        and gf.group_id = public.user_group_id()
    )
  );

-- Un utilisateur ne peut modifier que ses propres tags
create policy "user_film_tags_insert_own"
  on user_film_tags for insert
  with check (user_id = auth.uid());

create policy "user_film_tags_update_own"
  on user_film_tags for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "user_film_tags_delete_own"
  on user_film_tags for delete
  using (user_id = auth.uid());

-- --- NOTIFICATIONS ---

-- Un utilisateur ne voit que ses propres notifications
create policy "notifications_select_own"
  on notifications for select
  using (user_id = auth.uid());

-- Un utilisateur peut marquer ses notifications comme lues
create policy "notifications_update_own"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Les notifications sont insérées par le système (service role),
-- pas directement par les utilisateurs
