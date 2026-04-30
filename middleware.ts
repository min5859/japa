import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";

const PUBLIC_PATHS = new Set<string>(["/login"]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // expose pathname to server components (root layout uses this to skip chrome on /login)
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  const passthrough = NextResponse.next({ request: { headers: requestHeaders } });

  if (PUBLIC_PATHS.has(pathname)) return passthrough;

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySessionToken(token)) return passthrough;

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  if (pathname !== "/") url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
