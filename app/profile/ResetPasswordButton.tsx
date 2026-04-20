"use client";

import { useState, useTransition } from "react";
import { resetPassword } from "@/app/actions/auth";

type Props = {
  email: string;
};

export function ResetPasswordButton({ email }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function handleClick() {
    setError(null);
    setSent(false);
    const formData = new FormData();
    formData.set("email", email);
    startTransition(async () => {
      const result = await resetPassword(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setSent(true);
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending || sent}
        className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-800 dark:hover:bg-zinc-900"
      >
        <span>
          {isPending
            ? "Envoi..."
            : sent
              ? "Email envoyé"
              : "Réinitialiser mon mot de passe"}
        </span>
        <span aria-hidden className="text-zinc-400">
          →
        </span>
      </button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {sent && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Un lien de réinitialisation a été envoyé à {email}.
        </p>
      )}
    </div>
  );
}
