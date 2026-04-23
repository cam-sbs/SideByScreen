-- Nouveaux types de notifications pour l'agenda.
-- Séparé car ALTER TYPE ADD VALUE ne peut pas cohabiter avec l'utilisation
-- de cette nouvelle valeur dans la même transaction.

alter type notification_type add value if not exists 'screening_invited';
alter type notification_type add value if not exists 'screening_cancelled';
