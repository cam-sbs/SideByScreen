"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { leaveGroup } from "@/app/actions/groups";

type Props = {
  groupName: string;
};

export function LeaveGroupButton({ groupName }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await leaveGroup();
      if ("error" in result) {
        setError(result.error);
        setConfirming(false);
        return;
      }
      router.push("/onboarding");
    });
  }

  if (confirming) {
    return (
      <div className="space-y-2">
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Quitter <span className="font-medium text-zinc-700 dark:text-zinc-300">{groupName}</span> ? Vous devrez rejoindre ou créer un groupe pour continuer.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="flex-1 rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            {isPending ? "Départ..." : "Confirmer"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={isPending}
            className="flex-1 rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            Annuler
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="w-full rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-red-900 dark:hover:bg-red-950 dark:hover:text-red-400"
    >
      Quitter le groupe
    </button>
  );
}
