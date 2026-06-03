import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const publicPaths = [
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/invite/",
];

// Routes accessibles sans groupe (profil + onboarding + logout côté /auth + invitation).
const noGroupAllowedPrefixes = [
  "/onboarding",
  "/profile",
  "/auth",
  "/invite/",
];

export default async function proxy(request: NextRequest) {
  const response = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isPublic = publicPaths.some((p) => pathname.startsWith(p));
  if (isPublic) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    const next = pathname + request.nextUrl.search;
    loginUrl.searchParams.set("next", next);
    return NextResponse.redirect(loginUrl);
  }

  const isNoGroupAllowed = noGroupAllowedPrefixes.some((p) =>
    pathname.startsWith(p),
  );

  if (!isNoGroupAllowed) {
    const { data: profile } = await supabase
      .from("users")
      .select("group_id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.group_id) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
