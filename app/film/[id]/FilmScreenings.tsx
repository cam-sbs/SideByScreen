"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ScreeningParticipantStatus } from "@/types/supabase";

export type ScreeningMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ScreeningParticipantView = ScreeningMember & {
  status: ScreeningParticipantStatus;
};

export type ScreeningView = {
  id: string;
  scheduledAt: string;
  organizerId: string;
  myStatus: ScreeningParticipantStatus | null;
  participants: ScreeningParticipantView[];
};

export type FilmScreeningsData = {
  groupFilmId: string;
  currentUserId: string;
  groupMembers: ScreeningMember[];
  screenings: ScreeningView[];
};

export function FilmScreenings({ data }: { data: FilmScreeningsData }) {
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const upcoming = useMemo(() => {
    const now = Date.now();
    return data.screenings
      .filter((s) => new Date(s.scheduledAt).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() -
          new Date(b.scheduledAt).getTime(),
      );
  }, [data.screenings]);

  const respond = useMutation({
    mutationFn: async (args: { screeningId: string; accept: boolean }) => {
      const res = await fetch(`/api/screenings/${args.screeningId}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: args.accept }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Erreur");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda"] });
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
      router.refresh();
    },
  });

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Agenda
        </h2>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
        >
          📅 Planifier une séance
        </button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Aucune séance planifiée pour ce film.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {upcoming.map((s) => (
            <ScreeningCard
              key={s.id}
              screening={s}
              currentUserId={data.currentUserId}
              onRespond={(accept) =>
                respond.mutate({ screeningId: s.id, accept })
              }
              pending={respond.isPending}
            />
          ))}
        </ul>
      )}

      {respond.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {respond.error instanceof Error
            ? respond.error.message
            : "Erreur"}
        </p>
      )}

      {modalOpen && (
        <ScheduleModal
          groupFilmId={data.groupFilmId}
          currentUserId={data.currentUserId}
          members={data.groupMembers}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            queryClient.invalidateQueries({ queryKey: ["agenda"] });
            queryClient.invalidateQueries({ queryKey: ["group-films"] });
            router.refresh();
          }}
        />
      )}
    </section>
  );
}

function ScreeningCard({
  screening,
  currentUserId,
  onRespond,
  pending,
}: {
  screening: ScreeningView;
  currentUserId: string;
  onRespond: (accept: boolean) => void;
  pending: boolean;
}) {
  const accepted = screening.participants.filter(
    (p) => p.status === "accepted",
  );
  const pendingParts = screening.participants.filter(
    (p) => p.status === "pending",
  );
  const cancelled = screening.participants.filter(
    (p) => p.status === "cancelled",
  );
  const isOrganizer = screening.organizerId === currentUserId;

  return (
    <li className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{formatDateTime(screening.scheduledAt)}</p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {accepted.length} confirmé{accepted.length > 1 ? "s" : ""}
            {pendingParts.length > 0 && ` · ${pendingParts.length} en attente`}
            {cancelled.length > 0 && ` · ${cancelled.length} annulé${cancelled.length > 1 ? "s" : ""}`}
          </p>
          <ParticipantList participants={screening.participants} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {screening.myStatus === "pending" && (
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
        {screening.myStatus === "accepted" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRespond(false)}
            className="rounded-full border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:border-red-500 dark:border-red-800 dark:text-red-400 disabled:opacity-60"
          >
            {isOrganizer ? "Annuler ma venue" : "Je ne viens plus"}
          </button>
        )}
        {screening.myStatus === "cancelled" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => onRespond(true)}
            className="rounded-full border border-emerald-300 px-3 py-1 text-xs font-medium text-emerald-700 hover:border-emerald-500 dark:border-emerald-800 dark:text-emerald-400 disabled:opacity-60"
          >
            Finalement, je viens
          </button>
        )}
        {screening.myStatus === null && (
          <span className="text-xs text-zinc-400">Non invité·e</span>
        )}
      </div>
    </li>
  );
}

function ParticipantList({
  participants,
}: {
  participants: ScreeningParticipantView[];
}) {
  if (participants.length === 0) return null;
  return (
    <ul className="mt-2 flex flex-wrap gap-1.5">
      {participants.map((p) => (
        <li
          key={p.id}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
            p.status === "accepted"
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
              : p.status === "cancelled"
                ? "bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-500"
                : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          <Avatar member={p} size={16} />
          <span>{p.name}</span>
        </li>
      ))}
    </ul>
  );
}

function ScheduleModal({
  groupFilmId,
  currentUserId,
  members,
  onClose,
  onCreated,
}: {
  groupFilmId: string;
  currentUserId: string;
  members: ScreeningMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const invitable = members.filter((m) => m.id !== currentUserId);
  const defaultDate = getDefaultDateTimeLocal();
  const [dateValue, setDateValue] = useState(defaultDate);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(invitable.map((m) => m.id)),
  );

  const create = useMutation({
    mutationFn: async () => {
      const iso = new Date(dateValue).toISOString();
      const res = await fetch(
        `/api/group/films/${groupFilmId}/screenings`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scheduledAt: iso,
            participantIds: Array.from(selected),
          }),
        },
      );
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Erreur");
      }
    },
    onSuccess: onCreated,
  });

  const toggleMember = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const disabled =
    create.isPending ||
    !dateValue ||
    Number.isNaN(Date.parse(dateValue)) ||
    new Date(dateValue).getTime() < Date.now() - 60_000;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-zinc-950">
        <h3 className="text-base font-semibold">Planifier une séance</h3>

        <label className="mt-3 block text-sm">
          <span className="mb-1 block font-medium">Date et heure</span>
          <input
            type="datetime-local"
            value={dateValue}
            onChange={(e) => setDateValue(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Inviter</p>
          {invitable.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Aucun autre membre dans le groupe.
            </p>
          ) : (
            <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
              {invitable.map((m) => (
                <li key={m.id}>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-900">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggleMember(m.id)}
                    />
                    <Avatar member={m} size={24} />
                    <span className="text-sm">{m.name}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {create.isError && (
          <p className="mt-3 text-xs text-red-600 dark:text-red-400">
            {create.error instanceof Error
              ? create.error.message
              : "Erreur"}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={disabled}
            className="rounded-full bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {create.isPending ? "Création…" : "Créer la séance"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Avatar({
  member,
  size,
}: {
  member: ScreeningMember;
  size: number;
}) {
  const initials = getInitials(member.name);
  return (
    <span
      style={{ width: size, height: size }}
      className="relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
    >
      {member.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatarUrl}
          alt=""
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
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
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

function getDefaultDateTimeLocal(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(20, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
