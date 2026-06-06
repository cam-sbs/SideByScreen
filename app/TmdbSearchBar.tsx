"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TMDBMovie, TMDBSearchResult } from "@/lib/tmdb";

async function searchTmdb(query: string): Promise<TMDBSearchResult> {
  const res = await fetch(
    `/api/tmdb/search?query=${encodeURIComponent(query)}`,
  );
  if (!res.ok) {
    throw new Error("Recherche indisponible");
  }
  return (await res.json()) as TMDBSearchResult;
}

type AddFilmResponse = { id?: string; error?: string };

async function addFilm(tmdbId: number): Promise<{ status: number; body: AddFilmResponse }> {
  const res = await fetch("/api/group/films", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tmdbId }),
  });
  const body = (await res.json().catch(() => ({}))) as AddFilmResponse;
  return { status: res.status, body };
}

type Toast = { kind: "success" | "error" | "info"; message: string };

export function TmdbSearchBar() {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(id);
  }, [input]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const enabled = debounced.length >= 2;
  const { data, isFetching, isError } = useQuery({
    queryKey: ["tmdb-search", debounced],
    queryFn: () => searchTmdb(debounced),
    enabled,
    staleTime: 60_000,
  });

  const queryClient = useQueryClient();
  const addMutation = useMutation({
    mutationFn: (movie: TMDBMovie) => addFilm(movie.id),
    onSuccess: ({ status, body }, movie) => {
      if (status === 201) {
        setToast({ kind: "success", message: `« ${movie.title} » ajouté` });
        setAddedIds((prev) => new Set(prev).add(movie.id));
        queryClient.invalidateQueries({ queryKey: ["group-films"] });
      } else if (status === 409) {
        setToast({ kind: "info", message: "Ce film est déjà dans la liste" });
        setAddedIds((prev) => new Set(prev).add(movie.id));
      } else {
        setToast({
          kind: "error",
          message: body.error ?? "Erreur lors de l'ajout",
        });
      }
    },
    onError: () => {
      setToast({ kind: "error", message: "Erreur lors de l'ajout" });
    },
  });

  const results = data?.results.slice(0, 8) ?? [];
  const showDropdown = open && (enabled || input.length > 0);
  const pendingId = addMutation.isPending ? addMutation.variables?.id : null;

  return (
    <div
      ref={containerRef}
      className="sticky top-0 z-50 -mx-4 bg-white/85 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10 dark:bg-zinc-950/85"
    >
      <div className="relative mx-auto w-full max-w-6xl">
        <label htmlFor="tmdb-search-input" className="sr-only">
          Rechercher un film
        </label>
        <input
          id="tmdb-search-input"
          type="search"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Rechercher un film…"
          className="w-full rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:focus:border-zinc-600"
        />

        {showDropdown && (
          <div
            id={listboxId}
            role="listbox"
            className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-950"
          >
            {!enabled ? (
              <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                Tapez au moins 2 caractères…
              </p>
            ) : isFetching && results.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                Recherche…
              </p>
            ) : isError ? (
              <p className="p-4 text-sm text-red-600 dark:text-red-400">
                Recherche indisponible.
              </p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-zinc-500 dark:text-zinc-400">
                Aucun résultat.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {results.map((movie) => {
                  const isPending = pendingId === movie.id;
                  const isAdded = addedIds.has(movie.id);
                  return (
                    <li key={movie.id} role="option" aria-selected="false">
                      <div className="flex items-center gap-3 p-3">
                        <div className="relative h-[90px] w-[60px] flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-800">
                          {movie.poster_path ? (
                            <Image
                              src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                              alt=""
                              fill
                              sizes="60px"
                              className="object-cover"
                            />
                          ) : (
                            <span className="flex h-full w-full items-center justify-center text-xs text-zinc-400">
                              —
                            </span>
                          )}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <h3 className="truncate text-sm font-semibold">
                              {movie.title}
                            </h3>
                            {movie.release_date && (
                              <span className="flex-shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                                {movie.release_date.slice(0, 4)}
                              </span>
                            )}
                          </div>
                          {movie.overview && (
                            <p className="line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
                              {movie.overview}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => !isAdded && addMutation.mutate(movie)}
                          disabled={isPending || addMutation.isPending || isAdded}
                          className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                            isAdded
                              ? "bg-emerald-600 text-white dark:bg-emerald-500 dark:text-white"
                              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                          }`}
                        >
                          {isPending ? "Ajout…" : isAdded ? "Ajouté" : "Ajouter"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none fixed inset-x-0 bottom-6 z-50 mx-auto w-fit max-w-[90%] rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
            toast.kind === "success"
              ? "bg-emerald-600 text-white"
              : toast.kind === "error"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
