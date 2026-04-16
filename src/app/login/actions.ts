"use server";

export type LoginActionState = {
  error: string | null;
  ok: boolean;
};

export const initialLoginActionState: LoginActionState = {
  error: null,
  ok: false,
};

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
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

  return {
    error: null,
    ok: true,
  };
}
