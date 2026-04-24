"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updatePassword } from "@/app/actions/auth";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);

    const password = formData.get("password") as string;
    const confirm = formData.get("confirm") as string;

    if (!password || password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);
    const result = await updatePassword(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/library"), 1500);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Choisissez un nouveau mot de passe pour votre compte
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            Mot de passe mis à jour. Redirection…
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
            >
              Nouveau mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder="Min. 8 caractères"
            />
          </div>
          <div>
            <label
              htmlFor="confirm"
              className="block text-sm font-medium mb-1.5"
            >
              Confirmation
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
              placeholder="Confirmez le mot de passe"
            />
          </div>
          <button
            type="submit"
            disabled={loading || success}
            className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {loading ? "Enregistrement..." : "Mettre à jour"}
          </button>
        </form>
      </div>
    </div>
  );
}
