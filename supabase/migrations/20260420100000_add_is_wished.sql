-- Ajout du statut "Souhait" (favori) sur user_film_tags.
-- Permet à un membre de marquer un film qu'il veut absolument voir.

alter table public.user_film_tags
  add column if not exists is_wished boolean not null default false;
