import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

function isPublicPath(pathname: string) {
  return pathname === "/login" || pathname.startsWith("/login/");
}

function isBypassPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isBypassPath(pathname)) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = authCookie === AUTH_COOKIE_VALUE;

  if (isPublicPath(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/auth-check", request.url));
    }

    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    const nextValue = `${pathname}${search || ""}`;

    if (nextValue && nextValue !== "/login") {
      loginUrl.searchParams.set("next", nextValue);
    }

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
