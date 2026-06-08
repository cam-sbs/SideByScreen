"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createGroup, joinGroup } from "@/app/actions/groups";

const PENDING_TOKEN_KEY = "pending_group_token";

type Mode = "create" | "join";

export function OnboardingForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("create");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    try {
      const token = localStorage.getItem(PENDING_TOKEN_KEY);
      if (token) {
        setMode("join");
        setInviteCode(token);
      }
    } catch {
      // localStorage indisponible
    }
  }, []);

  function consumePendingToken() {
    try {
      localStorage.removeItem(PENDING_TOKEN_KEY);
    } catch {
      // localStorage indisponible
    }
  }

  function submit() {
    setError(null);

    const formData = new FormData();
    if (mode === "create") {
      const trimmed = groupName.trim();
      if (!trimmed) {
        setError("Le nom du groupe est obligatoire.");
        return;
      }
      formData.set("name", trimmed);
    } else {
      const trimmed = inviteCode.trim();
      if (!trimmed) {
        setError("Le code d'invitation est obligatoire.");
        return;
      }
      formData.set("code", trimmed);
    }

    startTransition(async () => {
      const result =
        mode === "create"
          ? await createGroup(formData)
          : await joinGroup(formData);

      if ("error" in result) {
        // Token consommé même en cas d'erreur (expiré ou invalide)
        consumePendingToken();
        setError(result.error);
        return;
      }

      consumePendingToken();
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div
        role="tablist"
        aria-label="Options d'onboarding"
        className="grid grid-cols-2 gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 text-sm dark:border-zinc-800 dark:bg-zinc-900"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "create"}
          onClick={() => {
            setMode("create");
            setError(null);
            consumePendingToken();
          }}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "create"
              ? "bg-white shadow-sm dark:bg-zinc-950"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Créer un groupe
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "join"}
          onClick={() => {
            setMode("join");
            setError(null);
          }}
          className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
            mode === "join"
              ? "bg-white shadow-sm dark:bg-zinc-950"
              : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          Rejoindre un groupe
        </button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-4"
      >
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {mode === "create" ? (
          <div>
            <label
              htmlFor="group-name"
              className="block text-sm font-medium mb-1.5"
            >
              Nom du groupe
            </label>
            <input
              id="group-name"
              name="name"
              type="text"
              required
              maxLength={50}
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder="Les cinéphiles"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Un code d&apos;invitation sera généré pour partager avec vos amis.
            </p>
          </div>
        ) : (
          <div>
            <label
              htmlFor="invite-code"
              className="block text-sm font-medium mb-1.5"
            >
              Code ou lien d&apos;invitation
            </label>
            <input
              id="invite-code"
              name="code"
              type="text"
              required
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder="ABC23XYZ"
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Collez le code à 8 caractères ou le lien reçu de votre ami.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {isPending
            ? "Patientez..."
            : mode === "create"
              ? "Créer le groupe"
              : "Rejoindre le groupe"}
        </button>
      </form>
    </div>
  );
}
