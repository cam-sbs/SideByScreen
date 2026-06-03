import { createClient } from "@/lib/supabase/server";
import { getMovieReleaseDates } from "@/lib/tmdb";
import {
  computeScreenStatus,
  extractTheatricalReleaseDate,
} from "@/lib/screenStatus";

/** Backfills theatrical_release_date + screen_status for existing films that
 *  still have screen_status = 'unknown' and no theatrical_release_date set. */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return Response.json({ error: "Dev only" }, { status: 403 });
  }

  const supabase = await createClient();

  const { data: films, error } = await supabase
    .from("group_films")
    .select("id, tmdb_id")
    .eq("visible", true)
    .eq("screen_status", "unknown")
    .is("theatrical_release_date", null);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  const rows = (films ?? []) as { id: string; tmdb_id: number }[];
  let updated = 0;
  let failed = 0;

  for (const film of rows) {
    try {
      const releaseDates = await getMovieReleaseDates(film.tmdb_id);
      const theatricalReleaseDate = extractTheatricalReleaseDate(releaseDates.results);
      const screenStatus = computeScreenStatus(theatricalReleaseDate);

      await supabase
        .from("group_films")
        .update({
          theatrical_release_date: theatricalReleaseDate,
          screen_status: screenStatus,
        })
        .eq("id", film.id);

      updated++;
    } catch {
      failed++;
    }
  }

  return Response.json({ total: rows.length, updated, failed });
}
