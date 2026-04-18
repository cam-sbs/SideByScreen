"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinGroup } from "@/app/actions/groups";

export function InviteActions({ code }: { code: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleJoin() {
    setError(null);
    const formData = new FormData();
    formData.set("code", code);

    startTransition(async () => {
      const result = await joinGroup(formData);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.push("/library");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "Adhésion en cours..." : "Rejoindre le groupe"}
      </button>
    </div>
  );
}
