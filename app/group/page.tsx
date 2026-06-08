import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GroupInviteCard } from "@/app/profile/GroupInviteCard";
import { GroupMembersList, type Member } from "./GroupMembersList";

export const dynamic = "force-dynamic";

export default async function GroupPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.group_id) {
    redirect("/onboarding");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, invite_code")
    .eq("id", profile.group_id)
    .maybeSingle();

  if (!group) {
    redirect("/onboarding");
  }

  const { data: membersData } = await supabase
    .from("users")
    .select("id, name, avatar_url")
    .eq("group_id", group.id)
    .order("name", { ascending: true });

  const members: Member[] = (membersData ?? []).map((m) => ({
    id: m.id,
    name: m.name,
    avatarUrl: m.avatar_url,
  }));

  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  let baseUrl = "";
  if (envUrl) {
    baseUrl = envUrl;
  } else {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
    const proto = h.get("x-forwarded-proto") ?? "https";
    baseUrl = host ? `${proto}://${host}` : "";
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8 sm:px-8">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <header className="space-y-2">
          <Link
            href="/profile"
            className="inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            ← Profil
          </Link>
          <h1 className="text-4xl font-bold">{group.name}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Gérez les membres et l&apos;invitation de votre groupe.
          </p>
        </header>

        <GroupMembersList
          groupId={group.id}
          initialMembers={members}
          currentUserId={user.id}
        />

        <GroupInviteCard
          groupName={group.name}
          inviteCode={group.invite_code}
          baseUrl={baseUrl}
        />
      </div>
    </div>
  );
}
