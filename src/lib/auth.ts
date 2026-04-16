export type SessionPayload = {
  email: string;
  exp: number;
};

export const AUTH_COOKIE_NAME =
  (process.env.AUTH_COOKIE_NAME ||
    process.env.BOSAI_AUTH_COOKIE_NAME ||
    "bosai_session").trim() || "bosai_session";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 jours

function getSessionSecret(): string {
  return (
    process.env.AUTH_SESSION_SECRET?.trim() ||
    process.env.BOSAI_AUTH_SESSION_SECRET?.trim() ||
    ""
  );
}

function getSubtle(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error("Web Crypto subtle API unavailable");
  }
  return subtle;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64url");
  }

  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64url"));
  }

  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4 || 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

function stringToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value));
}

function base64UrlToString(value: string): string {
  const bytes = base64UrlToBytes(value);
  return new TextDecoder().decode(bytes);
}

async function signValue(value: string, secret: string): Promise<string> {
  const subtle = getSubtle();

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

  return bytesToBase64Url(new Uint8Array(signature));
}

export function normalizeNextPath(value?: string | null): string {
  const raw = (value || "").trim();

  if (!raw) return "/commands";
  if (!raw.startsWith("/")) return "/commands";
  if (raw.startsWith("//")) return "/commands";
  if (raw.startsWith("/login")) return "/commands";

  return raw;
}

export async function createSessionToken(email: string): Promise<string> {
  const secret = getSessionSecret();

  if (!secret) {
    throw new Error("Missing AUTH_SESSION_SECRET");
  }

  const payload: SessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE_SECONDS,
  };

  const encodedPayload = stringToBase64Url(JSON.stringify(payload));
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
    const parsed = JSON.parse(base64UrlToString(encodedPayload)) as SessionPayload;

    if (!parsed?.email || !parsed?.exp) return null;
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return parsed;
  } catch {
    return null;
  }
}
