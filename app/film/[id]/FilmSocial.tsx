"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export type FilmSocialMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type ScreenStatus = "in_theaters" | "coming_soon" | "salon" | "unknown";

export type FilmSocialData = {
  groupFilmId: string;
  addedBy: FilmSocialMember | null;
  addedAt: string;
  taggedMembers: FilmSocialMember[];
  taggedByMe: boolean;
  seenByMe: boolean;
  wishedByMe: boolean;
  watchedTogetherByMe: boolean;
  watchedTogetherMembers: FilmSocialMember[];
  totalMembers: number;
  urgency: { level: "orange" | "red"; label: string } | null;
  screenStatus: ScreenStatus;
  theatricalReleaseDate: string | null;
};

type PatchBody = {
  is_tagged?: boolean;
  is_seen?: boolean;
  is_wished?: boolean;
  watched_together?: boolean;
};

type PatchResponse = { ok: boolean; wasArchived: boolean };

async function patchTag(
  groupFilmId: string,
  body: PatchBody,
): Promise<PatchResponse> {
  const res = await fetch(`/api/group/films/${groupFilmId}/tag`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Erreur lors de la mise à jour");
  }
  return res.json() as Promise<PatchResponse>;
}

function ScreenStatusBadge({
  screenStatus,
  theatricalReleaseDate,
}: {
  screenStatus: ScreenStatus;
  theatricalReleaseDate: string | null;
}) {
  if (screenStatus === "in_theaters") {
    const days = theatricalReleaseDate
      ? Math.floor(
          (Date.now() - new Date(theatricalReleaseDate).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : null;
    return (
      <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        Actuellement en salle
        {days !== null && (
          <span className="text-emerald-600 dark:text-emerald-400">
            · Sorti il y a {days} jour{days !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    );
  }

  if (screenStatus === "coming_soon" && theatricalReleaseDate) {
    const date = new Date(theatricalReleaseDate).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return (
      <div className="flex items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-300">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-blue-500" />
        Sort le {date}
      </div>
    );
  }

  if (screenStatus === "salon") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
        <span aria-hidden>🛋️</span>
        Disponible à la maison
      </div>
    );
  }

  return null;
}

export function FilmSocial({
  data,
  movieTitle,
}: {
  data: FilmSocialData;
  movieTitle: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmUntag, setConfirmUntag] = useState(false);
  const [pendingKind, setPendingKind] = useState<
    "tag" | "seen" | "wish" | "watched_together" | null
  >(null);
  const [archivedToast, setArchivedToast] = useState(false);
  const [optimistic, setOptimistic] = useState({
    taggedByMe: data.taggedByMe,
    seenByMe: data.seenByMe,
    wishedByMe: data.wishedByMe,
    watchedTogetherByMe: data.watchedTogetherByMe,
  });

  useEffect(() => {
    setOptimistic({
      taggedByMe: data.taggedByMe,
      seenByMe: data.seenByMe,
      wishedByMe: data.wishedByMe,
      watchedTogetherByMe: data.watchedTogetherByMe,
    });
  }, [data.taggedByMe, data.seenByMe, data.wishedByMe, data.watchedTogetherByMe]);

  const mutation = useMutation({
    mutationFn: (body: PatchBody) => patchTag(data.groupFilmId, body),
    onMutate: (body) => {
      const snapshot = { ...optimistic };
      setOptimistic((prev) => ({
        ...prev,
        ...(body.is_tagged !== undefined && { taggedByMe: body.is_tagged }),
        ...(body.is_seen !== undefined && { seenByMe: body.is_seen }),
        ...(body.is_wished !== undefined && { wishedByMe: body.is_wished }),
        ...(body.watched_together !== undefined && {
          watchedTogetherByMe: body.watched_together,
        }),
      }));
      return snapshot;
    },
    onError: (_err, _body, snapshot) => {
      if (snapshot) setOptimistic(snapshot);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
      router.refresh();
      if (result.wasArchived) {
        setArchivedToast(true);
        setTimeout(() => setArchivedToast(false), 4000);
      }
    },
    onSettled: () => {
      setPendingKind(null);
    },
  });

  const isSalon = data.screenStatus === "salon";
  const isConsensus =
    data.totalMembers > 0 && data.taggedMembers.length >= data.totalMembers;

  const handleTagClick = () => {
    if (optimistic.taggedByMe) {
      if (isConsensus) {
        setConfirmUntag(true);
        return;
      }
      setPendingKind("tag");
      mutation.mutate({ is_tagged: false });
    } else {
      setPendingKind("tag");
      mutation.mutate({ is_tagged: true });
    }
  };

  const handleSeenClick = () => {
    setPendingKind("seen");
    mutation.mutate({ is_seen: !optimistic.seenByMe });
  };

  const handleWishClick = () => {
    setPendingKind("wish");
    mutation.mutate({ is_wished: !optimistic.wishedByMe });
  };

  const handleWatchedTogetherClick = () => {
    if (optimistic.watchedTogetherByMe) return;
    setPendingKind("watched_together");
    mutation.mutate({ watched_together: true });
  };

  const confirmRemoveTag = () => {
    setConfirmUntag(false);
    setPendingKind("tag");
    mutation.mutate({ is_tagged: false });
  };

  const watchedCount = data.watchedTogetherMembers.length;
  const taggedCount = data.taggedMembers.length;

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <ScreenStatusBadge
        screenStatus={data.screenStatus}
        theatricalReleaseDate={data.theatricalReleaseDate}
      />
      {!isSalon && data.urgency && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium ${
            data.urgency.level === "red"
              ? "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
              : "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              data.urgency.level === "red" ? "bg-red-600" : "bg-orange-500"
            }`}
          />
          {data.urgency.label}
        </div>
      )}

      {data.addedBy && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500 dark:text-zinc-400">Ajouté par</span>
          <MemberAvatar member={data.addedBy} size={24} />
          <span className="font-medium">{data.addedBy.name}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Positionnés
          </p>
          <p className="text-sm font-medium">
            {data.taggedMembers.length} / {data.totalMembers}
            {isConsensus && (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-900">
                Consensus
              </span>
            )}
          </p>
        </div>
        {data.taggedMembers.length > 0 ? (
          <AvatarStack members={data.taggedMembers} />
        ) : (
          <span className="text-xs text-zinc-400">Personne pour l&apos;instant</span>
        )}
      </div>

      {isSalon && taggedCount > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              On l&apos;a regardé
            </p>
            <p className="text-sm font-medium">
              {watchedCount} / {taggedCount}
            </p>
          </div>
          {watchedCount > 0 ? (
            <AvatarStack
              members={data.watchedTogetherMembers}
              checkmarks
            />
          ) : (
            <span className="text-xs text-zinc-400">Pas encore confirmé</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleTagClick}
          disabled={mutation.isPending && pendingKind === "tag"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            optimistic.taggedByMe
              ? "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          }`}
        >
          {optimistic.taggedByMe ? "Retirer mon tag" : "Je suis intéressé·e"}
        </button>

        {isSalon ? (
          optimistic.taggedByMe && (
            <button
              type="button"
              onClick={handleWatchedTogetherClick}
              disabled={
                optimistic.watchedTogetherByMe ||
                (mutation.isPending && pendingKind === "watched_together")
              }
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
                optimistic.watchedTogetherByMe
                  ? "border border-emerald-600 bg-emerald-600 text-white cursor-default"
                  : "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              }`}
            >
              {optimistic.watchedTogetherByMe ? "On l'a regardé ✓" : "On l'a regardé"}
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={handleSeenClick}
            disabled={mutation.isPending && pendingKind === "seen"}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              optimistic.seenByMe
                ? "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
                : "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            }`}
          >
            {optimistic.seenByMe ? "Vu ✓" : "J'ai vu ce film"}
          </button>
        )}

        <button
          type="button"
          onClick={handleWishClick}
          disabled={mutation.isPending && pendingKind === "wish"}
          aria-pressed={optimistic.wishedByMe}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            optimistic.wishedByMe
              ? "border border-rose-500 bg-rose-500 text-white hover:bg-rose-600"
              : "border border-zinc-300 bg-white text-zinc-800 hover:border-rose-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          }`}
        >
          <span aria-hidden>{optimistic.wishedByMe ? "♥" : "♡"}</span>
          {optimistic.wishedByMe ? "Dans mes souhaits" : "Ajouter aux souhaits"}
        </button>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Erreur"}
        </p>
      )}

      {archivedToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
        >
          <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-3 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
            <span aria-hidden className="text-base">🗂️</span>
            <span>
              <span className="font-medium">« {movieTitle} »</span>
              {isSalon
                ? " a été archivé — tous les membres ont confirmé l'avoir regardé"
                : " a été archivé — tous les membres l'ont vu ou retiré leur tag"}
            </span>
          </div>
        </div>
      )}

      {confirmUntag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl dark:bg-zinc-950">
            <h3 className="text-base font-semibold">Retirer votre tag ?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Tout le groupe est actuellement positionné sur ce film. Retirer
              votre tag cassera le consensus.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmUntag(false)}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRemoveTag}
                className="rounded-full bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function AvatarStack({
  members,
  checkmarks = false,
}: {
  members: FilmSocialMember[];
  checkmarks?: boolean;
}) {
  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;
  return (
    <div
      className="flex -space-x-2"
      title={`${checkmarks ? "Ont confirmé" : "Positionnés"} : ${members.map((m) => m.name).join(", ")}`}
    >
      {visible.map((m) => (
        <MemberAvatar key={m.id} member={m} size={28} bordered checkmark={checkmarks} />
      ))}
      {extra > 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-200 text-[10px] font-semibold text-zinc-700 dark:border-zinc-950 dark:bg-zinc-700 dark:text-zinc-200">
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
  checkmark = false,
}: {
  member: FilmSocialMember;
  size: number;
  bordered?: boolean;
  checkmark?: boolean;
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
      {checkmark && (
        <span
          aria-hidden
          className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[7px] text-white"
        >
          ✓
        </span>
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
