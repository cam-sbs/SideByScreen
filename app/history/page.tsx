import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMovieDetails } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

type HistoryEntry = {
  tmdbId: number;
  seenAt: string;
  title: string;
  posterPath: string | null;
  releaseYear: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export default async function HistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: tags, error } = await supabase
    .from("user_film_tags")
    .select("seen_at, group_films!inner(tmdb_id)")
    .eq("user_id", user.id)
    .eq("is_seen", true)
    .not("seen_at", "is", null)
    .order("seen_at", { ascending: false });

  const rows = (tags ?? []) as unknown as {
    seen_at: string;
    group_films: { tmdb_id: number };
  }[];

  const entries: HistoryEntry[] = await Promise.all(
    rows.map(async (row) => {
      try {
        const details = await getMovieDetails(row.group_films.tmdb_id);
        return {
          tmdbId: row.group_films.tmdb_id,
          seenAt: row.seen_at,
          title: details.title,
          posterPath: details.poster_path,
          releaseYear: details.release_date
            ? details.release_date.slice(0, 4)
            : null,
        };
      } catch {
        return {
          tmdbId: row.group_films.tmdb_id,
          seenAt: row.seen_at,
          title: `Film TMDB #${row.group_films.tmdb_id}`,
          posterPath: null,
          releaseYear: null,
        };
      }
    }),
  );

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <Link
            href="/profile"
            className="inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Profil
          </Link>
          <h1 className="text-2xl font-bold sm:text-3xl">
            Mes films vus
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {entries.length === 0
              ? "Aucun film marqué comme vu pour le moment."
              : `${entries.length} film${entries.length > 1 ? "s" : ""} marqué${entries.length > 1 ? "s" : ""} comme vu${entries.length > 1 ? "s" : ""}.`}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            Impossible de charger l&apos;historique : {error.message}
          </div>
        )}

        {entries.length > 0 && (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={`${entry.tmdbId}-${entry.seenAt}`}
                className="flex gap-4 rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="relative h-[108px] w-[72px] flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-900 sm:h-[135px] sm:w-[90px]">
                  {entry.posterPath ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${entry.posterPath}`}
                      alt={`Affiche de ${entry.title}`}
                      fill
                      sizes="(max-width: 640px) 72px, 90px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                      —
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <h2 className="truncate text-base font-semibold sm:text-lg">
                    {entry.title}
                    {entry.releaseYear && (
                      <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
                        ({entry.releaseYear})
                      </span>
                    )}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    Vu le {dateFormatter.format(new Date(entry.seenAt))}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
