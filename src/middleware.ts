import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { AUTH_COOKIE_NAME, LOGIN_PATH, verifySessionToken } from "@/lib/auth"

function isPublicPath(pathname: string): boolean {
  if (pathname === LOGIN_PATH) return true
  if (pathname.startsWith("/api/auth/login")) return true
  if (pathname.startsWith("/api/auth/logout")) return true
  return false
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isPublicPath(pathname)) {
    if (pathname === LOGIN_PATH) {
      const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
      const session = await verifySessionToken(token)

      if (session.valid) {
        return NextResponse.redirect(new URL("/", request.url))
      }
    }

    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  if (session.valid) {
    return NextResponse.next()
  }

  const loginUrl = new URL(LOGIN_PATH, request.url)
  loginUrl.searchParams.set("next", `${pathname}${search}`)

  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
