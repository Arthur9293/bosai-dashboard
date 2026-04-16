const AUTH_COOKIE_NAME = "bosai_session"
const LOGIN_PATH = "/login"

function getSessionSecret(): string {
  return process.env.BOSAI_SESSION_SECRET || ""
}

function getLoginUsername(): string {
  return process.env.BOSAI_LOGIN_USERNAME || ""
}

function getLoginPassword(): string {
  return process.env.BOSAI_LOGIN_PASSWORD || ""
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function textToBase64Url(value: string): string {
  return bytesToBase64Url(new TextEncoder().encode(value))
}

async function sign(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value)
  )

  return bytesToBase64Url(new Uint8Array(signature))
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false

  let out = 0

  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return out === 0
}

export function isAuthConfigured(): boolean {
  return Boolean(getSessionSecret() && getLoginUsername() && getLoginPassword())
}

export function getExpectedUsername(): string {
  return getLoginUsername()
}

export function getExpectedPassword(): string {
  return getLoginPassword()
}

export async function createSessionToken(username: string): Promise<string> {
  const secret = getSessionSecret()

  if (!secret) {
    throw new Error("missing_session_secret")
  }

  const payload = textToBase64Url(
    JSON.stringify({
      username,
      iat: Date.now(),
    })
  )

  const signature = await sign(payload, secret)

  return `${payload}.${signature}`
}

export async function verifySessionToken(
  token?: string | null
): Promise<{ valid: boolean; username: string | null }> {
  if (!token) {
    return { valid: false, username: null }
  }

  const secret = getSessionSecret()

  if (!secret) {
    return { valid: false, username: null }
  }

  const [payload, signature] = token.split(".")

  if (!payload || !signature) {
    return { valid: false, username: null }
  }

  const expected = await sign(payload, secret)

  if (!safeEqual(signature, expected)) {
    return { valid: false, username: null }
  }

  try {
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    const username =
      decoded && typeof decoded === "object" && typeof decoded.username === "string"
        ? decoded.username
        : null

    if (!username) {
      return { valid: false, username: null }
    }

    return { valid: true, username }
  } catch {
    return { valid: false, username: null }
  }
}

export { AUTH_COOKIE_NAME, LOGIN_PATH }
