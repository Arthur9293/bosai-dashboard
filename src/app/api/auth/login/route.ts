import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  normalizeNextPath,
} from "@/lib/auth";

type LoginBody = {
  email?: string;
  password?: string;
  next?: string;
};

export async function POST(request: Request) {
  let body: LoginBody | null = null;

  try {
    body = (await request.json()) as LoginBody;
  } catch {
    body = null;
  }

  const email = String(body?.email || "").trim().toLowerCase();
  const password = String(body?.password || "");
  const next = normalizeNextPath(body?.next);

  const expectedEmail = String(process.env.BOSAI_ADMIN_EMAIL || "")
    .trim()
    .toLowerCase();
  const expectedPassword = String(process.env.BOSAI_ADMIN_PASSWORD || "");

  if (!expectedEmail || !expectedPassword || !process.env.AUTH_SESSION_SECRET) {
    return NextResponse.json(
      {
        ok: false,
        error: "server_auth_not_configured",
        message: "Auth server non configuré.",
      },
      { status: 500 }
    );
  }

  if (!email || !password) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_credentials",
        message: "Email et mot de passe requis.",
      },
      { status: 400 }
    );
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_credentials",
        message: "Identifiants invalides.",
      },
      { status: 401 }
    );
  }

  const token = await createSessionToken(expectedEmail);

  const response = NextResponse.json({
    ok: true,
    redirectTo: next || "/",
  });

  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  return response;
}
