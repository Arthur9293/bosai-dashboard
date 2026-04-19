export const WORKSPACE_ROUTE_MEMORY_COOKIE_NAME =
  (
    process.env.BOSAI_WORKSPACE_ROUTE_MEMORY_COOKIE_NAME ||
    "bosai_workspace_last_routes"
  ).trim() || "bosai_workspace_last_routes";

export const WORKSPACE_ROUTE_MEMORY_COOKIE_MAX_AGE =
  60 * 60 * 24 * 30;

export type WorkspaceRememberedRoutes = Record<string, string>;

function text(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  return "";
}

function normalizeRoute(value: unknown): string {
  const route = text(value);

  if (!route.startsWith("/")) {
    return "";
  }

  if (route.startsWith("/login")) {
    return "";
  }

  return route;
}

export function readWorkspaceRememberedRoutes(
  raw?: string | null
): WorkspaceRememberedRoutes {
  const source = text(raw);

  if (!source) {
    return {};
  }

  try {
    const decoded = decodeURIComponent(source);
    const parsed = JSON.parse(decoded);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const next: WorkspaceRememberedRoutes = {};

    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>
    )) {
      const workspaceId = text(key);
      const route = normalizeRoute(value);

      if (!workspaceId || !route) {
        continue;
      }

      next[workspaceId] = route;
    }

    return next;
  } catch {
    return {};
  }
}

export function serializeWorkspaceRememberedRoutes(
  value: WorkspaceRememberedRoutes
): string {
  const sanitized: WorkspaceRememberedRoutes = {};

  for (const [key, route] of Object.entries(value || {})) {
    const workspaceId = text(key);
    const normalizedRoute = normalizeRoute(route);

    if (!workspaceId || !normalizedRoute) {
      continue;
    }

    sanitized[workspaceId] = normalizedRoute;
  }

  return encodeURIComponent(JSON.stringify(sanitized));
}

export function getRememberedRouteForWorkspace(
  value: WorkspaceRememberedRoutes,
  workspaceId?: string | null
): string {
  const normalizedWorkspaceId = text(workspaceId);

  if (!normalizedWorkspaceId) {
    return "";
  }

  return normalizeRoute(value?.[normalizedWorkspaceId]);
}

export function rememberWorkspaceRoute(args: {
  current: WorkspaceRememberedRoutes;
  workspaceId?: string | null;
  route?: string | null;
}): WorkspaceRememberedRoutes {
  const normalizedWorkspaceId = text(args.workspaceId);
  const normalizedRoute = normalizeRoute(args.route);

  if (!normalizedWorkspaceId || !normalizedRoute) {
    return { ...(args.current || {}) };
  }

  return {
    ...(args.current || {}),
    [normalizedWorkspaceId]: normalizedRoute,
  };
}
