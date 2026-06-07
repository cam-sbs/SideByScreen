import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FilmsGrid } from "./FilmsGrid";
import { NotificationCenter } from "./NotificationCenter";
import { TmdbSearchBar } from "./TmdbSearchBar";

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
    .select("group_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.group_id) {
    redirect("/onboarding");
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6 sm:px-6 lg:px-10">
      <TmdbSearchBar />
      <div className="mx-auto w-full max-w-6xl space-y-6 pt-4">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-fog sm:text-3xl">Films du groupe</h1>
            <p className="text-sm text-dust">
              Les films proposés à voir ensemble.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Link
              href="/profile"
              className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-dust hover:border-white/20 hover:text-fog transition-colors"
            >
              Profil
            </Link>
          </div>
        </header>

        <FilmsGrid />
      </div>
    </div>
  );
}
