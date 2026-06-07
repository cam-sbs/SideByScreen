import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";
import { FilmsLibrary } from "./FilmsLibrary";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("group_id, name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.group_id) {
    redirect("/onboarding");
  }

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", profile.group_id)
    .maybeSingle();

  if (!group) {
    redirect("/onboarding");
  }

  return (
    <div className="min-h-screen">
      <Header
        userName={profile.name ?? user.email ?? "?"}
        userAvatarUrl={profile.avatar_url ?? null}
      />
      <main className="max-w-screen-sm mx-auto pt-[52px]">
        <FilmsLibrary groupName={group.name} currentUserId={user.id} />
      </main>
    </div>
  );
}
