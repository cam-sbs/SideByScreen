alter table public.user_film_tags
  add column if not exists watched_together_at timestamptz null;
