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

const ADMIN_EMAIL =
  process.env.BOSAI_ADMIN_EMAIL?.trim().toLowerCase() || "";

const ADMIN_PASSWORD =
  process.env.BOSAI_ADMIN_PASSWORD?.trim() || "";

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  try {
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();

    const password = String(formData.get("password") || "");

    if (!email || !password) {
      return { error: "Email et mot de passe requis." };
    }

    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      return {
        error:
          "Variables d’authentification manquantes sur Vercel.",
      };
    }

    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return { error: "Identifiants invalides." };
    }

    const cookieStore = await cookies();

    cookieStore.set({
      name: AUTH_COOKIE_NAME,
      value: AUTH_COOKIE_VALUE,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (error) {
    console.error("BOSAI loginAction error:", error);
    return { error: "Erreur interne côté serveur." };
  }

  redirect("/");
}
