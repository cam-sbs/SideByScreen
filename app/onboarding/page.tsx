import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
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

  if (profile?.group_id) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Rejoindre un groupe</h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Créez votre groupe ou rejoignez celui d&apos;un ami pour commencer
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
