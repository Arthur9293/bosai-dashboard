import "server-only";

import { cookies } from "next/headers";

export type AppSession = {
  isAuthenticated: boolean;
  authToken: string;
  userId: string;
  email: string;
};

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() ||
  "authenticated";

const USER_ID_COOKIE_NAME =
  (process.env.BOSAI_USER_ID_COOKIE_NAME || "bosai_user_id").trim() ||
  "bosai_user_id";

const USER_EMAIL_COOKIE_NAME =
  (process.env.BOSAI_USER_EMAIL_COOKIE_NAME || "bosai_user_email").trim() ||
  "bosai_user_email";

const FALLBACK_USER_ID =
  (process.env.BOSAI_FALLBACK_USER_ID || "user_demo").trim() || "user_demo";

const FALLBACK_USER_EMAIL =
  (process.env.BOSAI_FALLBACK_USER_EMAIL || "demo@bosai.local").trim() ||
  "demo@bosai.local";

function normalizeText(value: string | undefined | null): string {
  return String(value || "").trim();
}

function deriveUserIdFromEmail(email: string): string {
  const normalized = normalizeText(email).toLowerCase();
  if (!normalized) {
    return FALLBACK_USER_ID;
  }

  const localPart = normalized.split("@")[0] || "";
  const safe = localPart
    .replace(/[^a-z0-9_-]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return safe || FALLBACK_USER_ID;
}

export async function getServerSession(): Promise<AppSession> {
  const cookieStore = await cookies();

  const authToken = normalizeText(cookieStore.get(AUTH_COOKIE_NAME)?.value);
  const isAuthenticated = authToken === AUTH_COOKIE_VALUE;

  if (!isAuthenticated) {
    return {
      isAuthenticated: false,
      authToken: "",
      userId: "",
      email: "",
    };
  }

  const emailFromCookie = normalizeText(
    cookieStore.get(USER_EMAIL_COOKIE_NAME)?.value
  );
  const userIdFromCookie = normalizeText(
    cookieStore.get(USER_ID_COOKIE_NAME)?.value
  );

  const email = emailFromCookie || FALLBACK_USER_EMAIL;
  const userId = userIdFromCookie || deriveUserIdFromEmail(email);

  return {
    isAuthenticated: true,
    authToken,
    userId,
    email,
  };
}

export async function isServerAuthenticated(): Promise<boolean> {
  const session = await getServerSession();
  return session.isAuthenticated;
}
