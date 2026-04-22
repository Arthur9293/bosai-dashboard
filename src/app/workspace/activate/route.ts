import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_LOGIN_ROUTE,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";
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

const WORKSPACE_STATUS_COOKIE_NAME =
  (
    process.env.BOSAI_WORKSPACE_STATUS_COOKIE_NAME ||
    "bosai_workspace_status"
  ).trim() || "bosai_workspace_status";

const WORKSPACE_STATUS_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_WORKSPACE_STATUS_ALIAS_COOKIE_NAME ||
    "workspace_status"
  ).trim() || "workspace_status";

const ONBOARDING_COMPLETED_COOKIE_NAME =
  (
    process.env.BOSAI_ONBOARDING_COMPLETED_COOKIE_NAME ||
    "bosai_onboarding_completed"
  ).trim() || "bosai_onboarding_completed";

const ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME ||
    "onboarding_completed"
  ).trim() || "onboarding_completed";

const CHECKOUT_COMPLETED_COOKIE_NAME =
  (
    process.env.BOSAI_CHECKOUT_COMPLETED_COOKIE_NAME ||
    "bosai_checkout_completed"
  ).trim() || "bosai_checkout_completed";

const CHECKOUT_COMPLETED_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_CHECKOUT_COMPLETED_ALIAS_COOKIE_NAME ||
    "checkout_completed"
  ).trim() || "checkout_completed";

const PENDING_WORKSPACE_COOKIE_NAME =
  (
    process.env.BOSAI_PENDING_WORKSPACE_COOKIE_NAME ||
    "bosai_pending_workspace_id"
  ).trim() || "bosai_pending_workspace_id";

const DEDICATED_SPACE_COOKIE_NAME =
  (
    process.env.BOSAI_DEDICATED_SPACE_COOKIE_NAME ||
    "bosai_dedicated_space"
  ).trim() || "bosai_dedicated_space";

const DEDICATED_SPACE_ALIAS_COOKIE_NAME =
  (
    process.env.BOSAI_DEDICATED_SPACE_ALIAS_COOKIE_NAME || "dedicated_space"
  ).trim() || "dedicated_space";

const PLAN_COOKIE_NAME =
  (process.env.BOSAI_PLAN_COOKIE_NAME || "bosai_plan_code").trim() ||
  "bosai_plan_code";

const PLAN_ALIAS_COOKIE_NAME =
  (process.env.BOSAI_PLAN_ALIAS_COOKIE_NAME || "plan_code").trim() ||
  "plan_code";

const SELECTED_PLAN_COOKIE_NAME =
  (process.env.BOSAI_SELECTED_PLAN_COOKIE_NAME || "selected_plan").trim() ||
  "selected_plan";

const MANUAL_WORKSPACE_SELECT_HREF = "/workspace/select?manual=1";
const DEFAULT_DASHBOARD_TARGET = "/workspace";

type CommercialPlanCode = "starter" | "pro" | "agency" | "custom";

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

function normalizeInternalPath(value: unknown): string {
  const normalized = text(value);

  if (!normalized.startsWith("/")) return "";
  if (normalized.startsWith("//")) return "";

  return normalized;
}

function normalizePlanCode(value?: string | null): CommercialPlanCode {
  const normalized = text(value).toLowerCase();

  if (normalized === "pro") return "pro";
  if (normalized === "agency") return "agency";
  if (normalized === "custom") return "custom";
  return "starter";
}

function inferPlanCodeFromWorkspaceId(
  workspaceId?: string | null
): CommercialPlanCode {
  const normalized = text(workspaceId).toLowerCase();

  if (normalized.endsWith("_pro")) return "pro";
  if (normalized.endsWith("_agency")) return "agency";
  if (normalized.endsWith("_custom")) return "custom";
  return "starter";
}

