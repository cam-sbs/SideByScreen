"use client";

import { useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/app/actions/auth";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    setLoading(true);

    const result = await resetPassword(formData);
    setLoading(false);

    if (result?.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Mot de passe oublié</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Entrez votre email pour recevoir un lien de réinitialisation
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
            Si un compte existe pour cette adresse, un email de réinitialisation
            vient d&apos;être envoyé.
          </div>
        ) : (
          <form action={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 dark:border-zinc-700 dark:focus:border-zinc-400 dark:focus:ring-zinc-400"
                placeholder="vous@exemple.com"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
          <Link
            href="/auth/login"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-100"
          >
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
