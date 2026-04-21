import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
import {
  hasCommercialOnboardingSignals,
  resolveBosaiAccessState,
} from "@/lib/onboarding-access";
import {
  getDashboardRouteForWorkspaceCategory,
  resolveWorkspaceAccess,
} from "@/lib/workspaces/resolver";
import {
  WORKSPACE_ROUTE_MEMORY_COOKIE_NAME,
  getRememberedRouteForWorkspace,
  readWorkspaceRememberedRoutes,
} from "@/lib/workspaces/route-memory";

const AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

const AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() ||
  "authenticated";

const WORKSPACE_ACTIVE_COOKIE_NAME =
  (
    process.env.BOSAI_ACTIVE_WORKSPACE_COOKIE_NAME ||
    "bosai_active_workspace_id"
  ).trim() || "bosai_active_workspace_id";

const WORKSPACE_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_COOKIE_NAME || "bosai_workspace_id").trim() ||
  "bosai_workspace_id";

const WORKSPACE_LEGACY_COOKIE_NAME =
  (process.env.BOSAI_WORKSPACE_LEGACY_COOKIE_NAME || "workspace_id").trim() ||
  "workspace_id";

const WORKSPACE_ALLOWED_COOKIE_NAME =
  (
    process.env.BOSAI_ALLOWED_WORKSPACES_COOKIE_NAME ||
    "bosai_allowed_workspace_ids"
  ).trim() || "bosai_allowed_workspace_ids";

function text(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.map((item) => text(item)).filter(Boolean)));
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

function buildRedirectUrl(request: NextRequest, path: string): URL {
  const normalized = text(path) || "/";
  return new URL(normalized, request.url);
}

function buildLoginUrl(request: NextRequest, nextPath: string): URL {
  const url = buildRedirectUrl(request, AUTH_LOGIN_ROUTE);

  if (text(nextPath)) {
    url.searchParams.set("next", nextPath);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const session = await resolveAuthSession();

  const nextParam =
    text(request.nextUrl.searchParams.get("next")) ||
    text(session.homeRoute) ||
    "/overview";

  if (!session.isAuthenticated) {
    return NextResponse.redirect(buildLoginUrl(request, nextParam));
  }

  const requestedWorkspaceId =
    text(request.nextUrl.searchParams.get("workspace_id")) ||
    text(session.cookieSnapshot.activeWorkspaceId);

  const onboardingCookieValues = {
    bosai_plan_code: request.cookies.get("bosai_plan_code")?.value,
    plan_code: request.cookies.get("plan_code")?.value,
    selected_plan: request.cookies.get("selected_plan")?.value,
    bosai_workspace_status: request.cookies.get("bosai_workspace_status")?.value,
    workspace_status: request.cookies.get("workspace_status")?.value,
    bosai_checkout_completed:
      request.cookies.get("bosai_checkout_completed")?.value,
    checkout_completed: request.cookies.get("checkout_completed")?.value,
    bosai_onboarding_completed:
      request.cookies.get("bosai_onboarding_completed")?.value,
    onboarding_completed: request.cookies.get("onboarding_completed")?.value,
    bosai_pending_workspace_id:
      request.cookies.get("bosai_pending_workspace_id")?.value,
  };

  const pendingWorkspaceId =
    text(onboardingCookieValues.bosai_pending_workspace_id) ||
    requestedWorkspaceId;

  const shouldUseCommercialSyntheticWorkspace =
    hasCommercialOnboardingSignals(onboardingCookieValues) &&
    resolveBosaiAccessState({
      cookieValues: onboardingCookieValues,
    }).canAccessCockpit &&
    Boolean(pendingWorkspaceId) &&
    (!requestedWorkspaceId || requestedWorkspaceId === pendingWorkspaceId);

  if (shouldUseCommercialSyntheticWorkspace) {
    const rememberedRoutes = readWorkspaceRememberedRoutes(
      request.cookies.get(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)?.value
    );

    const explicitNext = text(request.nextUrl.searchParams.get("next"));
    const rememberedTarget = getRememberedRouteForWorkspace(
      rememberedRoutes,
      pendingWorkspaceId
    );

    const finalTarget = explicitNext || rememberedTarget || "/workspace";
    const response = NextResponse.redirect(
      buildRedirectUrl(request, finalTarget)
    );

    const options = cookieOptions();

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, options);
    response.cookies.set(
      WORKSPACE_ACTIVE_COOKIE_NAME,
      pendingWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALIAS_COOKIE_NAME,
      pendingWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_LEGACY_COOKIE_NAME,
      pendingWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALLOWED_COOKIE_NAME,
      JSON.stringify([pendingWorkspaceId]),
      options
    );

    return response;
  }

  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId,
    nextPath: nextParam,
    onboardingCookieValues,
  });

  if (resolution.kind !== "allow_dashboard" || !resolution.activeWorkspace) {
    return NextResponse.redirect(
      buildRedirectUrl(request, resolution.redirectTo)
    );
  }

  const activeWorkspaceId = text(resolution.activeWorkspace.workspaceId);
  const allowedWorkspaceIds = uniq(
    resolution.memberships.map((item) => text(item.workspaceId))
  );

  const rememberedRoutes = readWorkspaceRememberedRoutes(
    request.cookies.get(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)?.value
  );

  const explicitNext = text(request.nextUrl.searchParams.get("next"));
  const rememberedTarget = getRememberedRouteForWorkspace(
    rememberedRoutes,
    activeWorkspaceId
  );
  const fallbackDashboard = getDashboardRouteForWorkspaceCategory(
    resolution.activeWorkspace.category
  );

  const finalTarget =
    explicitNext || rememberedTarget || fallbackDashboard || "/overview";

  const response = NextResponse.redirect(
    buildRedirectUrl(request, finalTarget)
  );

  const options = cookieOptions();

  response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, options);
  response.cookies.set(
    WORKSPACE_ACTIVE_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_ALIAS_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_LEGACY_COOKIE_NAME,
    activeWorkspaceId,
    options
  );
  response.cookies.set(
    WORKSPACE_ALLOWED_COOKIE_NAME,
    JSON.stringify(allowedWorkspaceIds),
    options
  );

  return response;
}
