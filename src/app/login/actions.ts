"use server";

import { cookies } from "next/headers";

export async function loginAction(
  _prevState: { error: string | null; ok: boolean },
  formData: FormData
): Promise<{ error: string | null; ok: boolean }> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "").trim();

  const expectedEmail = (process.env.BOSAI_AUTH_EMAIL || "").trim().toLowerCase();
  const expectedPassword = (process.env.BOSAI_AUTH_PASSWORD || "").trim();

  if (!email || !password) {
    return {
      error: "Renseigne ton email et ton mot de passe.",
      ok: false,
    };
  }

  if (!expectedEmail || !expectedPassword) {
    return {
      error: "Configuration auth incomplète côté serveur.",
      ok: false,
    };
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return {
      error: "Identifiants invalides.",
      ok: false,
    };
  }

  const cookieStore = await cookies();

  cookieStore.set("bosai_auth", "authenticated", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return {
    error: null,
    ok: true,
  };
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies();

  cookieStore.set("bosai_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
