import { createClient } from "@/lib/supabase/server";
import { getMovieDetails } from "@/lib/tmdb";

export type GroupFilmMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type GroupFilmCard = {
  id: string;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  addedAt: string;
  addedBy: GroupFilmMember | null;
  taggedMembers: GroupFilmMember[];
  seenByMe: boolean;
  releaseDate: string | null;
  isConsensus: boolean;
};

function urgencyRank(releaseDate: string | null): 0 | 1 | 2 {
  if (!releaseDate) return 2;
  const release = new Date(releaseDate);
  if (Number.isNaN(release.getTime())) return 2;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 14) return 2;
  if (diffDays <= 21) return 1;
  return 0;
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
      "id, tmdb_id, added_at, added_by:users!group_films_added_by_user_id_fkey(id, name, avatar_url)",
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
      "group_film_id, user_id, is_seen, is_tagged, user:users!user_film_tags_user_id_fkey(id, name, avatar_url)",
    )
    .in("group_film_id", filmIds);

  const tags = (tagsData ?? []) as unknown as {
    group_film_id: string;
    user_id: string;
    is_seen: boolean;
    is_tagged: boolean;
    user: { id: string; name: string; avatar_url: string | null } | null;
  }[];

  const taggedByFilm = new Map<string, GroupFilmMember[]>();
  const seenByMe = new Set<string>();

  for (const tag of tags) {
    if (tag.is_tagged && tag.user) {
      const list = taggedByFilm.get(tag.group_film_id) ?? [];
      list.push({
        id: tag.user.id,
        name: tag.user.name,
        avatarUrl: tag.user.avatar_url,
      });
      taggedByFilm.set(tag.group_film_id, list);
    }
    if (tag.is_seen && tag.user_id === user.id) {
      seenByMe.add(tag.group_film_id);
    }
  }

  const cards: GroupFilmCard[] = await Promise.all(
    films.map(async (film) => {
      let title = `Film #${film.tmdb_id}`;
      let posterPath: string | null = null;
      let releaseDate: string | null = null;
      try {
        const details = await getMovieDetails(film.tmdb_id);
        title = details.title;
        posterPath = details.poster_path;
        releaseDate = details.release_date || null;
      } catch {
        // keep fallback
      }

      const taggedMembers = taggedByFilm.get(film.id) ?? [];
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
        seenByMe: seenByMe.has(film.id),
        releaseDate,
        isConsensus:
          totalMembers > 0 && taggedMembers.length >= totalMembers,
      };
    }),
  );

  cards.sort((a, b) => {
    if (a.isConsensus !== b.isConsensus) return a.isConsensus ? -1 : 1;
    if (a.isConsensus) {
      const rankDiff = urgencyRank(a.releaseDate) - urgencyRank(b.releaseDate);
      if (rankDiff !== 0) return rankDiff;
      return (
        new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime()
      );
    }
    return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
  });

  return Response.json({ films: cards });
}
