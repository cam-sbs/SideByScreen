import { createClient } from "@/lib/supabase/server";
import { searchMovies } from "@/lib/tmdb";

const SEED_QUERIES = [
  "dune",
  "inception",
  "matrix",
  "interstellar",
  "parasite",
  "oppenheimer",
  "barbie",
  "gladiator",
  "avatar",
  "joker",
];

export async function POST() {
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

  const shuffled = [...SEED_QUERIES].sort(() => Math.random() - 0.5).slice(0, 2);

  const tmdbIds: number[] = [];
  for (const query of shuffled) {
    try {
      const result = await searchMovies(query);
      const first = result.results[0];
      if (first) tmdbIds.push(first.id);
    } catch {
      // skip on failure
    }
  }

  if (tmdbIds.length === 0) {
    return Response.json(
      { error: "Impossible de récupérer des films TMDB" },
      { status: 502 },
    );
  }

  const rows = tmdbIds.map((tmdbId) => ({
    group_id: profile.group_id,
    tmdb_id: tmdbId,
    added_by_user_id: user.id,
  }));

  const { error } = await supabase
    .from("group_films")
    .upsert(rows, { onConflict: "group_id,tmdb_id" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ inserted: tmdbIds.length, tmdbIds });
}
