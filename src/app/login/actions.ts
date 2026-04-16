"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type LoginActionState = {
  error: string | null;
};

export const initialLoginActionState: LoginActionState = {
  error: null,
};

const AUTH_COOKIE_NAME =
  process.env.BOSAI_AUTH_COOKIE_NAME?.trim() || "bosai_session";

const ADMIN_EMAIL =
  process.env.BOSAI_ADMIN_EMAIL?.trim().toLowerCase() || "";

const ADMIN_PASSWORD = process.env.BOSAI_ADMIN_PASSWORD || "";

function readEmail(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
}

function readPassword(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") return "";
  return value;
}

function buildSessionValue(email: string): string {
  const payload = {
    sub: email,
    ts: Date.now(),
    kind: "bosai-session",
  };

  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = readEmail(formData.get("email"));
  const password = readPassword(formData.get("password"));

  if (!email || !password) {
    return {
      error: "Email et mot de passe requis.",
    };
  }

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    return {
      error:
        "Configuration d’auth manquante. Ajoute BOSAI_ADMIN_EMAIL et BOSAI_ADMIN_PASSWORD dans Vercel.",
    };
  }

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return {
      error: "Identifiants invalides.",
    };
  }

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, buildSessionValue(email), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/");
}
