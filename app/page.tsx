import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FilmsGrid } from "./FilmsGrid";
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
            <h1 className="text-2xl font-bold sm:text-3xl">Films du groupe</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Les films proposés à voir ensemble.
            </p>
          </div>
          <Link
            href="/profile"
            className="rounded-full border border-zinc-200 px-3 py-1.5 text-sm hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            Profil
          </Link>
        </header>

        <FilmsGrid />
      </div>
    </div>
  );
}
