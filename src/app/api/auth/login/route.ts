import { NextResponse } from "next/server";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() || "authenticated";

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

function text(value: unknown): string {
  if (typeof value === "string") {
    const v = value.trim();
    return v || "";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((v) => text(v)).filter(Boolean)));
}

function parseWorkspaceIds(value: string): string[] {
  const raw = value.trim();
  if (!raw) return [];

  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return uniq(parsed.map((item) => text(item)));
      }
    } catch {
      return [];
    }
  }

  if (raw.includes(",")) {
    return uniq(raw.split(","));
  }

  return raw ? [raw] : [];
}

function resolveWorkspaceSession(): {
  allowedWorkspaceIds: string[];
  activeWorkspaceId: string;
} {
  const envAllowed = uniq([
    ...parseWorkspaceIds(process.env.BOSAI_ALLOWED_WORKSPACE_IDS || ""),
    ...parseWorkspaceIds(process.env.BOSAI_AUTH_ALLOWED_WORKSPACE_IDS || ""),
  ]);

  const envActive = text(
    process.env.BOSAI_ACTIVE_WORKSPACE_ID ||
      process.env.BOSAI_DEFAULT_WORKSPACE_ID ||
      process.env.BOSAI_WORKSPACE_ID ||
      ""
  );

  const allowedWorkspaceIds =
    envAllowed.length > 0
      ? envAllowed
      : envActive
        ? [envActive]
        : ["production"];

  const activeWorkspaceId =
    envActive && allowedWorkspaceIds.includes(envActive)
      ? envActive
      : allowedWorkspaceIds[0] || "production";

  return {
    allowedWorkspaceIds,
    activeWorkspaceId,
  };
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

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";

    let email = "";
    let password = "";

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as {
        email?: string;
        password?: string;
      };

      email = String(body.email || "")
        .trim()
        .toLowerCase();
      password = String(body.password || "").trim();
    } else {
      const formData = await request.formData();
      email = String(formData.get("email") || "")
        .trim()
        .toLowerCase();
      password = String(formData.get("password") || "").trim();
    }

    const expectedEmail = (process.env.BOSAI_AUTH_EMAIL || "")
      .trim()
      .toLowerCase();
    const expectedPassword = (process.env.BOSAI_AUTH_PASSWORD || "").trim();

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

    const { allowedWorkspaceIds, activeWorkspaceId } = resolveWorkspaceSession();
    const cookieOptions = getCookieOptions();

    const response = NextResponse.json({
      ok: true,
      activeWorkspaceId,
      allowedWorkspaceIds,
    });

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, cookieOptions);

    response.cookies.set(
      WORKSPACE_ACTIVE_COOKIE_NAME,
      activeWorkspaceId,
      cookieOptions
    );

    response.cookies.set(
      WORKSPACE_ALIAS_COOKIE_NAME,
      activeWorkspaceId,
      cookieOptions
    );

    response.cookies.set(
      WORKSPACE_LEGACY_COOKIE_NAME,
      activeWorkspaceId,
      cookieOptions
    );

    response.cookies.set(
      WORKSPACE_ALLOWED_COOKIE_NAME,
      JSON.stringify(allowedWorkspaceIds),
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
