"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export type FilmSocialMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
};

export type FilmSocialData = {
  groupFilmId: string;
  addedBy: FilmSocialMember | null;
  addedAt: string;
  taggedMembers: FilmSocialMember[];
  taggedByMe: boolean;
  seenByMe: boolean;
  totalMembers: number;
  urgency: { level: "orange" | "red"; label: string } | null;
};

type PatchBody = { is_tagged?: boolean; is_seen?: boolean };

async function patchTag(
  groupFilmId: string,
  body: PatchBody,
): Promise<void> {
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
}

export function FilmSocial({ data }: { data: FilmSocialData }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmUntag, setConfirmUntag] = useState(false);
  const [pendingKind, setPendingKind] = useState<"tag" | "seen" | null>(null);

  const mutation = useMutation({
    mutationFn: (body: PatchBody) => patchTag(data.groupFilmId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-films"] });
      router.refresh();
    },
    onSettled: () => {
      setPendingKind(null);
    },
  });

  const isConsensus =
    data.totalMembers > 0 && data.taggedMembers.length >= data.totalMembers;

  const handleTagClick = () => {
    if (data.taggedByMe) {
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
    mutation.mutate({ is_seen: !data.seenByMe });
  };

  const confirmRemoveTag = () => {
    setConfirmUntag(false);
    setPendingKind("tag");
    mutation.mutate({ is_tagged: false });
  };

  return (
    <section className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      {data.urgency && (
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

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleTagClick}
          disabled={mutation.isPending && pendingKind === "tag"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            data.taggedByMe
              ? "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              : "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          }`}
        >
          {data.taggedByMe ? "Retirer mon tag" : "Je suis intéressé·e"}
        </button>
        <button
          type="button"
          onClick={handleSeenClick}
          disabled={mutation.isPending && pendingKind === "seen"}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
            data.seenByMe
              ? "border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700"
              : "border border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          }`}
        >
          {data.seenByMe ? "Vu ✓" : "J'ai vu ce film"}
        </button>
      </div>

      {mutation.isError && (
        <p className="text-xs text-red-600 dark:text-red-400">
          {mutation.error instanceof Error
            ? mutation.error.message
            : "Erreur"}
        </p>
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

function AvatarStack({ members }: { members: FilmSocialMember[] }) {
  const visible = members.slice(0, 5);
  const extra = members.length - visible.length;
  return (
    <div
      className="flex -space-x-2"
      title={`Positionnés : ${members.map((m) => m.name).join(", ")}`}
    >
      {visible.map((m) => (
        <MemberAvatar key={m.id} member={m} size={28} bordered />
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
}: {
  member: FilmSocialMember;
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
