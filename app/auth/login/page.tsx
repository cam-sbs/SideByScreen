"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { login, loginWithOAuth } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  const nextParam = searchParams.get("next");
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  const [error, setError] = useState<string | null>(
    callbackError === "callback"
      ? "Une erreur est survenue lors de la connexion. Veuillez réessayer."
      : null,
  );
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !email.includes("@")) {
      setError("Veuillez entrer une adresse email valide.");
      setLoading(false);
      return;
    }
    if (!password || password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      setLoading(false);
      return;
    }

    const result = await login(formData);
    if (result?.error) {
      if (result.error.includes("Invalid login credentials")) {
        setError("Email ou mot de passe incorrect.");
      } else {
        setError(result.error);
      }
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    const result = await loginWithOAuth(provider);
    if (result?.error) {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-fog">Se connecter</h1>
          <p className="mt-2 text-sm text-dust">
            Connectez-vous pour retrouver votre liste
          </p>
        </div>

        {error && (
          <div className="rounded-lg border border-urgent/20 bg-urgent-dim p-3 text-sm text-urgent">
            {error}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          {next && <input type="hidden" name="next" value={next} />}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-fog-2 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-md text-fog placeholder:text-dust-2 outline-none hover:border-white/15 focus:border-white/22 transition-colors"
              placeholder="vous@exemple.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium">
                Mot de passe
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-xs text-dust underline-offset-4 hover:underline hover:text-fog"
              >
                Mot de passe oublié ?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="w-full rounded-lg border border-white/10 bg-ink-2 px-3 py-3 text-md text-fog placeholder:text-dust-2 outline-none hover:border-white/15 focus:border-white/22 transition-colors"
              placeholder="Min. 8 caractères"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sage px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:bg-sage-light hover:-translate-y-px disabled:opacity-50"
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-ink px-2 text-dust">
              ou continuer avec
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-ink-2 px-4 py-2.5 text-sm font-medium text-fog transition-colors hover:bg-ink-3 hover:border-white/15"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("apple")}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-ink-2 px-4 py-2.5 text-sm font-medium text-fog transition-colors hover:bg-ink-3 hover:border-white/15"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Apple
          </button>
        </div>

        <p className="text-center text-sm text-dust">
          Pas encore de compte ?{" "}
          <Link
            href={next ? `/auth/signup?next=${encodeURIComponent(next)}` : "/auth/signup"}
            className="font-medium text-fog underline-offset-4 hover:underline"
          >
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
