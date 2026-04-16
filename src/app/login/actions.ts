"use server";

import { cookies } from "next/headers";

export type LoginActionState = {
  error: string | null;
  ok: boolean;
  next: string | null;
};

export const initialLoginActionState: LoginActionState = {
  error: null,
  ok: false,
  next: null,
};

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

function normalizeNextPath(value?: string | null): string {
  const raw = (value || "").trim();

  if (!raw) return "/auth-check";
  if (!raw.startsWith("/")) return "/auth-check";
  if (raw.startsWith("//")) return "/auth-check";
  if (raw.startsWith("/login")) return "/auth-check";

  return raw;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "").trim();

  const nextPath = normalizeNextPath(String(formData.get("next") || "/auth-check"));

  const expectedEmail = (process.env.BOSAI_AUTH_EMAIL || "").trim().toLowerCase();
  const expectedPassword = (process.env.BOSAI_AUTH_PASSWORD || "").trim();

  if (!email || !password) {
    return {
      error: "Renseigne ton email et ton mot de passe.",
      ok: false,
      next: null,
    };
  }

  if (!expectedEmail || !expectedPassword) {
    return {
      error: "Configuration auth incomplète côté serveur.",
      ok: false,
      next: null,
    };
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return {
      error: "Identifiants invalides.",
      ok: false,
      next: null,
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    error: null,
    ok: true,
    next: nextPath,
  };
}
