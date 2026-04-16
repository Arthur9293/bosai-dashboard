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
  process.env.BOSAI_AUTH_COOKIE_NAME?.trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  process.env.BOSAI_AUTH_COOKIE_VALUE?.trim() || "authenticated";

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();

  const password = String(formData.get("password") || "").trim();

  const expectedEmail = process.env.BOSAI_AUTH_EMAIL?.trim().toLowerCase();
  const expectedPassword = process.env.BOSAI_AUTH_PASSWORD?.trim();

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

  const cookieStore = await cookies();

  cookieStore.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/commands");
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
