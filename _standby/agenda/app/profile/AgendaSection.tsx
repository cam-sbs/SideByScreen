// [STAND-BY] Feature agenda — à réactiver en v-next
"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { AgendaItem, AgendaParticipant } from "@/app/api/agenda/route";

async function fetchAgenda(): Promise<AgendaItem[]> {
  const res = await fetch("/api/agenda", { cache: "no-store" });
  if (!res.ok) throw new Error("Impossible de charger l'agenda");
  const payload = (await res.json()) as { items: AgendaItem[] };
  return payload.items;
}

export function AgendaSection() {
  const queryClient = useQueryClient();
  const { data, isPending, isError } = useQuery({
    queryKey: ["agenda"],
    queryFn: fetchAgenda,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("agenda-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "film_screenings" },
        () => queryClient.invalidateQueries({ queryKey: ["agenda"] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "screening_participants" },
        () => queryClient.invalidateQueries({ queryKey: ["agenda"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const respond = useMutation({
    mutationFn: async (args: { screeningId: string; accept: boolean }) => {
      const res = await fetch(`/api/screenings/${args.screeningId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: args.accept }),
      });
      if (!res.ok) throw new Error("Erreur");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
    },
  });

  return (
    <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Mon agenda
      </h2>

      {isPending ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">Chargement…</p>
      ) : isError ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Erreur de chargement
        </p>
      ) : !data || data.length === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-300 p-4 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
          Aucune séance planifiée.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {data.map((item) => (
            <AgendaCard
              key={item.screeningId}
              item={item}
              onRespond={(accept) =>
                respond.mutate({ screeningId: item.screeningId, accept })
              }
              pending={respond.isPending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AgendaCard({
  item,
  onRespond,
  pending,
}: {
  item: AgendaItem;
  onRespond: (accept: boolean) => void;
  pending: boolean;
}) {
  const accepted = item.participants.filter((p) => p.status === "accepted");
  const waiting = item.participants.filter((p) => p.status === "pending");
  return (
    <li className="rounded-lg border border-zinc-200 p-3 text-left dark:border-zinc-800">
      <Link
        href={`/film/${item.film.tmdbId}`}
        className="flex gap-3 hover:opacity-90"
      >
        <div className="h-16 w-12 flex-shrink-0 overflow-hidden rounded bg-zinc-100 dark:bg-zinc-900">
          {item.film.posterPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://image.tmdb.org/t/p/w185${item.film.posterPath}`}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{item.film.title}</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-300">
            {formatDateTime(item.scheduledAt)}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
            {accepted.length} confirmé{accepted.length > 1 ? "s" : ""}
            {waiting.length > 0 && ` · ${waiting.length} en attente`}
          </p>
        </div>
      </Link>

      <div className="mt-2">
        <ParticipantsInline participants={item.participants} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {item.myStatus === "pending" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => onRespond(true)}
              className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Accepter
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => onRespond(false)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:border-zinc-500 dark:border-zinc-700 disabled:opacity-60"
            >
              Décliner
            </button>
          </>
        )}
        {item.myStatus === "accepted" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRespond(false)}
            className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:border-red-500 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
          >
            Je ne viens plus
          </button>
        )}
      </div>
    </li>
  );
}

function ParticipantsInline({
  participants,
}: {
  participants: AgendaParticipant[];
}) {
  if (participants.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {participants.map((p) => (
        <li
          key={p.id}
          className={`rounded-full px-2 py-0.5 text-[10px] ${
            p.status === "accepted"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : p.status === "cancelled"
                ? "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {p.name}
        </li>
      ))}
    </ul>
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
