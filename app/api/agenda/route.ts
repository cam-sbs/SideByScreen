import { createClient } from "@/lib/supabase/server";
import { getMovieDetails } from "@/lib/tmdb";
import type { ScreeningParticipantStatus } from "@/types/supabase";

export type AgendaParticipant = {
  id: string;
  name: string;
  avatarUrl: string | null;
  status: ScreeningParticipantStatus;
};

export type AgendaItem = {
  screeningId: string;
  scheduledAt: string;
  myStatus: ScreeningParticipantStatus;
  organizer: AgendaParticipant | null;
  participants: AgendaParticipant[];
  film: {
    groupFilmId: string;
    tmdbId: number;
    title: string;
    posterPath: string | null;
  };
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const nowIso = new Date().toISOString();

  // Toutes les séances à venir dans le groupe (les policies filtrent).
  const { data: screeningsData, error: screeningsError } = await supabase
    .from("film_screenings")
    .select(
      "id, scheduled_at, scheduled_by_user_id, group_film_id, group_film:group_films!film_screenings_group_film_id_fkey(id, tmdb_id)",
    )
    .gte("scheduled_at", nowIso)
    .order("scheduled_at", { ascending: true });

  if (screeningsError) {
    return Response.json({ error: screeningsError.message }, { status: 500 });
  }

  const screenings = (screeningsData ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    scheduled_by_user_id: string;
    group_film_id: string;
    group_film: { id: string; tmdb_id: number } | null;
  }[];

  if (screenings.length === 0) {
    return Response.json({ items: [] as AgendaItem[] });
  }

  const screeningIds = screenings.map((s) => s.id);

  const { data: partsData } = await supabase
    .from("screening_participants")
    .select(
      "screening_id, user_id, status, user:users!screening_participants_user_id_fkey(id, name, avatar_url)",
    )
    .in("screening_id", screeningIds);

  const parts = (partsData ?? []) as unknown as {
    screening_id: string;
    user_id: string;
    status: ScreeningParticipantStatus;
    user: { id: string; name: string; avatar_url: string | null } | null;
  }[];

  const participantsByScreening = new Map<string, AgendaParticipant[]>();
  const myStatusByScreening = new Map<string, ScreeningParticipantStatus>();

  for (const p of parts) {
    if (!p.user) continue;
    const entry: AgendaParticipant = {
      id: p.user.id,
      name: p.user.name,
      avatarUrl: p.user.avatar_url,
      status: p.status,
    };
    const list = participantsByScreening.get(p.screening_id) ?? [];
    list.push(entry);
    participantsByScreening.set(p.screening_id, list);
    if (p.user_id === user.id) {
      myStatusByScreening.set(p.screening_id, p.status);
    }
  }

  // Ne garde que les séances où l'utilisateur est invité et n'a pas annulé.
  const mine = screenings.filter((s) => {
    const status = myStatusByScreening.get(s.id);
    return status === "pending" || status === "accepted";
  });

  const items: AgendaItem[] = await Promise.all(
    mine.map(async (s) => {
      const tmdbId = s.group_film?.tmdb_id ?? 0;
      let title = `Film #${tmdbId}`;
      let posterPath: string | null = null;
      if (tmdbId > 0) {
        try {
          const details = await getMovieDetails(tmdbId);
          title = details.title;
          posterPath = details.poster_path;
        } catch {
          // fallback
        }
      }
      const participants = participantsByScreening.get(s.id) ?? [];
      const organizer =
        participants.find((p) => p.id === s.scheduled_by_user_id) ?? null;
      return {
        screeningId: s.id,
        scheduledAt: s.scheduled_at,
        myStatus: myStatusByScreening.get(s.id) ?? "pending",
        organizer,
        participants,
        film: {
          groupFilmId: s.group_film?.id ?? s.group_film_id,
          tmdbId,
          title,
          posterPath,
        },
      };
    }),
  );

  return Response.json({ items });
}
