-- SBS-32: Active la diffusion Realtime sur public.notifications pour mettre
-- à jour la cloche + badge du centre de notifications en temps réel.

alter publication supabase_realtime add table public.notifications;
