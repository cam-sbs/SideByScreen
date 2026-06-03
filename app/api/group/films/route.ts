import { createClient } from "@/lib/supabase/server";
import { getMovieDetails, getMovieReleaseDates } from "@/lib/tmdb";
import {
  type ScreenStatus,
  computeScreenStatus,
  extractTheatricalReleaseDate,
} from "@/lib/screenStatus";

export type { ScreenStatus };

export type GroupFilmMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type GroupFilmGenre = {
  id: number;
  name: string;
};

export type GroupFilmCard = {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  addedAt: string;
  addedBy: GroupFilmMember | null;
  taggedMembers: GroupFilmMember[];
  taggedByMe: boolean;
  seenByMe: boolean;
  wishedByMe: boolean;
  plannedByMe: boolean;
  releaseDate: string | null;
  isConsensus: boolean;
  hasUrgency: boolean;
  genres: GroupFilmGenre[];
  // Screen status fields
  screenStatus: ScreenStatus;
  theatricalReleaseDate: string | null;
  salonOverride: boolean;
};

/** Returns 0 (most urgent / red) → 1 (orange) → 2 (no urgency).
 *  Used for sorting in_theaters films: red first, then orange, then recent. */
function urgencyRank(theatricalReleaseDate: string | null): 0 | 1 | 2 {
  if (!theatricalReleaseDate) return 2;
  const release = new Date(theatricalReleaseDate);
  if (Number.isNaN(release.getTime())) return 2;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 21) return 0;
  if (diffDays >= 14) return 1;
  return 2;
}

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.group_id) {
    return Response.json({ error: "Aucun groupe" }, { status: 404 });
  }

  const { data: filmsData, error: filmsError } = await supabase
    .from("group_films")
    .select(
      "id, tmdb_id, added_at, screen_status, theatrical_release_date, salon_override, added_by:users!group_films_added_by_user_id_fkey(id, name, avatar_url)",
    )
    .eq("group_id", profile.group_id)
    .eq("visible", true)
    .order("added_at", { ascending: false });

  if (filmsError) {
    return Response.json({ error: filmsError.message }, { status: 500 });
  }

  const films = (filmsData ?? []) as unknown as {
    id: string;
    tmdb_id: number;
    added_at: string;
    screen_status: ScreenStatus;
    theatrical_release_date: string | null;
    salon_override: boolean;
    added_by: { id: string; name: string; avatar_url: string | null } | null;
  }[];

  if (films.length === 0) {
    return Response.json({ films: [] as GroupFilmCard[] });
  }

  const filmIds = films.map((f) => f.id);

  const { count: memberCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("group_id", profile.group_id);

  const totalMembers = memberCount ?? 0;

  const { data: tagsData } = await supabase
    .from("user_film_tags")
    .select(
      "group_film_id, user_id, is_seen, is_tagged, is_wished, user:users!user_film_tags_user_id_fkey(id, name, avatar_url)",
    )
    .in("group_film_id", filmIds);

  const nowIso = new Date().toISOString();
  const { data: plannedData } = await supabase
    .from("screening_participants")
    .select(
      "status, screening:film_screenings!screening_participants_screening_id_fkey(group_film_id, scheduled_at)",
    )
    .eq("user_id", user.id)
    .in("status", ["pending", "accepted"]);

  const plannedByMe = new Set<string>();
  for (const row of (plannedData ?? []) as unknown as {
    status: string;
    screening: { group_film_id: string; scheduled_at: string } | null;
  }[]) {
    if (!row.screening) continue;
    if (row.screening.scheduled_at >= nowIso) {
      plannedByMe.add(row.screening.group_film_id);
    }
  }

  const tags = (tagsData ?? []) as unknown as {
    group_film_id: string;
    user_id: string;
    is_seen: boolean;
    is_tagged: boolean;
    is_wished: boolean;
    user: { id: string; name: string; avatar_url: string | null } | null;
  }[];

  const taggedByFilm = new Map<string, GroupFilmMember[]>();
  const seenByMe = new Set<string>();
  const taggedByMe = new Set<string>();
  const wishedByMe = new Set<string>();

  for (const tag of tags) {
    if (tag.is_tagged && tag.user) {
      const list = taggedByFilm.get(tag.group_film_id) ?? [];
      list.push({
        id: tag.user.id,
        name: tag.user.name,
        avatarUrl: tag.user.avatar_url,
      });
      taggedByFilm.set(tag.group_film_id, list);
      if (tag.user_id === user.id) {
        taggedByMe.add(tag.group_film_id);
      }
    }
    if (tag.is_seen && tag.user_id === user.id) {
      seenByMe.add(tag.group_film_id);
    }
    if (tag.is_wished && tag.user_id === user.id) {
      wishedByMe.add(tag.group_film_id);
    }
  }

  const cards: GroupFilmCard[] = await Promise.all(
    films.map(async (film) => {
      let title = `Film #${film.tmdb_id}`;
      let posterPath: string | null = null;
      let releaseDate: string | null = null;
      let genres: GroupFilmGenre[] = [];
      try {
        const details = await getMovieDetails(film.tmdb_id);
        title = details.title;
        posterPath = details.poster_path;
        releaseDate = details.release_date || null;
        genres = (details.genres ?? []).map((g) => ({ id: g.id, name: g.name }));
      } catch {
        // keep fallback
      }

      const taggedMembers = taggedByFilm.get(film.id) ?? [];
      const theatricalReleaseDate = film.theatrical_release_date;
      const screenStatus = film.screen_status;

      return {
        id: film.id,
        tmdbId: film.tmdb_id,
        title,
        posterPath,
        addedAt: film.added_at,
        addedBy: film.added_by
          ? {
              id: film.added_by.id,
              name: film.added_by.name,
              avatarUrl: film.added_by.avatar_url,
            }
          : null,
        taggedMembers,
        taggedByMe: taggedByMe.has(film.id),
        seenByMe: seenByMe.has(film.id),
        wishedByMe: wishedByMe.has(film.id),
        plannedByMe: plannedByMe.has(film.id),
        releaseDate,
        isConsensus:
          totalMembers > 0 && taggedMembers.length >= totalMembers,
        hasUrgency:
          screenStatus === "in_theaters" && urgencyRank(theatricalReleaseDate) < 2,
        genres,
        screenStatus,
        theatricalReleaseDate,
        salonOverride: film.salon_override,
      };
    }),
  );

  return Response.json({ films: cards });
}

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide" }, { status: 400 });
  }

  const tmdbId = (payload as { tmdbId?: unknown } | null)?.tmdbId;
  if (typeof tmdbId !== "number" || !Number.isInteger(tmdbId) || tmdbId <= 0) {
    return Response.json({ error: "tmdbId invalide" }, { status: 400 });
  }

  const { data, error } = await supabase
    .rpc("add_group_film", { p_tmdb_id: tmdbId })
    .single<{ film_id: string; already_exists: boolean }>();

  if (error) {
    if (error.code === "P0001") {
      return Response.json({ error: "Aucun groupe" }, { status: 404 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (data.already_exists) {
    return Response.json(
      { error: "Ce film est déjà dans la liste", id: data.film_id },
      { status: 409 },
    );
  }

  // Enrich with FR theatrical release date from TMDB
  try {
    const releaseDates = await getMovieReleaseDates(tmdbId);
    const theatricalReleaseDate = extractTheatricalReleaseDate(releaseDates.results);
    const screenStatus = computeScreenStatus(theatricalReleaseDate);

    await supabase
      .from("group_films")
      .update({
        theatrical_release_date: theatricalReleaseDate,
        screen_status: screenStatus,
      })
      .eq("id", data.film_id);
  } catch {
    // Non-blocking: film is added, screen_status stays 'unknown'
  }

  return Response.json({ id: data.film_id }, { status: 201 });
}
