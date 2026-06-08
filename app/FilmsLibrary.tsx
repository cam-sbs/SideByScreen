"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { GroupFilmCard } from "./api/group/films/route";
import { TabSwitcher } from "@/components/ui/TabSwitcher";
import { FilmCardRow } from "@/components/ui/FilmCardRow";
import { TmdbSearchBar } from "./TmdbSearchBar";
import type { MemberInterest } from "@/components/ui/MemberAvatarRow";

async function fetchFilms(): Promise<GroupFilmCard[]> {
  const res = await fetch("/api/group/films", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger les films");
  const payload = (await res.json()) as { films: GroupFilmCard[] };
  return payload.films;
}

function isCinemaFilm(film: GroupFilmCard): boolean {
  return (
    !film.salonOverride &&
    (film.screenStatus === "in_theaters" ||
      film.screenStatus === "coming_soon" ||
      film.screenStatus === "unknown")
  );
}

function isSalonFilm(film: GroupFilmCard): boolean {
  return film.screenStatus === "salon" || film.salonOverride;
}

function urgencyRank(theatricalReleaseDate: string | null): 0 | 1 | 2 {
  if (!theatricalReleaseDate) return 2;
  const release = new Date(theatricalReleaseDate);
  if (Number.isNaN(release.getTime())) return 2;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 21) return 0;
  if (diffDays >= 14) return 1;
  return 2;
}

function cinemaUrgencyRank(film: GroupFilmCard): number {
  if (film.screenStatus === "in_theaters") return urgencyRank(film.theatricalReleaseDate);
  if (film.screenStatus === "coming_soon") return 3;
  return 4;
}

function sortCinema(films: GroupFilmCard[]): GroupFilmCard[] {
  const consensus = films.filter((f) => f.isConsensus);
  const rest = films.filter((f) => !f.isConsensus);
  const sortFn = (a: GroupFilmCard, b: GroupFilmCard) => {
    const rankDiff = cinemaUrgencyRank(a) - cinemaUrgencyRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  };
  return [...consensus.sort(sortFn), ...rest.sort(sortFn)];
}

function sortSalon(films: GroupFilmCard[]): GroupFilmCard[] {
  return [...films].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );
}

function toInterests(film: GroupFilmCard, currentUserId: string): MemberInterest[] {
  return film.taggedMembers.map((m) => ({
    member: m,
    isTagged: true,
    isFavorite: film.wishedByMe && m.id === currentUserId,
  }));
}

// ——— Icons ———


function MagnifyingGlassIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function XMarkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function AdjustmentsHorizontalIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18M7 12h10M10 18h4" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FilmIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="2" />
      <line x1="7" y1="2" x2="7" y2="22" />
      <line x1="17" y1="2" x2="17" y2="22" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <line x1="2" y1="7" x2="7" y2="7" />
      <line x1="2" y1="17" x2="7" y2="17" />
      <line x1="17" y1="7" x2="22" y2="7" />
      <line x1="17" y1="17" x2="22" y2="17" />
    </svg>
  );
}

// ——— Empty states ———

function EmptyCinemaState() {
  return (
    <div className="flex flex-col items-center text-center px-8 py-16">
      <span className="text-dust-2 mb-4">
        <FilmIcon />
      </span>
      <p className="font-serif italic text-xl text-fog mb-2">La liste est vide</p>
      <p className="text-sm text-dust leading-relaxed">
        C&apos;est à vous de la remplir.<br />
        Quel film vous a fait de l&apos;œil dernièrement ?
      </p>
    </div>
  );
}

function EmptySalonState() {
  return (
    <p className="text-center text-sm text-dust py-16">
      Aucun film pour le canapé pour le moment.
    </p>
  );
}

// ——— Main component ———

type FilmsLibraryProps = {
  groupName: string;
  currentUserId: string;
};

