import { createClient } from "@/lib/supabase/server";
import { getMovieDetails } from "@/lib/tmdb";

export type NotificationType =
  | "film_added"
  | "film_tagged"
  | "film_untagged"
  | "film_seen";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  triggeredBy: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  film: {
    id: string;
    tmdbId: number;
    title: string;
    posterPath: string | null;
  } | null;
};

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id, type, created_at, read_at, group_film_id, triggered_by:users!notifications_triggered_by_user_id_fkey(id, name, avatar_url), film:group_films!notifications_group_film_id_fkey(id, tmdb_id)",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as {
    id: string;
    type: NotificationType;
    created_at: string;
    read_at: string | null;
    group_film_id: string | null;
    triggered_by: { id: string; name: string; avatar_url: string | null } | null;
    film: { id: string; tmdb_id: number } | null;
  }[];

  const items: NotificationItem[] = await Promise.all(
    rows.map(async (row) => {
      let filmInfo: NotificationItem["film"] = null;
      if (row.film) {
        let title = `Film #${row.film.tmdb_id}`;
        let posterPath: string | null = null;
        try {
          const details = await getMovieDetails(row.film.tmdb_id);
          title = details.title;
          posterPath = details.poster_path;
        } catch {
          // keep fallback
        }
        filmInfo = {
          id: row.film.id,
          tmdbId: row.film.tmdb_id,
          title,
          posterPath,
        };
      }

      return {
        id: row.id,
        type: row.type,
        createdAt: row.created_at,
        readAt: row.read_at,
        triggeredBy: row.triggered_by
          ? {
              id: row.triggered_by.id,
              name: row.triggered_by.name,
              avatarUrl: row.triggered_by.avatar_url,
            }
          : null,
        film: filmInfo,
      };
    }),
  );

  return Response.json({ notifications: items });
}
