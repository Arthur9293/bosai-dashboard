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

function getExpectedEmail(): string {
  return (
    process.env.AUTH_LOGIN_EMAIL?.trim().toLowerCase() ||
    process.env.BOSAI_AUTH_EMAIL?.trim().toLowerCase() ||
    ""
  );
}

function getExpectedPassword(): string {
  return (
    process.env.AUTH_LOGIN_PASSWORD?.trim() ||
    process.env.BOSAI_AUTH_PASSWORD?.trim() ||
    ""
  );
}

function hasSessionSecret(): boolean {
  return Boolean(
    process.env.AUTH_SESSION_SECRET?.trim() ||
      process.env.BOSAI_AUTH_SESSION_SECRET?.trim()
  );
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "").trim();
  const next = normalizeNextPath(String(formData.get("next") || "/commands"));

  const expectedEmail = getExpectedEmail();
  const expectedPassword = getExpectedPassword();

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

  if (!hasSessionSecret()) {
    return {
      error: "AUTH_SESSION_SECRET manque côté Vercel.",
    };
  }

  if (email !== expectedEmail || password !== expectedPassword) {
    return {
      error: "Identifiants invalides.",
    };
  }

  try {
    const token = await createSessionToken(email);
    const cookieStore = await cookies();

    cookieStore.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
  } catch {
    return {
      error: "Impossible de créer la session.",
    };
  }

  redirect(next);
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
