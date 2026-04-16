"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  AUTH_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  normalizeNextPath,
} from "@/lib/auth";

export type LoginActionState = {
  error: string | null;
};

export const initialLoginActionState: LoginActionState = {
  error: null,
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "").trim();

  const nextPath = normalizeNextPath(String(formData.get("next") || "/commands"));

  const expectedEmail = (
    process.env.AUTH_EMAIL ||
    process.env.BOSAI_AUTH_EMAIL ||
    ""
  )
    .trim()
    .toLowerCase();

  const expectedPassword =
    (process.env.AUTH_PASSWORD || process.env.BOSAI_AUTH_PASSWORD || "").trim();

  if (!email || !password) {
    return {
      error: "Renseigne ton email et ton mot de passe.",
    };
  }

  if (!expectedEmail || !expectedPassword) {
    return {
      error: "Configuration auth incomplète côté serveur.",
    };
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return {
      error: "Identifiants invalides.",
    };
  }

  let token: string;

  try {
    token = await createSessionToken(email);
  } catch {
    return {
      error: "Configuration session incomplète côté serveur.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

  redirect(nextPath);
}

export async function logoutAction() {
  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  redirect("/login");
}
