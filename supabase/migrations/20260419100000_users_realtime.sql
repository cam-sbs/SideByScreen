-- SBS-20: Active la diffusion Realtime sur public.users pour mettre à jour
-- la liste des membres du groupe en temps réel.

alter publication supabase_realtime add table public.users;
