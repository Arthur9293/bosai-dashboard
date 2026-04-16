import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const WORKSPACE_ACTIVE_COOKIE_NAME =
  (process.env.BOSAI_ACTIVE_WORKSPACE_COOKIE_NAME || "bosai_active_workspace_id").trim() ||
  "bosai_active_workspace_id";

const WORKSPACE_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_COOKIE_NAME || "bosai_workspace_id").trim() ||
  "bosai_workspace_id";

const WORKSPACE_LEGACY_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_LEGACY_COOKIE_NAME || "workspace_id").trim() ||
  "workspace_id";

const WORKSPACE_ALLOWED_COOKIE_NAME =
  (process.env.BOSAI_ALLOWED_WORKSPACES_COOKIE_NAME || "bosai_allowed_workspace_ids").trim() ||
  "bosai_allowed_workspace_ids";

function expiredCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const options = expiredCookieOptions();

  response.cookies.set(AUTH_COOKIE_NAME, "", options);
  response.cookies.set(WORKSPACE_ACTIVE_COOKIE_NAME, "", options);
  response.cookies.set(WORKSPACE_ALIAS_COOKIE_NAME, "", options);
  response.cookies.set(WORKSPACE_LEGACY_COOKIE_NAME, "", options);
  response.cookies.set(WORKSPACE_ALLOWED_COOKIE_NAME, "", options);

  return response;
}
