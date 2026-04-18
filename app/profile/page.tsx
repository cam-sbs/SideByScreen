import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name, avatar_url, group_id")
    .eq("id", user.id)
    .maybeSingle();

  const isFirstTime = !profile || !profile.group_id;
  const initialName =
    profile?.name ??
    ((user.user_metadata?.name as string | undefined) ?? "");

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
          redirectTo={isFirstTime ? "/library" : null}
        />
      </div>
    </div>
  );
}
