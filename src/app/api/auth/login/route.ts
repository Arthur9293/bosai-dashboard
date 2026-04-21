import { NextResponse } from "next/server";
import {
  MOCK_ACTIVE_WORKSPACE_COOKIE_NAME,
  MOCK_ALLOWED_WORKSPACES_COOKIE_NAME,
  MOCK_AUTH_COOKIE_NAME,
  MOCK_AUTH_COOKIE_VALUE,
  MOCK_DEDICATED_SPACE_COOKIE_NAME,
  MOCK_SESSION_TOKEN_COOKIE_NAME,
  MOCK_USER_ID_COOKIE_NAME,
  buildMockSessionCookiePayload,
  getMockSessionForUserCategory,
  resolveMockSession,
} from "@/lib/auth/mock-session";
import type { WorkspaceCategory } from "@/lib/workspaces/types";

const WORKSPACE_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_COOKIE_NAME || "bosai_workspace_id").trim() ||
  "bosai_workspace_id";

const WORKSPACE_LEGACY_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_LEGACY_COOKIE_NAME || "workspace_id").trim() ||
  "workspace_id";

function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  return "";
}

function normalizeInternalPath(value: unknown): string {
  const v = text(value);
  if (!v.startsWith("/")) return "";
  if (v.startsWith("//")) return "";
  return v;
}

function normalizeCategory(value: unknown): WorkspaceCategory | null {
  const v = text(value).toLowerCase();

  if (v === "personal") return "personal";
  if (v === "freelance") return "freelance";
  if (v === "company") return "company";
  if (v === "agency") return "agency";

  return null;
}

function isCommercialOnboardingPath(pathname: string): boolean {
  const path = normalizeInternalPath(pathname);

  return (
    path.startsWith("/pricing") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/workspace/create")
  );
}

function getCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function clearCookie(response: NextResponse, name: string) {
  response.cookies.set(name, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

function readCookieValue(cookieHeader: string, name: string): string {
  const parts = cookieHeader.split(";");

  for (const part of parts) {
    const [rawKey, ...rest] = part.split("=");
    if (text(rawKey) !== name) continue;
    return decodeURIComponent(rest.join("=") || "");
  }

  return "";
}

function resolveBootstrapSession(args: {
  existingWorkspaceId?: string;
}) {
  const preferredCategory =
    normalizeCategory(process.env.BOSAI_AUTH_PREFERRED_CATEGORY) || null;

  const configuredToken = text(
    process.env.BOSAI_AUTH_SESSION_TOKEN ||
      process.env.BOSAI_MOCK_SESSION_TOKEN ||
      "arthur_token"
  );

  const configuredUserId = text(
    process.env.BOSAI_AUTH_USER_ID ||
      process.env.BOSAI_MOCK_USER_ID ||
      "user_arthur"
  );

  const requestedWorkspaceId = text(args.existingWorkspaceId);

  const byToken = resolveMockSession({
    token: configuredToken,
    requestedWorkspaceId,
    preferredCategory,
  });

  if (byToken.isAuthenticated && byToken.workspace) {
    return byToken;
  }

  const byUser = getMockSessionForUserCategory(
    configuredUserId,
    preferredCategory || undefined
  );

  if (byUser.isAuthenticated && byUser.workspace) {
    if (requestedWorkspaceId) {
      const retried = resolveMockSession({
        token: byUser.token,
        requestedWorkspaceId,
        preferredCategory,
      });

      if (retried.isAuthenticated && retried.workspace) {
        return retried;
      }
    }

    return byUser;
  }

  return resolveMockSession({
    token: "arthur_token",
    requestedWorkspaceId,
  });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    const cookieHeader = request.headers.get("cookie") || "";

    let email = "";
    let password = "";
    let next = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
        next?: string;
      };

      email = String(body.email || "").trim().toLowerCase();
      password = String(body.password || "").trim();
      next = normalizeInternalPath(body.next);
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") || "").trim().toLowerCase();
      password = String(formData.get("password") || "").trim();
      next = normalizeInternalPath(formData.get("next"));
    }

    const expectedEmail = text(process.env.BOSAI_AUTH_EMAIL).toLowerCase();
    const expectedPassword = text(process.env.BOSAI_AUTH_PASSWORD);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Renseigne ton email et ton mot de passe." },
        { status: 400 }
      );
    }

    if (!expectedEmail || !expectedPassword) {
      return NextResponse.json(
        { ok: false, error: "Configuration auth incomplète côté serveur." },
        { status: 500 }
      );
    }

    if (email !== expectedEmail || password !== expectedPassword) {
      return NextResponse.json(
        { ok: false, error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const onboardingMode = isCommercialOnboardingPath(next);
    const cookieOptions = getCookieOptions();

    const response = NextResponse.json({
      ok: true,
      route: next || "/workspace",
    });

    response.cookies.set(
      MOCK_AUTH_COOKIE_NAME,
      MOCK_AUTH_COOKIE_VALUE,
      cookieOptions
    );

    if (onboardingMode) {
      [
        MOCK_SESSION_TOKEN_COOKIE_NAME,
        MOCK_USER_ID_COOKIE_NAME,
        MOCK_DEDICATED_SPACE_COOKIE_NAME,
        MOCK_ACTIVE_WORKSPACE_COOKIE_NAME,
        MOCK_ALLOWED_WORKSPACES_COOKIE_NAME,
        WORKSPACE_ALIAS_COOKIE_NAME,
        WORKSPACE_LEGACY_COOKIE_NAME,
      ].forEach((cookieName) => clearCookie(response, cookieName));

      return response;
    }

    const existingWorkspaceId =
      readCookieValue(cookieHeader, MOCK_ACTIVE_WORKSPACE_COOKIE_NAME) ||
      readCookieValue(cookieHeader, WORKSPACE_ALIAS_COOKIE_NAME) ||
      readCookieValue(cookieHeader, WORKSPACE_LEGACY_COOKIE_NAME);

    const session = resolveBootstrapSession({
      existingWorkspaceId,
    });

    const cookiePayload = buildMockSessionCookiePayload(session);

    if (!cookiePayload || !session.workspace) {
      return NextResponse.json(
        { ok: false, error: "Impossible d’initialiser la session workspace." },
        { status: 500 }
      );
    }

    for (const [name, value] of Object.entries(cookiePayload)) {
      response.cookies.set(name, value, cookieOptions);
    }

    response.cookies.set(
      WORKSPACE_ALIAS_COOKIE_NAME,
      session.workspace.workspaceId,
      cookieOptions
    );

    response.cookies.set(
      WORKSPACE_LEGACY_COOKIE_NAME,
      session.workspace.workspaceId,
      cookieOptions
    );

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur serveur pendant la connexion." },
      { status: 500 }
    );
  }
}
