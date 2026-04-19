import { NextResponse } from "next/server";
import {
  AUTH_LOGIN_ROUTE,
  buildWorkspaceSwitchCookieBundle,
  getAuthCookieWriteOptions,
  resolveAuthSession,
} from "@/lib/auth/resolve-auth-session";

const WORKSPACE_SELECT_ROUTE = "/workspace/select";
const DEFAULT_HOME_ROUTE = "/overview";

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function sanitizeInternalPath(value?: string | null): string {
  const normalized = normalizeText(value);

  if (!normalized) return "";
  if (!normalized.startsWith("/")) return "";
  if (normalized.startsWith("//")) return "";

  return normalized;
}

function buildSelectRoute(nextPath?: string): string {
  const safeNext = sanitizeInternalPath(nextPath);

  if (!safeNext) return WORKSPACE_SELECT_ROUTE;

  const query = new URLSearchParams({ next: safeNext }).toString();
  return `${WORKSPACE_SELECT_ROUTE}?${query}`;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const workspaceId = normalizeText(requestUrl.searchParams.get("workspace_id"));
  const nextPath = sanitizeInternalPath(requestUrl.searchParams.get("next"));

  const current = await resolveAuthSession();

  if (!current.isAuthenticated) {
    return NextResponse.redirect(new URL(AUTH_LOGIN_ROUTE, requestUrl));
  }

  if (!workspaceId) {
    return NextResponse.redirect(
      new URL(buildSelectRoute(nextPath || current.homeRoute), requestUrl)
    );
  }

  const allowedWorkspaceIds = current.allowedWorkspaceIds.map((item) =>
    item.trim().toLowerCase()
  );

  const isAllowed = allowedWorkspaceIds.includes(workspaceId.toLowerCase());

  if (!isAllowed) {
    return NextResponse.redirect(
      new URL(buildSelectRoute(nextPath || current.homeRoute), requestUrl)
    );
  }

  const switched = buildWorkspaceSwitchCookieBundle({
    current,
    nextWorkspaceId: workspaceId,
  });

  if (!switched.cookiePayload || !switched.session.isAuthenticated) {
    return NextResponse.redirect(
      new URL(buildSelectRoute(nextPath || current.homeRoute), requestUrl)
    );
  }

  const targetPath =
    nextPath ||
    sanitizeInternalPath(switched.route) ||
    sanitizeInternalPath(switched.session.homeRoute) ||
    DEFAULT_HOME_ROUTE;

  const response = NextResponse.redirect(new URL(targetPath, requestUrl));
  const cookieOptions = getAuthCookieWriteOptions();

  for (const [name, value] of Object.entries(switched.cookiePayload)) {
    response.cookies.set(name, value, cookieOptions);
  }

  return response;
}
