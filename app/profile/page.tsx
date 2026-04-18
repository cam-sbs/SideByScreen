import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";
import { GroupInviteCard } from "./GroupInviteCard";

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

  let group: { name: string; invite_code: string } | null = null;
  let baseUrl = "";
  if (profile?.group_id) {
    const { data } = await supabase
      .from("groups")
      .select("name, invite_code")
      .eq("id", profile.group_id)
      .maybeSingle();
    group = data ?? null;

    const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (envUrl) {
      baseUrl = envUrl;
    } else {
      const h = await headers();
      const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
      const proto = h.get("x-forwarded-proto") ?? "https";
      baseUrl = host ? `${proto}://${host}` : "";
    }
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

        {group && (
          <GroupInviteCard
            groupName={group.name}
            inviteCode={group.invite_code}
            baseUrl={baseUrl}
          />
        )}

        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <Link
            href="/history"
            className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-sm font-medium transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span>Mes films vus</span>
            <span aria-hidden className="text-zinc-400">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
