import { Suspense } from "react";
import { cache } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getMovieDetails, type TMDBMovieDetails } from "@/lib/tmdb";
import { createClient } from "@/lib/supabase/server";
import { FilmSocial, type FilmSocialData } from "./FilmSocial";
import {
  FilmScreenings,
  type FilmScreeningsData,
  type ScreeningView,
  type ScreeningParticipantView,
} from "./FilmScreenings";
import { RetryButton } from "./RetryButton";
import type { ScreeningParticipantStatus } from "@/types/supabase";

type Props = {
  params: Promise<{ id: string }>;
};

// Per-request deduplication: both fetchFilmSocial and fetchFilmScreenings call
// this, and they now run concurrently — cache() ensures a single Supabase round-trip.
const fetchUserContext = cache(async (): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  groupId: string;
} | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.group_id) return null;
  return { supabase, userId: user.id, groupId: profile.group_id };
});

export default async function FilmPage({ params }: Props) {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (!Number.isInteger(movieId) || movieId < 1) {
    notFound();
  }

  // Kick off all three fetches in parallel before awaiting any of them.
  const moviePromise = getMovieDetails(movieId);
  const socialPromise = fetchFilmSocial(movieId);
  const screeningsPromise = fetchFilmScreenings(movieId);

  let movie: TMDBMovieDetails;
  try {
    movie = await moviePromise;
  } catch (error) {
    console.error("[film] getMovieDetails failed", error);
    return (
      <FilmShell>
        <div className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-400">
            Impossible de charger ce film pour le moment.
          </p>
          <RetryButton />
        </div>
      </FilmShell>
    );
  }

  const directors =
    movie.credits?.crew.filter((c) => c.job === "Director") ?? [];
  const cast = (movie.credits?.cast ?? [])
    .slice()
    .sort((a, b) => a.order - b.order)
    .slice(0, 6);

  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

  return (
    <div className="flex flex-1 flex-col">
      {movie.backdrop_path && (
        <div className="relative h-48 w-full sm:h-72 lg:h-96">
          <Image
            src={`https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent dark:from-zinc-950 dark:via-zinc-950/20" />
        </div>
      )}

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          ← Retour
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-10 sm:px-6 lg:flex-row lg:gap-10 lg:px-10">
        <div className="mx-auto w-48 flex-shrink-0 sm:w-64 lg:mx-0">
          <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-100 shadow-lg dark:bg-zinc-900">
            {movie.poster_path ? (
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                alt={`Affiche de ${movie.title}`}
                fill
                sizes="(max-width: 1024px) 192px, 256px"
                className="object-cover"
              />
            ) : (
              <PosterPlaceholder label="Pas d'affiche" />
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Social and screenings stream in from Supabase while movie info is already visible. */}
          <Suspense fallback={<FilmSocialSkeleton />}>
            <FilmSocialSection promise={socialPromise} movieTitle={movie.title} />
          </Suspense>
          <Suspense fallback={<FilmScreeningsSkeleton />}>
            <FilmScreeningsSection promise={screeningsPromise} />
          </Suspense>

          <div className="space-y-1">
            <h1 className="text-2xl font-bold sm:text-3xl">
              {movie.title}
              {year && (
                <span className="ml-2 font-normal text-zinc-500 dark:text-zinc-400">
                  ({year})
                </span>
              )}
            </h1>
            {movie.original_title &&
              movie.original_title !== movie.title && (
                <p className="text-sm italic text-zinc-500 dark:text-zinc-400">
                  Titre original : {movie.original_title}
                </p>
              )}
            {movie.tagline && (
              <p className="text-sm italic text-zinc-600 dark:text-zinc-300">
                « {movie.tagline} »
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-600 dark:text-zinc-300">
            <span
              className="inline-flex items-center gap-1"
              title={`${movie.vote_count} votes`}
            >
              <span aria-hidden>★</span>
              <span className="font-semibold">
                {movie.vote_average.toFixed(1)}
              </span>
              <span className="text-zinc-400">/10</span>
            </span>
            {movie.runtime > 0 && (
              <span>{formatRuntime(movie.runtime)}</span>
            )}
            {movie.original_language && (
              <span className="uppercase">
                {movie.original_language}
              </span>
            )}
          </div>

          {movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {movie.genres.map((g) => (
                <span
                  key={g.id}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs dark:border-zinc-800"
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {directors.length > 0 && (
            <p className="text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">
                {directors.length > 1 ? "Réalisateurs : " : "Réalisateur : "}
              </span>
              <span className="font-medium">
                {directors.map((d) => d.name).join(", ")}
              </span>
            </p>
          )}

          {movie.overview && (
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Synopsis
              </h2>
              <p className="text-sm leading-relaxed sm:text-base">
                {movie.overview}
              </p>
            </div>
          )}

          {cast.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                Casting
              </h2>
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cast.map((actor) => (
                  <li
                    key={actor.id}
                    className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
                  >
                    <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900">
                      {actor.profile_path ? (
                        <Image
                          src={`https://image.tmdb.org/t/p/w185${actor.profile_path}`}
                          alt=""
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {actor.name}
                      </p>
                      {actor.character && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {actor.character}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Async server components that await the pre-started promises.
// They suspend inside their Suspense boundaries while Supabase responds.

async function FilmSocialSection({
  promise,
  movieTitle,
}: {
  promise: Promise<FilmSocialData | null>;
  movieTitle: string;
}) {
  const social = await promise;
  if (!social) return null;
  return <FilmSocial data={social} movieTitle={movieTitle} />;
}

async function FilmScreeningsSection({
  promise,
}: {
  promise: Promise<FilmScreeningsData | null>;
}) {
  const screenings = await promise;
  if (!screenings) return null;
  return <FilmScreenings data={screenings} />;
}

function FilmSocialSkeleton() {
  return (
    <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  );
}

function FilmScreeningsSkeleton() {
  return (
    <div className="h-20 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900" />
  );
}

async function fetchFilmSocial(tmdbId: number): Promise<FilmSocialData | null> {
  const ctx = await fetchUserContext();
  if (!ctx) return null;
  const { supabase, userId, groupId } = ctx;

  const { data: filmRow } = await supabase
    .from("group_films")
    .select(
      "id, added_at, screen_status, theatrical_release_date, salon_override, added_by:users!group_films_added_by_user_id_fkey(id, name, avatar_url)",
    )
    .eq("group_id", groupId)
    .eq("tmdb_id", tmdbId)
    .eq("visible", true)
    .maybeSingle();

  if (!filmRow) return null;

  const film = filmRow as unknown as {
    id: string;
    added_at: string;
    screen_status: "in_theaters" | "coming_soon" | "salon" | "unknown";
    theatrical_release_date: string | null;
    salon_override: boolean;
    added_by: { id: string; name: string; avatar_url: string | null } | null;
  };

  const { count: memberCount } = await supabase
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("group_id", groupId);

  const { data: tagsData } = await supabase
    .from("user_film_tags")
    .select(
      "user_id, is_seen, is_tagged, is_wished, watched_together_at, user:users!user_film_tags_user_id_fkey(id, name, avatar_url)",
    )
    .eq("group_film_id", film.id);

  const tags = (tagsData ?? []) as unknown as {
    user_id: string;
    is_seen: boolean;
    is_tagged: boolean;
    is_wished: boolean;
    watched_together_at: string | null;
    user: { id: string; name: string; avatar_url: string | null } | null;
  }[];

  const taggedMembers = tags
    .filter((t) => t.is_tagged && t.user)
    .map((t) => ({
      id: t.user!.id,
      name: t.user!.name,
      avatarUrl: t.user!.avatar_url,
    }));
  const taggedByMe = tags.some((t) => t.user_id === userId && t.is_tagged);
  const seenByMe = tags.some((t) => t.user_id === userId && t.is_seen);
  const wishedByMe = tags.some((t) => t.user_id === userId && t.is_wished);
  const watchedTogetherByMe = tags.some(
    (t) => t.user_id === userId && t.watched_together_at !== null,
  );
  const watchedTogetherMembers = tags
    .filter((t) => t.is_tagged && t.watched_together_at !== null && t.user)
    .map((t) => ({
      id: t.user!.id,
      name: t.user!.name,
      avatarUrl: t.user!.avatar_url,
    }));

  return {
    groupFilmId: film.id,
    addedBy: film.added_by
      ? {
          id: film.added_by.id,
          name: film.added_by.name,
          avatarUrl: film.added_by.avatar_url,
        }
      : null,
    addedAt: film.added_at,
    taggedMembers,
    taggedByMe,
    seenByMe,
    wishedByMe,
    watchedTogetherByMe,
    watchedTogetherMembers,
    totalMembers: memberCount ?? 0,
    // Use theatrical_release_date from DB — no TMDB dependency, enables parallel fetch.
    urgency: computeUrgency(film.theatrical_release_date),
    screenStatus: film.screen_status,
    theatricalReleaseDate: film.theatrical_release_date,
  };
}

async function fetchFilmScreenings(
  tmdbId: number,
): Promise<FilmScreeningsData | null> {
  const ctx = await fetchUserContext();
  if (!ctx) return null;
  const { supabase, userId, groupId } = ctx;

  const { data: filmRow } = await supabase
    .from("group_films")
    .select("id")
    .eq("group_id", groupId)
    .eq("tmdb_id", tmdbId)
    .maybeSingle();
  if (!filmRow) return null;

  const [membersRes, screeningsRes] = await Promise.all([
    supabase
      .from("users")
      .select("id, name, avatar_url")
      .eq("group_id", groupId)
      .order("name"),
    supabase
      .from("film_screenings")
      .select(
        "id, scheduled_at, scheduled_by_user_id, participants:screening_participants!screening_participants_screening_id_fkey(user_id, status, user:users!screening_participants_user_id_fkey(id, name, avatar_url))",
      )
      .eq("group_film_id", filmRow.id)
      .order("scheduled_at", { ascending: true }),
  ]);

  const groupMembers = (membersRes.data ?? []).map((m) => ({
    id: m.id as string,
    name: m.name as string,
    avatarUrl: (m.avatar_url as string | null) ?? null,
  }));

  const rows = (screeningsRes.data ?? []) as unknown as {
    id: string;
    scheduled_at: string;
    scheduled_by_user_id: string;
    participants: {
      user_id: string;
      status: ScreeningParticipantStatus;
      user: { id: string; name: string; avatar_url: string | null } | null;
    }[];
  }[];

  const screenings: ScreeningView[] = rows.map((s) => {
    const participants: ScreeningParticipantView[] = s.participants
      .filter((p) => p.user)
      .map((p) => ({
        id: p.user!.id,
        name: p.user!.name,
        avatarUrl: p.user!.avatar_url,
        status: p.status,
      }));
    const mine = s.participants.find((p) => p.user_id === userId);
    return {
      id: s.id,
      scheduledAt: s.scheduled_at,
      organizerId: s.scheduled_by_user_id,
      myStatus: mine ? mine.status : null,
      participants,
    };
  });

  return {
    groupFilmId: filmRow.id,
    currentUserId: userId,
    groupMembers,
    screenings,
  };
}

function computeUrgency(
  releaseDate: string | null,
): { level: "orange" | "red"; label: string } | null {
  if (!releaseDate) return null;
  const release = new Date(releaseDate);
  if (Number.isNaN(release.getTime())) return null;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 14) return null;
  if (diffDays <= 21) {
    return { level: "orange", label: "À voir rapidement" };
  }
  return { level: "red", label: "Risque de quitter les salles" };
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m.toString().padStart(2, "0")}`;
}

function PosterPlaceholder({ label }: { label?: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-zinc-300 dark:text-zinc-700">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="2" y="2" width="20" height="20" rx="2" />
        <line x1="7" y1="2" x2="7" y2="22" />
        <line x1="17" y1="2" x2="17" y2="22" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <line x1="2" y1="7" x2="7" y2="7" />
        <line x1="2" y1="17" x2="7" y2="17" />
        <line x1="17" y1="7" x2="22" y2="7" />
        <line x1="17" y1="17" x2="22" y2="17" />
      </svg>
      {label && (
        <span className="text-xs text-zinc-400 dark:text-zinc-600">{label}</span>
      )}
    </div>
  );
}

function FilmShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        ← Retour
      </Link>
      {children}
    </div>
  );
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const movieId = parseInt(id, 10);
  if (!Number.isInteger(movieId) || movieId < 1) {
    return { title: "Film introuvable" };
  }
  try {
    const movie = await getMovieDetails(movieId);
    return {
      title: movie.title,
      description: movie.overview || undefined,
    };
  } catch {
    return { title: "Film" };
  }
}