function resolveOnboardingPlanCode(args: {
  workspaceId?: string | null;
  cookieValues: Record<string, string | undefined>;
}): CommercialPlanCode {
  return normalizePlanCode(
    args.cookieValues.bosai_plan_code ||
      args.cookieValues.plan_code ||
      args.cookieValues.selected_plan ||
      inferPlanCodeFromWorkspaceId(args.workspaceId)
  );
}

function getDedicatedSpaceForPlan(planCode: CommercialPlanCode): string {
  if (planCode === "agency") return "agency_space";
  if (planCode === "custom") return "company_space";
  if (planCode === "pro") return "freelance_space";
  return "personal_space";
}

function isOnboardingWorkspaceId(value?: string | null): boolean {
  return text(value).startsWith("ws_onboarding_");
}

function isActivatePath(path: string): boolean {
  const normalized = normalizeInternalPath(path);
  return (
    normalized === "/workspace/activate" ||
    normalized.startsWith("/workspace/activate?")
  );
}

function isLoginPath(path: string): boolean {
  const normalized = normalizeInternalPath(path);
  return (
    normalized === AUTH_LOGIN_ROUTE ||
    normalized.startsWith(`${AUTH_LOGIN_ROUTE}?`)
  );
}

function sanitizeRedirectTarget(
  candidate: string,
  fallback: string
): string {
  const normalizedCandidate = normalizeInternalPath(candidate);
  const normalizedFallback =
    normalizeInternalPath(fallback) || DEFAULT_DASHBOARD_TARGET;

  if (!normalizedCandidate) {
    return normalizedFallback;
  }

  if (isActivatePath(normalizedCandidate)) {
    return normalizedFallback;
  }

  if (isLoginPath(normalizedCandidate)) {
    return normalizedFallback;
  }

  return normalizedCandidate;
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
  const normalized = normalizeInternalPath(path) || "/";
  return new URL(normalized, request.url);
}

function buildLoginUrl(request: NextRequest, nextPath: string): URL {
  const url = buildRedirectUrl(request, AUTH_LOGIN_ROUTE);
  const normalizedNext = normalizeInternalPath(nextPath);

  if (normalizedNext) {
    url.searchParams.set("next", normalizedNext);
  }

  return url;
}

function isDebugEnabled(request: NextRequest): boolean {
  const queryDebug = text(request.nextUrl.searchParams.get("debug")).toLowerCase();
  const envDebug = text(process.env.BOSAI_ACTIVATE_DEBUG).toLowerCase();

  return (
    queryDebug === "1" ||
    queryDebug === "true" ||
    envDebug === "1" ||
    envDebug === "true"
  );
}

function attachDebugHeaders(
  response: NextResponse,
  args: {
    mode: string;
    requestedWorkspaceId: string;
    finalTarget: string;
    planCode?: string;
  }
) {
  response.headers.set("x-bosai-activate-mode", args.mode);
  response.headers.set(
    "x-bosai-activate-workspace",
    args.requestedWorkspaceId || "none"
  );
  response.headers.set("x-bosai-activate-target", args.finalTarget || "none");

  if (args.planCode) {
    response.headers.set("x-bosai-activate-plan", args.planCode);
  }
}

