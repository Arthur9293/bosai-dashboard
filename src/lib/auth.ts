import { webcrypto } from "node:crypto";

export type SessionPayload = {
  email: string;
  exp: number;
};

export const AUTH_COOKIE_NAME =
  (
    process.env.BOSAI_AUTH_COOKIE_NAME ||
    process.env.AUTH_COOKIE_NAME ||
    "bosai_session"
  ).trim() || "bosai_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 jours

const subtle = globalThis.crypto?.subtle ?? webcrypto.subtle;

function getSessionSecret(): string {
  return (
    process.env.BOSAI_AUTH_SESSION_SECRET ||
    process.env.AUTH_SESSION_SECRET ||
    ""
  ).trim();
}

function requireSessionSecret(): string {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error(
      "Missing session secret. Set BOSAI_AUTH_SESSION_SECRET (or AUTH_SESSION_SECRET)."
    );
  }

  return secret;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8").toString("base64url");
}

function base64UrlDecode(input: string): string {
  return Buffer.from(input, "base64url").toString("utf8");
}

async function signValue(value: string, secret: string): Promise<string> {
  const key = await subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  );

  return Buffer.from(signature).toString("base64url");
}

export function normalizeNextPath(value?: string | null): string {
  const raw = (value || "").trim();

  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//")) return "/";
  if (raw.startsWith("/login")) return "/";

  return raw;
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = requireSessionSecret();

  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = await signValue(encodedPayload, secret);

  return `${encodedPayload}.${signature}`;
}

export async function verifySessionToken(
  token?: string | null
): Promise<SessionPayload | null> {
  const secret = getSessionSecret();

  if (!secret || !token) return null;

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) return null;

  const expectedSignature = await signValue(encodedPayload, secret);
  if (signature !== expectedSignature) return null;

  try {
    const parsed = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!parsed?.email || !parsed?.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch {
    return null;
  }
}
