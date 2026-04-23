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
  urgencyOnly: boolean;
  planned: PlannedFilter;
  sort: SortKey;
};

const DEFAULT_FILTERS: Filters = {
  seen: "unseen",
  positioning: { kind: "any" },
  genreId: null,
  urgencyOnly: false,
  planned: "any",
  sort: "default",
};

export function FilmsGrid() {
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["group-films"],
    queryFn: fetchFilms,
  });

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const visible = useMemo(() => {
    if (!data) return [];
    const filtered = data.filter((film) => {
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

      if (filters.urgencyOnly && !film.hasUrgency) return false;

      if (filters.planned === "planned" && !film.plannedByMe) return false;
      if (filters.planned === "not-planned" && film.plannedByMe) return false;

      return true;
    });

    return sortFilms(filtered, filters.sort);
  }, [data, filters]);

  const activeCount = countActiveFilters(filters);

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

  const isEmpty = !data || data.length === 0;

  return (
    <div className="space-y-4">
      <FiltersBar
        filters={filters}
        onChange={setFilters}
        members={members}
        genres={genres}
        activeCount={activeCount}
        drawerOpen={drawerOpen}
        setDrawerOpen={setDrawerOpen}
      />

      <ActiveFilterChips
        filters={filters}
        members={members}
        genres={genres}
        onChange={setFilters}
      />

      {isEmpty ? (
        <EmptyLibrary />
      ) : visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Aucun film ne correspond aux filtres.
        </div>
      ) : (
        <ul className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((film) => (
            <li key={film.id}>
              <FilmCard film={film} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function sortFilms(films: GroupFilmCard[], sort: SortKey): GroupFilmCard[] {
  const copy = [...films];
  if (sort === "default") {
    copy.sort((a, b) => {
      if (a.isConsensus !== b.isConsensus) return a.isConsensus ? -1 : 1;
      return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
    });
    return copy;
  }
  copy.sort((a, b) => {
    switch (sort) {
      case "release-desc":
        return (
          timestamp(b.releaseDate, -Infinity) -
          timestamp(a.releaseDate, -Infinity)
        );
      case "release-asc":
        return (
          timestamp(a.releaseDate, Infinity) -
          timestamp(b.releaseDate, Infinity)
        );
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
  if (f.urgencyOnly) n++;
  if (f.planned !== DEFAULT_FILTERS.planned) n++;
  return n;
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
          Filtres
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
              <h2 className="text-lg font-semibold">Filtres</h2>
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
        label="Positionnement"
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
          { value: "me", label: "Où je suis tagué" },
          ...members.map((m) => ({
            value: `member:${m.id}`,
            label: `Où ${m.name} est tagué`,
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
      <label className="flex items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 text-sm dark:border-zinc-800">
        <input
          type="checkbox"
          checked={filters.urgencyOnly}
          onChange={(e) =>
            onChange({ ...filters, urgencyOnly: e.target.checked })
          }
        />
        Avec alerte
      </label>
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

function ActiveFilterChips({
  filters,
  members,
  genres,
  onChange,
}: {
  filters: Filters;
  members: GroupFilmMember[];
  genres: { id: number; name: string }[];
  onChange: (f: Filters) => void;
}) {
  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.seen !== DEFAULT_FILTERS.seen) {
    chips.push({
      key: "seen",
      label:
        filters.seen === "seen"
          ? "Vus"
          : filters.seen === "all"
            ? "Tous statuts"
            : "Non vus",
      onRemove: () => onChange({ ...filters, seen: DEFAULT_FILTERS.seen }),
    });
  }

  if (filters.positioning.kind === "me") {
    chips.push({
      key: "pos-me",
      label: "Où je suis tagué",
      onRemove: () => onChange({ ...filters, positioning: { kind: "any" } }),
    });
  } else if (filters.positioning.kind === "member") {
    const memberId = filters.positioning.memberId;
    const m = members.find((x) => x.id === memberId);
    chips.push({
      key: `pos-${memberId}`,
      label: `Où ${m?.name ?? "membre"} est tagué`,
      onRemove: () => onChange({ ...filters, positioning: { kind: "any" } }),
    });
  }

  if (filters.genreId !== null) {
    const g = genres.find((x) => x.id === filters.genreId);
    chips.push({
      key: `genre-${filters.genreId}`,
      label: g?.name ?? "Genre",
      onRemove: () => onChange({ ...filters, genreId: null }),
    });
  }

  if (filters.urgencyOnly) {
    chips.push({
      key: "urgency",
      label: "Avec alerte",
      onRemove: () => onChange({ ...filters, urgencyOnly: false }),
    });
  }

  if (filters.planned !== DEFAULT_FILTERS.planned) {
    chips.push({
      key: "planned",
      label: filters.planned === "planned" ? "Planifiés" : "Non planifiés",
      onRemove: () => onChange({ ...filters, planned: "any" }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={c.onRemove}
          className="flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {c.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(DEFAULT_FILTERS)}
        className="text-xs text-zinc-500 underline dark:text-zinc-400"
      >
        Tout effacer
      </button>
    </div>
  );
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
        {film.plannedByMe && !film.seenByMe && (
          <span
            title="Séance planifiée"
            aria-label="Séance planifiée"
            className="absolute left-2 bottom-2 rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white shadow"
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
