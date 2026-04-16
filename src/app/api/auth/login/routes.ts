import { NextResponse } from "next/server"
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  getExpectedPassword,
  getExpectedUsername,
  isAuthConfigured,
} from "@/lib/auth"

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Auth non configurée. Ajoute BOSAI_LOGIN_USERNAME, BOSAI_LOGIN_PASSWORD et BOSAI_SESSION_SECRET.",
      },
      { status: 500 }
    )
  }

  let body: { username?: string; password?: string } = {}

  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 }
    )
  }

  const username = (body.username || "").trim()
  const password = body.password || ""

  if (!username || !password) {
    return NextResponse.json(
      { ok: false, error: "Identifiants requis." },
      { status: 400 }
    )
  }

  if (
    username !== getExpectedUsername() ||
    password !== getExpectedPassword()
  ) {
    return NextResponse.json(
      { ok: false, error: "Identifiants invalides." },
      { status: 401 }
    )
  }

  const token = await createSessionToken(username)

  const response = NextResponse.json({ ok: true })

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