export async function GET(request: NextRequest) {
  const debugEnabled = isDebugEnabled(request);
  const session = await resolveAuthSession();

  const explicitNextParam = normalizeInternalPath(
    request.nextUrl.searchParams.get("next")
  );

  const nextParam =
    explicitNextParam || normalizeInternalPath(session.homeRoute) || "/overview";

  if (!session.isAuthenticated) {
    if (debugEnabled) {
      return NextResponse.json(
        {
          ok: false,
          debug: "activate_route",
          stage: "unauthenticated",
          nextParam,
          redirectTo: buildLoginUrl(request, nextParam).toString(),
        },
        { status: 200 }
      );
    }

    return NextResponse.redirect(buildLoginUrl(request, nextParam));
  }

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
    bosai_force_commercial_onboarding:
      request.cookies.get("bosai_force_commercial_onboarding")?.value,
    force_commercial_onboarding:
      request.cookies.get("force_commercial_onboarding")?.value,
  };

  const requestedWorkspaceId =
    text(request.nextUrl.searchParams.get("workspace_id")) ||
    text(onboardingCookieValues.bosai_pending_workspace_id) ||
    text(session.cookieSnapshot.activeWorkspaceId);

  /**
   * Fast-path critique pour workspace onboarding synthétique
   */
  if (isOnboardingWorkspaceId(requestedWorkspaceId)) {
    const planCode = resolveOnboardingPlanCode({
      workspaceId: requestedWorkspaceId,
      cookieValues: onboardingCookieValues,
    });

    const dedicatedSpace = getDedicatedSpaceForPlan(planCode);

    const allowedWorkspaceIds = uniq([
      requestedWorkspaceId,
      ...session.cookieSnapshot.allowedWorkspaceIds,
    ]);

    const finalTarget = sanitizeRedirectTarget(
      explicitNextParam || DEFAULT_DASHBOARD_TARGET,
      DEFAULT_DASHBOARD_TARGET
    );

    if (debugEnabled) {
      return NextResponse.json(
        {
          ok: true,
          debug: "activate_route",
          mode: "fast_path_onboarding",
          explicitNextParam,
          nextParam,
          finalTarget,
          requestedWorkspaceId,
          planCode,
          dedicatedSpace,
          onboardingCookieValues,
          sessionSnapshot: {
            isAuthenticated: session.isAuthenticated,
            homeRoute: session.homeRoute,
            activeWorkspaceId: session.cookieSnapshot.activeWorkspaceId,
            allowedWorkspaceIds: session.cookieSnapshot.allowedWorkspaceIds,
            dedicatedSpace: session.cookieSnapshot.dedicatedSpace,
          },
        },
        { status: 200 }
      );
    }

    const response = NextResponse.redirect(
      buildRedirectUrl(request, finalTarget)
    );

    const options = cookieOptions();

    response.cookies.set(AUTH_COOKIE_NAME, AUTH_COOKIE_VALUE, options);
    response.cookies.set(
      WORKSPACE_ACTIVE_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALIAS_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_LEGACY_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );
    response.cookies.set(
      WORKSPACE_ALLOWED_COOKIE_NAME,
      JSON.stringify(allowedWorkspaceIds),
      options
    );

    response.cookies.set(WORKSPACE_STATUS_COOKIE_NAME, "active", options);
    response.cookies.set(WORKSPACE_STATUS_ALIAS_COOKIE_NAME, "active", options);
    response.cookies.set(ONBOARDING_COMPLETED_COOKIE_NAME, "1", options);
    response.cookies.set(ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME, "1", options);
    response.cookies.set(CHECKOUT_COMPLETED_COOKIE_NAME, "1", options);
    response.cookies.set(CHECKOUT_COMPLETED_ALIAS_COOKIE_NAME, "1", options);

    response.cookies.set(
      PENDING_WORKSPACE_COOKIE_NAME,
      requestedWorkspaceId,
      options
    );

    response.cookies.set(DEDICATED_SPACE_COOKIE_NAME, dedicatedSpace, options);
    response.cookies.set(
      DEDICATED_SPACE_ALIAS_COOKIE_NAME,
      dedicatedSpace,
      options
    );

    response.cookies.set(PLAN_COOKIE_NAME, planCode, options);
    response.cookies.set(PLAN_ALIAS_COOKIE_NAME, planCode, options);
    response.cookies.set(SELECTED_PLAN_COOKIE_NAME, planCode, options);

    attachDebugHeaders(response, {
      mode: "fast_path_onboarding",
      requestedWorkspaceId,
      finalTarget,
      planCode,
    });

    return response;
  }

  /**
   * Fallback standard pour workspaces normaux
   */
  const resolution = await resolveWorkspaceAccess({
    userId: text(session.user?.userId),
    requestedWorkspaceId,
    nextPath: nextParam,
    onboardingCookieValues,
  });

  if (debugEnabled) {
    return NextResponse.json(
      {
        ok: true,
        debug: "activate_route",
        mode: "resolver_fallback",
        explicitNextParam,
        nextParam,
        requestedWorkspaceId,
        onboardingCookieValues,
        sessionSnapshot: {
          isAuthenticated: session.isAuthenticated,
          homeRoute: session.homeRoute,
          activeWorkspaceId: session.cookieSnapshot.activeWorkspaceId,
          allowedWorkspaceIds: session.cookieSnapshot.allowedWorkspaceIds,
          dedicatedSpace: session.cookieSnapshot.dedicatedSpace,
        },
        resolution: {
          kind: resolution.kind,
          reason: resolution.reason,
          redirectTo: resolution.redirectTo,
          dashboardRoute: resolution.dashboardRoute,
          autoActivateWorkspaceId: resolution.autoActivateWorkspaceId,
          activeWorkspaceId: resolution.activeWorkspace?.workspaceId || "",
          memberships: resolution.memberships.map((item) => ({
            workspaceId: item.workspaceId,
            slug: item.slug,
            name: item.name,
            category: item.category,
            plan: item.plan,
            status: item.status,
          })),
        },
      },
      { status: 200 }
    );
  }

  if (resolution.kind !== "allow_dashboard" || !resolution.activeWorkspace) {
    const redirectTarget = sanitizeRedirectTarget(
      normalizeInternalPath(resolution.redirectTo) ||
        MANUAL_WORKSPACE_SELECT_HREF,
      MANUAL_WORKSPACE_SELECT_HREF
    );

    const response = NextResponse.redirect(
      buildRedirectUrl(request, redirectTarget)
    );

    attachDebugHeaders(response, {
      mode: `resolver_${resolution.kind}`,
      requestedWorkspaceId,
      finalTarget: redirectTarget,
    });

    return response;
  }

  const activeWorkspaceId = text(resolution.activeWorkspace.workspaceId);

  if (!activeWorkspaceId) {
    const response = NextResponse.redirect(
      buildRedirectUrl(request, MANUAL_WORKSPACE_SELECT_HREF)
    );

    attachDebugHeaders(response, {
      mode: "resolver_missing_active_workspace_id",
      requestedWorkspaceId,
      finalTarget: MANUAL_WORKSPACE_SELECT_HREF,
    });

    return response;
  }

  const allowedWorkspaceIds = uniq([
    activeWorkspaceId,
    ...resolution.memberships.map((item) => text(item.workspaceId)),
  ]);

  const rememberedRoutes = readWorkspaceRememberedRoutes(
    request.cookies.get(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)?.value
  );

  const rememberedTarget = getRememberedRouteForWorkspace(
    rememberedRoutes,
    activeWorkspaceId
  );

  const fallbackDashboard =
    normalizeInternalPath(resolution.dashboardRoute) ||
    getDashboardRouteForWorkspaceCategory(
      resolution.activeWorkspace.category
    ) ||
    "/overview";

  const finalTarget = sanitizeRedirectTarget(
    explicitNextParam || rememberedTarget || fallbackDashboard || "/overview",
    fallbackDashboard
  );

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

  response.cookies.set(WORKSPACE_STATUS_COOKIE_NAME, "active", options);
  response.cookies.set(WORKSPACE_STATUS_ALIAS_COOKIE_NAME, "active", options);
  response.cookies.set(ONBOARDING_COMPLETED_COOKIE_NAME, "1", options);
  response.cookies.set(ONBOARDING_COMPLETED_ALIAS_COOKIE_NAME, "1", options);
  response.cookies.set(PENDING_WORKSPACE_COOKIE_NAME, activeWorkspaceId, options);

  attachDebugHeaders(response, {
    mode: "resolver_allow_dashboard",
    requestedWorkspaceId,
    finalTarget,
  });

  return response;
}
