"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

type SeenFilter = "unseen" | "seen" | "all";
type PlannedFilter = "any" | "planned" | "not-planned";
type PositioningFilter =
  | { kind: "any" }
  | { kind: "me" }
  | { kind: "member"; memberId: string };
type SortKey =
  | "default"
  | "release-desc"
  | "release-asc"
  | "added-desc"
  | "added-asc";

type Filters = {
  seen: SeenFilter;
  positioning: PositioningFilter;
  genreId: number | null;
  screenSection: "all" | "in_theaters" | "coming_soon" | "salon";
  consensusOnly: boolean;
  planned: PlannedFilter;
  sort: SortKey;
};

const DEFAULT_FILTERS: Filters = {
  seen: "unseen",
  positioning: { kind: "any" },
  genreId: null,
  screenSection: "all",
  consensusOnly: false,
  planned: "any",
  sort: "default",
};

// 0 = red (most urgent), 1 = orange, 2 = no urgency
function urgencyRank(theatricalReleaseDate: string | null): 0 | 1 | 2 {
  if (!theatricalReleaseDate) return 2;
  const release = new Date(theatricalReleaseDate);
  if (Number.isNaN(release.getTime())) return 2;
  const diffDays = (Date.now() - release.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays > 21) return 0;
  if (diffDays >= 14) return 1;
  return 2;
}

