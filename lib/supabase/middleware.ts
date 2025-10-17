import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

/**
 * Call this from your root middleware.ts:
 *   import { updateSession } from "@/supabase/middleware";
 *   export async function middleware(req: NextRequest) {
 *     return updateSession(req);
 *   }
 */
export async function updateSession(request: NextRequest) {
  // Always start with a response bound to the incoming request
  let response = NextResponse.next({ request });

  // Early exit if env isn’t configured yet (keeps local dev from breaking)
  if (!hasEnvVars) return response;

  // Public route allowlist — skip auth for these
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/api"); // optional: allow APIs to manage their own auth

  // Create a per-request Supabase server client wired to middleware cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // ✅ use publishable key
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        /**
         * Supabase auth helpers will call setAll when it needs to refresh tokens.
         * We must:
         * 1) update the request's cookies
         * 2) mirror them on the outbound response
         */
        setAll(cookiesToSet) {
          // mutate the incoming request's cookies
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          // create a fresh response bound to the (now mutated) request
          response = NextResponse.next({ request });
          // write cookies to the response the browser will receive
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  // IMPORTANT: do not run arbitrary code between client creation and getClaims()
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims ?? null;

  // Redirect logged-in users from home page to protected page
  if (pathname === "/" && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/collections";
    return NextResponse.redirect(url);
  }

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Always return the SAME response object we maintained above
  return response;
}
