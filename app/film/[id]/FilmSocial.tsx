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
      <div className="flex items-center gap-2 rounded-md bg-sage-dim border border-sage-border px-3 py-2 text-xs font-medium text-sage-light">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-sage" />
        Actuellement en salle
        {days !== null && (
          <span className="text-sage">
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
      <div className="flex items-center gap-2 rounded-md bg-warn-dim border border-warn/20 px-3 py-2 text-xs font-medium text-warn">
        <span aria-hidden className="inline-block h-2 w-2 rounded-full bg-warn" />
        Sort le {date}
      </div>
    );
  }

  if (screenStatus === "salon") {
    return (
      <div className="flex items-center gap-2 rounded-md bg-ink-3 px-3 py-2 text-xs font-medium text-dust">
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
    <section className="flex flex-col gap-3 rounded-xl border border-white/6 bg-ink-2 p-4">
      <ScreenStatusBadge
        screenStatus={data.screenStatus}
        theatricalReleaseDate={data.theatricalReleaseDate}
      />
      {!isSalon && data.urgency && (
        <div
          className={`flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium border ${
            data.urgency.level === "red"
              ? "bg-urgent-dim border-urgent/20 text-urgent"
              : "bg-warn-dim border-warn/20 text-warn"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block h-2.5 w-2.5 rounded-full ${
              data.urgency.level === "red" ? "bg-urgent" : "bg-warn"
            }`}
          />
          {data.urgency.label}
        </div>
      )}

      {data.addedBy && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-dust">Ajouté par</span>
          <MemberAvatar member={data.addedBy} size={24} />
          <span className="font-medium text-fog">{data.addedBy.name}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-dust">
            Intéressé·e·s
          </p>
          <p className="text-sm font-medium text-fog">
            {data.taggedMembers.length} / {data.totalMembers}
            {isConsensus && (
              <span className="ml-2 rounded-full bg-gold-dim border border-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                Tout le groupe ✦
              </span>
            )}
          </p>
        </div>
        {data.taggedMembers.length > 0 ? (
          <AvatarStack members={data.taggedMembers} />
        ) : (
          <span className="text-xs text-dust">Personne pour l&apos;instant</span>
        )}
      </div>

      {isSalon && taggedCount > 0 && (
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-dust">
              On l&apos;a regardé
            </p>
            <p className="text-sm font-medium text-fog">
              {watchedCount} / {taggedCount}
            </p>
          </div>
          {watchedCount > 0 ? (
            <AvatarStack
              members={data.watchedTogetherMembers}
              checkmarks
            />
          ) : (
            <span className="text-xs text-dust">Pas encore confirmé</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleTagClick}
          disabled={mutation.isPending && pendingKind === "tag"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-60 ${
            optimistic.taggedByMe
              ? "border border-white/10 bg-ink-3 text-fog hover:border-white/20 hover:bg-ink-4"
              : "bg-sage text-white hover:bg-sage-light hover:-translate-y-px"
          }`}
        >
          {optimistic.taggedByMe ? "Retirer mon intérêt" : "Je veux le voir"}
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
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-60 ${
                optimistic.watchedTogetherByMe
                  ? "border border-sage/40 bg-sage-dim text-sage-light cursor-default"
                  : "border border-white/10 bg-ink-3 text-fog hover:border-white/20 hover:bg-ink-4"
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
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-60 ${
              optimistic.seenByMe
                ? "border border-sage/40 bg-sage-dim text-sage-light"
                : "border border-white/10 bg-ink-3 text-fog hover:border-white/20 hover:bg-ink-4"
            }`}
          >
            {optimistic.seenByMe ? "Vu ✓" : "Marquer comme vu"}
          </button>
        )}

        <button
          type="button"
          onClick={handleWishClick}
          disabled={mutation.isPending && pendingKind === "wish"}
          aria-pressed={optimistic.wishedByMe}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-150 disabled:opacity-60 ${
            optimistic.wishedByMe
              ? "border border-clay/30 bg-clay-dim text-clay"
              : "border border-white/10 bg-ink-3 text-fog hover:border-white/20 hover:bg-ink-4"
          }`}
        >
          <span aria-hidden>{optimistic.wishedByMe ? "♥" : "♡"}</span>
          {optimistic.wishedByMe ? "Dans mes souhaits" : "Ajouter aux souhaits"}
        </button>
      </div>

      {mutation.isError && (
        <p className="text-xs text-urgent">
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
          <div className="flex items-center gap-2 rounded-lg bg-ink-3 border border-white/8 px-4 py-3 text-sm text-fog shadow-lg">
            <span aria-hidden className="text-base">🗂️</span>
            <span>
              <span className="font-medium">« {movieTitle} »</span>
              {isSalon
                ? " a été archivé — le groupe a confirmé l'avoir regardé"
                : " a été archivé — le groupe l'a vu ou s'est désisté"}
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
          <div className="w-full max-w-sm rounded-xl border border-white/8 bg-ink-2 p-4 shadow-xl">
            <h3 className="text-base font-semibold text-fog">Retirer votre intérêt ?</h3>
            <p className="mt-2 text-sm text-dust">
              Tout le groupe est partant pour ce film — retirer votre intérêt
              cassera le consensus.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmUntag(false)}
                className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-fog hover:border-white/20"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmRemoveTag}
                className="rounded-full bg-urgent-dim border border-urgent/20 px-3 py-1.5 text-sm font-medium text-urgent hover:bg-urgent/20"
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
      title={`${checkmarks ? "Ont confirmé" : "Intéressé·e·s"} : ${members.map((m) => m.name).join(", ")}`}
    >
      {visible.map((m) => (
        <MemberAvatar key={m.id} member={m} size={28} bordered checkmark={checkmarks} />
      ))}
      {extra > 0 && (
        <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-avatar-bg text-[10px] font-semibold text-avatar-text">
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
  const borderClass = bordered ? "border-2 border-ink" : "";
  return (
    <span
      style={{ width: size, height: size }}
      className={`relative inline-flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-avatar-bg text-[10px] font-semibold text-avatar-text ${borderClass}`}
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
          className="absolute bottom-0 right-0 flex h-3 w-3 items-center justify-center rounded-full bg-sage text-[7px] text-white"
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
