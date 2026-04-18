import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InviteActions } from "./InviteActions";

type Props = {
  params: Promise<{ code: string }>;
};

export default async function InvitePage({ params }: Props) {
  const { code: rawCode } = await params;
  const code = normalizeCode(rawCode);

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!code) {
    return (
      <InviteShell>
        <InviteError
          title="Lien d'invitation invalide"
          message="Le code fourni n'est pas reconnu."
        />
      </InviteShell>
    );
  }

  const { data: groupRows, error: lookupError } = await supabase.rpc(
    "lookup_group_by_invite_code",
    { code },
  );

  if (lookupError) {
    console.error("[invite] lookup_group_by_invite_code failed", lookupError);
    return (
      <InviteShell>
        <InviteError
          title="Invitation indisponible"
          message={`Impossible de vérifier l'invitation pour le moment (${lookupError.message}).`}
        />
      </InviteShell>
    );
  }

  if (!groupRows || groupRows.length === 0) {
    return (
      <InviteShell>
        <InviteError
          title="Invitation introuvable"
          message="Ce lien d'invitation n'existe pas ou a été révoqué."
        />
      </InviteShell>
    );
  }

  const group = groupRows[0];

  if (!user) {
    const nextPath = `/invite/${encodeURIComponent(code)}`;
    return (
      <InviteShell>
        <div className="space-y-2 text-center">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Vous êtes invité à rejoindre
          </p>
          <h1 className="text-2xl font-bold">{group.name}</h1>
        </div>
        <div className="space-y-3">
          <Link
            href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Se connecter pour rejoindre
          </Link>
          <Link
            href={`/auth/signup?next=${encodeURIComponent(nextPath)}`}
            className="flex w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
          >
            Créer un compte
          </Link>
        </div>
      </InviteShell>
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.group_id === group.id) {
    return (
      <InviteShell>
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{group.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Vous êtes déjà membre de ce groupe.
          </p>
        </div>
        <Link
          href="/library"
          className="flex w-full items-center justify-center rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Ouvrir la bibliothèque
        </Link>
      </InviteShell>
    );
  }

  if (profile?.group_id) {
    return (
      <InviteShell>
        <InviteError
          title="Impossible de rejoindre"
          message={`Vous appartenez déjà à un autre groupe. Quittez-le avant de rejoindre « ${group.name} ».`}
        />
        <Link
          href="/profile"
          className="flex w-full items-center justify-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Retour au profil
        </Link>
      </InviteShell>
    );
  }

  return (
    <InviteShell>
      <div className="space-y-2 text-center">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Vous êtes invité à rejoindre
        </p>
        <h1 className="text-2xl font-bold">{group.name}</h1>
      </div>
      <InviteActions code={code} />
    </InviteShell>
  );
}

function InviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">{children}</div>
    </div>
  );
}

function InviteError({ title, message }: { title: string; message: string }) {
  return (
    <div className="space-y-3 text-center">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
        {message}
      </p>
    </div>
  );
}

function normalizeCode(value: string | undefined): string | null {
  if (!value) return null;
  const clean = decodeURIComponent(value)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  return clean.length >= 6 ? clean : null;
}
