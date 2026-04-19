import { NextResponse } from "next/server";
import type { WorkspaceCategory } from "@/lib/workspaces/types";
import {
  buildLoginCookieBundle,
  getAuthCookieWriteOptions,
} from "@/lib/auth/resolve-auth-session";

type LoginBody = {
  email?: string;
  password?: string;
  preferredCategory?: string;
  requestedWorkspaceId?: string;
};

const DEMO_EMAIL_TOKEN_MAP: Record<string, string> = {
  "arthur@bosai.local": "arthur_token",
  "personal@bosai.local": "demo_personal_token",
  "freelance@bosai.local": "demo_freelance_token",
  "company@bosai.local": "demo_company_token",
  "agency@bosai.local": "demo_agency_token",
  "viewer@bosai.local": "demo_viewer_token",
};

function text(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function normalizedEmail(value: unknown): string {
  return text(value).toLowerCase();
}

function resolveRequestedWorkspaceId(value: unknown): string {
  return text(value);
}

function resolvePreferredCategory(
  value: unknown
): WorkspaceCategory | undefined {
  const normalized = text(value).toLowerCase();

  if (normalized === "personal") return "personal";
  if (normalized === "freelance") return "freelance";
  if (normalized === "company") return "company";
  if (normalized === "agency") return "agency";

  return undefined;
}

function getConfiguredCredentials() {
  return {
    expectedEmail: normalizedEmail(process.env.BOSAI_AUTH_EMAIL || ""),
    expectedPassword: text(process.env.BOSAI_AUTH_PASSWORD || ""),
    configuredToken:
      text(process.env.BOSAI_SESSION_TOKEN || "") ||
      text(process.env.BOSAI_DEFAULT_SESSION_TOKEN || ""),
  };
}

function getDemoPassword(): string {
  return (
    text(process.env.BOSAI_MOCK_LOGIN_PASSWORD || "") ||
    text(process.env.BOSAI_AUTH_PASSWORD || "") ||
    "bosai"
  );
}

function isConfiguredCredentialMatch(email: string, password: string): boolean {
  const { expectedEmail, expectedPassword } = getConfiguredCredentials();

  if (!expectedEmail || !expectedPassword) return false;
  return email === expectedEmail && password === expectedPassword;
}

function isDemoCredentialMatch(email: string, password: string): boolean {
  const demoPassword = getDemoPassword();
  return Boolean(DEMO_EMAIL_TOKEN_MAP[email]) && password === demoPassword;
}

function resolveTokenForEmail(email: string): string {
  const { expectedEmail, configuredToken } = getConfiguredCredentials();

  if (configuredToken && expectedEmail && email === expectedEmail) {
    return configuredToken;
  }

  return DEMO_EMAIL_TOKEN_MAP[email] || configuredToken || "arthur_token";
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let body: LoginBody = {};

    if (contentType.includes("application/json")) {
      body = (await request.json()) as LoginBody;
    } else {
      const formData = await request.formData();
      body = {
        email: text(formData.get("email")),
        password: text(formData.get("password")),
        preferredCategory: text(formData.get("preferredCategory")),
        requestedWorkspaceId: text(formData.get("requestedWorkspaceId")),
      };
    }

    const email = normalizedEmail(body.email);
    const password = text(body.password);
    const preferredCategory = resolvePreferredCategory(body.preferredCategory);
    const requestedWorkspaceId = resolveRequestedWorkspaceId(
      body.requestedWorkspaceId
    );

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Renseigne ton email et ton mot de passe." },
        { status: 400 }
      );
    }

    const validCredential =
      isConfiguredCredentialMatch(email, password) ||
      isDemoCredentialMatch(email, password);

    if (!validCredential) {
      return NextResponse.json(
        { ok: false, error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const token = resolveTokenForEmail(email);

    const login = buildLoginCookieBundle({
      token,
      requestedWorkspaceId: requestedWorkspaceId || undefined,
      preferredCategory,
    });

    if (!login.cookiePayload || !login.session.isAuthenticated) {
      return NextResponse.json(
        { ok: false, error: "Impossible d’initialiser la session." },
        { status: 500 }
      );
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: login.route || login.session.homeRoute || "/overview",
      activeWorkspaceId: login.session.workspace?.workspaceId || "",
      allowedWorkspaceIds: login.session.allowedWorkspaceIds,
      dedicatedSpace: login.session.target || "",
      user: login.session.user
        ? {
            userId: login.session.user.userId,
            email: login.session.user.email,
            displayName: login.session.user.displayName,
            preferredCategory: login.session.user.preferredCategory,
          }
        : null,
    });

    const cookieOptions = getAuthCookieWriteOptions();

    for (const [name, value] of Object.entries(login.cookiePayload)) {
      response.cookies.set(name, value, cookieOptions);
    }

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Erreur serveur pendant la connexion." },
      { status: 500 }
    );
  }
}