function cinemaSortRank(film: GroupFilmCard): number {
  if (film.screenStatus === "in_theaters") return urgencyRank(film.theatricalReleaseDate);
  if (film.screenStatus === "coming_soon") return 3;
  return 4; // unknown
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

function applyBaseFilters(films: GroupFilmCard[], filters: Filters): GroupFilmCard[] {
  return films.filter((film) => {
    if (filters.seen === "unseen" && film.seenByMe) return false;
    if (filters.seen === "seen" && !film.seenByMe) return false;
    if (filters.positioning.kind === "me" && !film.taggedByMe) return false;
    if (filters.positioning.kind === "member") {
      const memberId = filters.positioning.memberId;
      if (!film.taggedMembers.some((m) => m.id === memberId)) return false;
    }
    if (
      filters.genreId !== null &&
      !film.genres.some((g) => g.id === filters.genreId)
    ) {
      return false;
    }
    if (filters.consensusOnly && !film.isConsensus) return false;
    if (filters.planned === "planned" && !film.plannedByMe) return false;
    if (filters.planned === "not-planned" && film.plannedByMe) return false;
    return true;
  });
}

function sortCinema(films: GroupFilmCard[], sort: SortKey): GroupFilmCard[] {
  if (sort !== "default") return sortBySortKey(films, sort);
  const consensus = films.filter((f) => f.isConsensus);
  const rest = films.filter((f) => !f.isConsensus);
  const sortFn = (a: GroupFilmCard, b: GroupFilmCard) => {
    const rankDiff = cinemaSortRank(a) - cinemaSortRank(b);
    if (rankDiff !== 0) return rankDiff;
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  };
  return [...consensus.sort(sortFn), ...rest.sort(sortFn)];
}

function sortSalon(films: GroupFilmCard[], sort: SortKey): GroupFilmCard[] {
  if (sort !== "default") return sortBySortKey(films, sort);
  return [...films].sort(
    (a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime(),
  );
}

function sortBySortKey(films: GroupFilmCard[], sort: SortKey): GroupFilmCard[] {
  const copy = [...films];
  copy.sort((a, b) => {
    switch (sort) {
      case "release-desc":
        return timestamp(b.releaseDate, -Infinity) - timestamp(a.releaseDate, -Infinity);
      case "release-asc":
        return timestamp(a.releaseDate, Infinity) - timestamp(b.releaseDate, Infinity);
      case "added-desc":
        return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
      case "added-asc":
        return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
      default:
        return 0;
    }
  });
  return copy;
}

function timestamp(date: string | null, fallback: number): number {
  if (!date) return fallback;
  const t = new Date(date).getTime();
  return Number.isNaN(t) ? fallback : t;
}

function countActiveFilters(f: Filters): number {
  let n = 0;
  if (f.seen !== DEFAULT_FILTERS.seen) n++;
  if (f.positioning.kind !== "any") n++;
  if (f.genreId !== null) n++;
  if (f.screenSection !== "all") n++;
  if (f.consensusOnly) n++;
  if (f.planned !== DEFAULT_FILTERS.planned) n++;
  return n;
}

export function FilmsGrid() {
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["group-films"],
    queryFn: fetchFilms,
  });

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [salonCollapsed, setSalonCollapsed] = useState(true);

  const { members, genres } = useMemo(() => {
    const memberMap = new Map<string, GroupFilmMember>();
    const genreMap = new Map<number, string>();
    for (const film of data ?? []) {
      for (const m of film.taggedMembers) memberMap.set(m.id, m);
      if (film.addedBy) memberMap.set(film.addedBy.id, film.addedBy);
      for (const g of film.genres) genreMap.set(g.id, g.name);
    }
    return {
      members: Array.from(memberMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      genres: Array.from(genreMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [data]);

  const { cinemaFilms, salonFilms } = useMemo(() => {
    if (!data) return { cinemaFilms: [], salonFilms: [] };

    const base = applyBaseFilters(data, filters);

    let cinema = base.filter(isCinemaFilm);
    let salon = base.filter(isSalonFilm);

    if (filters.screenSection === "in_theaters") {
      cinema = cinema.filter((f) => f.screenStatus === "in_theaters");
      salon = [];
    } else if (filters.screenSection === "coming_soon") {
      cinema = cinema.filter((f) => f.screenStatus === "coming_soon");
      salon = [];
    } else if (filters.screenSection === "salon") {
      cinema = [];
    }

    return {
      cinemaFilms: sortCinema(cinema, filters.sort),
      salonFilms: sortSalon(salon, filters.sort),
    };
  }, [data, filters]);

  const activeCount = countActiveFilters(filters);
  const totalVisible = cinemaFilms.length + salonFilms.length;

  if (isPending) {
    return (
      <div
        role="status"
        aria-label="Chargement des films"
        aria-live="polite"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      >
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950 sm:flex-col sm:gap-0"
          >
            <div className="relative aspect-[2/3] w-24 flex-shrink-0 animate-pulse bg-zinc-200 dark:bg-zinc-800 sm:w-full" />
            <div className="flex flex-1 flex-col justify-between gap-2 p-3">
              <div className="space-y-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <div className="flex items-center justify-between">
                <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
                <div className="flex -space-x-1.5">
                  <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-950" />
                  <div className="h-6 w-6 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800 ring-2 ring-white dark:ring-zinc-950" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <p className="text-sm text-red-700 dark:text-red-400">
          {error instanceof Error ? error.message : "Erreur inconnue"}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-full border border-red-300 px-4 py-1.5 text-sm font-medium text-red-700 hover:border-red-500 hover:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:border-red-500 dark:hover:bg-red-900"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  return (
    <div className="space-y-4">
      <FiltersBar
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          if (f.screenSection === "salon") setSalonCollapsed(false);
        }}
        members={members}
        genres={genres}
        activeCount={activeCount}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />

      <QuickFilterChips
        filters={filters}
        onChange={(f) => {
          setFilters(f);
          if (f.screenSection === "salon") setSalonCollapsed(false);
        }}
      />

      {isEmpty ? (
        <EmptyLibrary />
      ) : totalVisible === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Aucun film ne correspond aux filtres.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Cinéma section */}
          {(cinemaFilms.length > 0 || filters.screenSection !== "salon") && (
            <div className="space-y-3">
              <SectionHeader
                icon="🎬"
                label="Au cinéma"
                count={cinemaFilms.length}
              />
              {cinemaFilms.length === 0 ? (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Aucun film en salle pour le moment.
                </p>
              ) : (
                <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {cinemaFilms.map((film) => (
                    <li key={film.id}>
                      <FilmCard film={film} showUrgency />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Salon section */}
          {(salonFilms.length > 0 || filters.screenSection === "salon") && (
            <div className="space-y-3">
              <SectionHeader
                icon="🛋️"
                label="À regarder à la maison"
                count={salonFilms.length}
                collapsible
                collapsed={salonCollapsed && salonFilms.length > 0}
                onToggle={() => setSalonCollapsed((v) => !v)}
              />
              {!salonCollapsed && salonFilms.length > 0 && (
                <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {salonFilms.map((film) => (
                    <li key={film.id}>
                      <FilmCard film={film} showUrgency={false} />
                    </li>
                  ))}
                </ul>
              )}
              {!salonCollapsed && salonFilms.length === 0 && (
                <p className="text-sm text-zinc-400 dark:text-zinc-500">
                  Aucun film dans cette section.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({
  icon,
  label,
  count,
  collapsible = false,
  collapsed = false,
  onToggle,
}: {
  icon: string;
  label: string;
  count: number;
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="text-base">
        {icon}
      </span>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </h2>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
        {count}
      </span>
      {collapsible && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          aria-expanded={!collapsed}
        >
          {collapsed ? "Afficher" : "Masquer"}
          <span aria-hidden className="text-[10px]">
            {collapsed ? "▶" : "▼"}
          </span>
        </button>
      )}
    </div>
  );
}

function QuickFilterChips({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  type Chip = {
    label: string;
    active: boolean;
    onClick: () => void;
  };

  const chips: Chip[] = [
    {
      label: "Tous",
      active: filters.screenSection === "all" && !filters.consensusOnly,
      onClick: () =>
        onChange({ ...DEFAULT_FILTERS, seen: filters.seen, sort: filters.sort }),
    },
    {
      label: "Au cinéma",
      active: filters.screenSection === "in_theaters",
      onClick: () => onChange({ ...filters, screenSection: "in_theaters", consensusOnly: false }),
    },
    {
      label: "À venir",
      active: filters.screenSection === "coming_soon",
      onClick: () => onChange({ ...filters, screenSection: "coming_soon", consensusOnly: false }),
    },
    {
      label: "À la maison",
      active: filters.screenSection === "salon",
      onClick: () => onChange({ ...filters, screenSection: "salon", consensusOnly: false }),
    },
    {
      label: "Tout le groupe ✦",
      active: filters.consensusOnly,
      onClick: () =>
        onChange({ ...filters, consensusOnly: !filters.consensusOnly, screenSection: "all" }),
    },
    {
      label: "Non vus",
      active: filters.seen === "unseen" && filters.screenSection === "all" && !filters.consensusOnly,
      onClick: () =>
        onChange({ ...DEFAULT_FILTERS, seen: "unseen", sort: filters.sort }),
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={chip.onClick}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            chip.active
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-200 text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-600"
          }`}
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

function FiltersBar({
  filters,
  onChange,
  members,
  genres,
  activeCount,
  drawerOpen,
  setDrawerOpen,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  members: GroupFilmMember[];
  genres: { id: number; name: string }[];
  activeCount: number;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2 sm:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
        >
          Filtres avancés
          {activeCount > 0 && (
            <span className="rounded-full bg-zinc-900 px-1.5 text-xs font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {activeCount}
            </span>
          )}
        </button>
        <SortSelect
          value={filters.sort}
          onChange={(sort) => onChange({ ...filters, sort })}
        />
      </div>

      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <FilterControls
          filters={filters}
          onChange={onChange}
          members={members}
          genres={genres}
        />
      </div>

      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-zinc-950">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Filtres avancés</h2>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800"
              >
                Fermer
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <FilterControls
                filters={filters}
                onChange={onChange}
                members={members}
                genres={genres}
              />
              <button
                type="button"
                onClick={() => onChange(DEFAULT_FILTERS)}
                className="mt-2 text-sm text-zinc-500 underline dark:text-zinc-400"
              >
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterControls({
  filters,
  onChange,
  members,
  genres,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  members: GroupFilmMember[];
  genres: { id: number; name: string }[];
}) {
  const positioningValue =
    filters.positioning.kind === "any"
      ? "any"
      : filters.positioning.kind === "me"
        ? "me"
        : `member:${filters.positioning.memberId}`;

  return (
    <>
      <LabeledSelect
        label="Statut"
        value={filters.seen}
        onChange={(v) => onChange({ ...filters, seen: v as SeenFilter })}
        options={[
          { value: "unseen", label: "Non vus" },
          { value: "seen", label: "Vus" },
          { value: "all", label: "Tous" },
        ]}
      />
      <LabeledSelect
        label="Intérêt"
        value={positioningValue}
        onChange={(v) => {
          if (v === "any") onChange({ ...filters, positioning: { kind: "any" } });
          else if (v === "me") onChange({ ...filters, positioning: { kind: "me" } });
          else {
            const memberId = v.slice("member:".length);
            onChange({
              ...filters,
              positioning: { kind: "member", memberId },
            });
          }
        }}
        options={[
          { value: "any", label: "Tous" },
          { value: "me", label: "Où je suis intéressé·e" },
          ...members.map((m) => ({
            value: `member:${m.id}`,
            label: `Intérêts de ${m.name}`,
          })),
        ]}
      />
      <LabeledSelect
        label="Genre"
        value={filters.genreId === null ? "all" : String(filters.genreId)}
        onChange={(v) =>
          onChange({
            ...filters,
            genreId: v === "all" ? null : Number(v),
          })
        }
        options={[
          { value: "all", label: "Tous" },
          ...genres.map((g) => ({ value: String(g.id), label: g.name })),
        ]}
      />
      <LabeledSelect
        label="Planifié"
        value={filters.planned}
        onChange={(v) =>
          onChange({ ...filters, planned: v as PlannedFilter })
        }
        options={[
          { value: "any", label: "Tous" },
          { value: "planned", label: "Planifiés" },
          { value: "not-planned", label: "Non planifiés" },
        ]}
      />
      <div className="sm:ml-auto">
        <SortSelect
          value={filters.sort}
          onChange={(sort) => onChange({ ...filters, sort })}
        />
      </div>
    </>
  );
}

function SortSelect({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <LabeledSelect
      label="Tri"
      value={value}
      onChange={(v) => onChange(v as SortKey)}
      options={[
        { value: "default", label: "Par défaut" },
        { value: "release-desc", label: "Sortie (récent)" },
        { value: "release-asc", label: "Sortie (ancien)" },
        { value: "added-desc", label: "Ajout (récent)" },
        { value: "added-asc", label: "Ajout (ancien)" },
      ]}
    />
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1 text-sm dark:border-zinc-800">
      <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-transparent focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function getUrgencyLevel(
  film: GroupFilmCard,
): { level: "red" | "orange"; color: string } | null {
  if (film.screenStatus !== "in_theaters") return null;
  const rank = urgencyRank(film.theatricalReleaseDate);
  if (rank === 0) return { level: "red", color: "#D94F4F" };
  if (rank === 1) return { level: "orange", color: "#D4893A" };
  return null;
}

function formatComingSoon(date: string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
  });
}

function FilmCard({
  film,
  showUrgency,
}: {
  film: GroupFilmCard;
  showUrgency: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const queryClient = useQueryClient();

  const screenStatusMutation = useMutation({
    mutationFn: async (action: "move_to_salon" | "restore_to_cinema") => {
      const res = await fetch(`/api/group/films/${film.id}/screen-status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Erreur");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
    },
    onSettled: () => setMenuOpen(false),
  });

  const urgency = showUrgency ? getUrgencyLevel(film) : null;

  const borderStyle = urgency
    ? {
        borderLeftWidth: 3,
        borderLeftColor: urgency.color,
        borderLeftStyle: "solid" as const,
      }
    : undefined;

  return (
    <div className="relative">
      <Link
        href={`/film/${film.tmdbId}`}
        style={borderStyle}
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
            <FilmPosterPlaceholder />
          )}

          {film.isConsensus && (
            <span className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-900 shadow">
              Tout le groupe ✦
            </span>
          )}
          {film.seenByMe && (
            <span className="absolute right-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white shadow">
              Vu
            </span>
          )}
          {film.plannedByMe && !film.seenByMe && (
            <span
              title="Séance planifiée"
              aria-label="Séance planifiée"
              className="absolute bottom-2 left-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
            >
              📅 Planifié
            </span>
          )}
          {film.wishedByMe && !film.seenByMe && (
            <span
              title="Dans mes souhaits"
              aria-label="Dans mes souhaits"
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-xs font-semibold text-white shadow ring-2 ring-white dark:ring-zinc-950"
            >
              ♥
            </span>
          )}

          {/* Coming soon badge */}
          {film.screenStatus === "coming_soon" && film.theatricalReleaseDate && (
            <span className="absolute bottom-2 left-2 rounded-full bg-blue-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow">
              Sort le {formatComingSoon(film.theatricalReleaseDate)}
            </span>
          )}

          {/* Urgency dot for in_theaters (legacy compat) */}
          {urgency && (
            <span
              title={urgency.level === "red" ? "Risque de quitter les salles" : "À voir rapidement"}
              aria-label={urgency.level === "red" ? "Risque de quitter les salles" : "À voir rapidement"}
              className="absolute left-2 top-2 h-3 w-3 rounded-full shadow ring-2 ring-white dark:ring-zinc-950"
              style={{ backgroundColor: urgency.color }}
            />
          )}
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

      {/* Context menu button */}
      <div className="absolute bottom-2 right-2">
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs text-zinc-500 shadow hover:bg-white hover:text-zinc-900 dark:bg-zinc-900/80 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          title="Options"
          aria-label="Options du film"
        >
          ⋯
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-20"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute bottom-8 right-0 z-30 min-w-[180px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
              {/* "Déplacer vers Salon" — disponible si screen_status !== 'salon' */}
              {film.screenStatus !== "salon" && (
                <button
                  type="button"
                  disabled={screenStatusMutation.isPending}
                  onClick={() => screenStatusMutation.mutate("move_to_salon")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900"
                >
                  🛋️ Déplacer vers Salon
                </button>
              )}
              {/* "Remettre au Cinéma" — disponible seulement si salon_override = true */}
              {film.salonOverride && (
                <button
                  type="button"
                  disabled={screenStatusMutation.isPending}
                  onClick={() => screenStatusMutation.mutate("restore_to_cinema")}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm hover:bg-zinc-50 disabled:opacity-60 dark:hover:bg-zinc-900"
                >
                  🎬 Remettre au Cinéma
                </button>
              )}
              {/* Natural salon films: no action available */}
              {film.screenStatus === "salon" && !film.salonOverride && (
                <p className="px-4 py-2.5 text-xs text-zinc-400 dark:text-zinc-500">
                  Disponible à la maison
                </p>
              )}
              {screenStatusMutation.isError && (
                <p className="px-4 py-2 text-xs text-red-600">
                  {screenStatusMutation.error instanceof Error
                    ? screenStatusMutation.error.message
                    : "Erreur"}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function FilmPosterPlaceholder() {
  return (
    <div className="flex h-full w-full items-center justify-center text-zinc-300 dark:text-zinc-700">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
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
    </div>
  );
}

function AvatarStack({ members }: { members: GroupFilmMember[] }) {
  const visible = members.slice(0, 3);
  const extra = members.length - visible.length;

  return (
    <div
      className="flex -space-x-2"
      title={`Intéressé·e·s : ${members.map((m) => m.name).join(", ")}`}
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

function EmptyLibrary() {
  const queryClient = useQueryClient();
  const seed = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/dev/seed-films", { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Erreur lors du seed");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
    },
  });

  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      <p>Aucun film dans votre groupe pour le moment.</p>
      <button
        type="button"
        onClick={() => seed.mutate()}
        disabled={seed.isPending}
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-700 hover:border-zinc-500 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:border-zinc-500"
      >
        {seed.isPending ? "Ajout…" : "Ajouter 2 films aléatoires (test)"}
      </button>
      {seed.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {seed.error instanceof Error ? seed.error.message : "Erreur"}
        </p>
      )}
    </div>
  );
}
