import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has a profile with group_id
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("group_id")
          .eq("id", user.id)
          .single();

        if (!profile || !profile.group_id) {
          return NextResponse.redirect(new URL("/onboarding", origin));
        }
      }

      return NextResponse.redirect(new URL("/library", origin));
    }
  }

  return NextResponse.redirect(new URL("/auth/login?error=callback", origin));
}