export function FilmsLibrary({ groupName, currentUserId }: FilmsLibraryProps) {
  const [activeTab, setActiveTab] = useState<"cinema" | "canape">("cinema");
  const [searchQuery, setSearchQuery] = useState("");
  const [tmdbSearchOpen, setTmdbSearchOpen] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["group-films"],
    queryFn: fetchFilms,
  });

  const filteredFilms = useMemo(() => {
    if (!data) return [];
    const tabFiltered =
      activeTab === "cinema"
        ? data.filter(isCinemaFilm)
        : data.filter(isSalonFilm);

    const searched =
      searchQuery.trim() === ""
        ? tabFiltered
        : tabFiltered.filter((f) =>
            f.title.toLowerCase().includes(searchQuery.toLowerCase()),
          );

    return activeTab === "cinema" ? sortCinema(searched) : sortSalon(searched);
  }, [data, activeTab, searchQuery]);

  if (isPending) {
    return (
      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-32 bg-ink-3 animate-pulse rounded-lg" />
        </div>
        <div className="mx-0 mb-4 h-11 bg-ink-3 animate-pulse rounded-xl" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-ink-3 animate-pulse rounded-xl h-[180px] mb-3" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="px-4 pt-4">
        <div className="flex flex-col items-start gap-3 rounded-lg border border-urgent/20 bg-urgent-dim p-4">
          <p className="text-sm text-urgent">
            {error instanceof Error ? error.message : "Erreur inconnue"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-full border border-urgent/30 px-4 py-1.5 text-sm font-medium text-urgent hover:border-urgent/50"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  const isSearching = searchQuery.trim() !== "";
  const hasNoResults = isSearching && filteredFilms.length === 0;

  return (
    <>
      {/* Group name */}
      <div className="px-4 pt-4 pb-3">
        <h1 className="font-serif text-4xl text-fog">{groupName}</h1>
      </div>

      {/* Tab switcher */}
      <TabSwitcher activeTab={activeTab} onChange={setActiveTab} />

      {/* Search + filters */}
      <div className="flex gap-2 px-4 mb-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-dust-2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher dans la liste…"
            className="w-full bg-ink-2 border border-white/8 rounded-full pl-10 pr-4 py-3 text-sm text-fog placeholder:text-dust-2 placeholder:font-light outline-none hover:border-white/13 focus:border-white/22 transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-dust-2 hover:text-dust transition-colors"
              aria-label="Effacer la recherche"
            >
              <XMarkIcon />
            </button>
          )}
        </div>
        <button
          type="button"
          className="flex items-center justify-center w-12 h-12 bg-ink-2 border border-white/8 rounded-full text-dust hover:text-fog hover:border-white/14 transition-all shrink-0"
          aria-label="Filtres"
        >
          <AdjustmentsHorizontalIcon />
        </button>
      </div>

      {/* Film list */}
      <div className="px-4 pb-24">
        {hasNoResults ? (
          <p className="text-center text-sm text-dust py-10">
            Pas de résultat pour « {searchQuery} »
            <br />
            <span className="text-dust-2 text-xs">
              Essayez le titre original ou un autre mot-clé.
            </span>
          </p>
        ) : filteredFilms.length === 0 ? (
          activeTab === "cinema" ? (
            <EmptyCinemaState />
          ) : (
            <EmptySalonState />
          )
        ) : (
          filteredFilms.map((film, i) => (
            <FilmCardRow
              key={film.id}
              film={film}
              interests={toInterests(film, currentUserId)}
              priority={i === 0}
            />
          ))
        )}
      </div>

      {/* Sticky add button */}
      <div className="fixed bottom-0 inset-x-0 z-50 px-4 pb-[env(safe-area-inset-bottom)] pt-3 bg-gradient-to-t from-ink via-ink/80 to-transparent">
        <button
          type="button"
          onClick={() => setTmdbSearchOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-sage text-white font-medium text-md rounded-full py-4 hover:bg-sage-light active:scale-[0.98] transition-all duration-200"
        >
          <PlusIcon />
          Ajouter un film
        </button>
      </div>

      {/* TMDB Search overlay */}
      {tmdbSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-ink flex flex-col">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h2 className="text-md font-medium text-fog">Ajouter un film</h2>
            <button
              type="button"
              onClick={() => setTmdbSearchOpen(false)}
              className="text-dust hover:text-fog transition-colors p-1"
              aria-label="Fermer"
            >
              <XMarkIcon size={20} />
            </button>
          </div>
          <TmdbSearchBar />
        </div>
      )}
    </>
  );
}
