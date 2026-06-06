import { NextResponse, type NextRequest } from "next/server";

const publicPaths = [
  "/auth/login",
  "/auth/signup",
  "/auth/callback",
  "/invite/",
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Cookie-only session detection — zero network call.
  // @supabase/ssr stores tokens in sb-*-auth-token cookies.
  // Expired/invalid tokens are caught by getUser() in each Server Component.
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasSession) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
