"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import type {
  GroupFilmCard,
  GroupFilmMember,
} from "./api/group/films/route";

async function fetchFilms(): Promise<GroupFilmCard[]> {
  const res = await fetch("/api/group/films", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Impossible de charger les films");
  }
  const payload = (await res.json()) as { films: GroupFilmCard[] };
  return payload.films;
}

export function FilmsGrid() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["group-films"],
    queryFn: fetchFilms,
  });

  if (isPending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-48 animate-pulse rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 sm:h-80"
          />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        {error instanceof Error ? error.message : "Erreur inconnue"}
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Aucun film dans votre groupe pour le moment.
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {data.map((film) => (
        <li key={film.id}>
          <FilmCard film={film} />
        </li>
      ))}
    </ul>
  );
}

function FilmCard({ film }: { film: GroupFilmCard }) {
  return (
    <Link
      href={`/film/${film.tmdbId}`}
      className={`group relative flex gap-3 overflow-hidden rounded-lg border bg-white transition-colors sm:flex-col sm:gap-0 dark:bg-zinc-950 ${
        film.isConsensus
          ? "border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.35)] hover:border-amber-500 dark:border-amber-500/70"
          : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
      }`}
    >
      <div className="relative aspect-[2/3] w-24 flex-shrink-0 bg-zinc-100 dark:bg-zinc-900 sm:w-full">
        {film.posterPath ? (
          <Image
            src={`https://image.tmdb.org/t/p/w342${film.posterPath}`}
            alt={`Affiche de ${film.title}`}
            fill
            sizes="(max-width: 640px) 96px, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
            —
          </div>
        )}

        {film.isConsensus && (
          <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-900 shadow">
            Consensus
          </span>
        )}
        {film.seenByMe && (
          <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
            Vu
          </span>
        )}
        <UrgencyBadge releaseDate={film.releaseDate} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">
          {film.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {film.addedBy ? (
            <div
              className="flex items-center gap-1.5"
              title={`Ajouté par ${film.addedBy.name}`}
            >
              <MemberAvatar member={film.addedBy} size={24} />
              <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {film.addedBy.name}
              </span>
            </div>
          ) : (
            <span />
          )}

          {film.taggedMembers.length > 0 && (
            <AvatarStack members={film.taggedMembers} />
          )}
        </div>
      </div>
    </Link>
  );
}

function getUrgency(
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

function UrgencyBadge({ releaseDate }: { releaseDate: string | null }) {
  const urgency = getUrgency(releaseDate);
  if (!urgency) return null;
  const color =
    urgency.level === "orange"
      ? "bg-orange-500"
      : "bg-red-600";
  return (
    <span
      title={urgency.label}
      aria-label={urgency.label}
      className={`absolute left-2 top-2 h-3 w-3 rounded-full ${color} shadow ring-2 ring-white dark:ring-zinc-950`}
    />
  );
}

function AvatarStack({ members }: { members: GroupFilmMember[] }) {
  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;

  return (
    <div
      className="flex -space-x-2"
      title={`Positionnés : ${members.map((m) => m.name).join(", ")}`}
    >
      {visible.map((m) => (
        <MemberAvatar key={m.id} member={m} size={24} bordered />
      ))}
      {extra > 0 && (
        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:border-zinc-950 dark:bg-zinc-700 dark:text-zinc-200">
          +{extra}
        </span>
      )}
    </div>
  );
}

function MemberAvatar({
  member,
  size,
  bordered = false,
}: {
  member: GroupFilmMember;
  size: number;
  bordered?: boolean;
}) {
  const initials = getInitials(member.name);
  const borderClass = bordered
    ? "border-2 border-white dark:border-zinc-950"
    : "";
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 ${borderClass}`}
    >
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt={`Avatar de ${member.name}`}
          className="h-full w-full object-cover"
        />
      ) : (
        initials
      )}
    </span>
  );
}

function getInitials(source: string): string {
  const clean = source.trim();
  if (!clean) return "?";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}
