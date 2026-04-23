import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { AgendaSection } from "./AgendaSection";
import { ProfileForm } from "./ProfileForm";
import { ResetPasswordButton } from "./ResetPasswordButton";

type Props = {
  searchParams: Promise<{ next?: string }>;
};

export default async function ProfilePage({ searchParams }: Props) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { next: nextParam } = await searchParams;
  const next =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : null;

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, group_id")
    .eq("id", user.id)
    .maybeSingle();

  const isFirstTime = !profile || !profile.group_id;
  const initialName =
    profile?.name ??
    ((user.user_metadata?.name as string | undefined) ?? "");

  let groupName: string | null = null;
  if (profile?.group_id) {
    const { data } = await supabase
      .from("groups")
      .select("name")
      .eq("id", profile.group_id)
      .maybeSingle();
    groupName = data?.name ?? null;
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">
            {isFirstTime ? "Complétez votre profil" : "Mon profil"}
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {isFirstTime
              ? "Quelques infos avant de rejoindre un groupe"
              : "Modifiez vos informations personnelles"}
          </p>
        </div>

        <ProfileForm
          email={user.email ?? ""}
          initialName={initialName}
          initialAvatarUrl={profile?.avatar_url ?? null}
          redirectTo={isFirstTime ? (next ?? "/onboarding") : null}
        />

        {!isFirstTime && <AgendaSection />}

        <div className="space-y-2 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          {groupName && (
            <Link
              href="/group"
              className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
            >
              <span className="flex min-w-0 flex-col">
                <span>Paramètres du groupe</span>
                <span className="truncate text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  {groupName}
                </span>
              </span>
              <span aria-hidden className="text-zinc-400">
                →
              </span>
            </Link>
          )}
          <Link
            href="/history"
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span>Mes films vus</span>
            <span aria-hidden className="text-zinc-400">
              →
            </span>
          </Link>
          {user.email && <ResetPasswordButton email={user.email} />}
          <form action={logout}>
            <button
              type="submit"
              className="w-full rounded-lg border border-red-200 px-4 py-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
