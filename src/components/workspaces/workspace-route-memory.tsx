"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  WORKSPACE_ROUTE_MEMORY_COOKIE_MAX_AGE,
  WORKSPACE_ROUTE_MEMORY_COOKIE_NAME,
  getRememberedRouteForWorkspace,
  readWorkspaceRememberedRoutes,
  rememberWorkspaceRoute,
  serializeWorkspaceRememberedRoutes,
} from "@/lib/workspaces/route-memory";

type WorkspaceRouteMemoryProps = {
  workspaceId: string;
};

function text(value?: string | null): string {
  return String(value || "").trim();
}

function readCookieValue(name: string): string {
  if (typeof document === "undefined") {
    return "";
  }

  const prefix = `${name}=`;
  const entry = document.cookie
    .split("; ")
    .find((item) => item.startsWith(prefix));

  return entry ? entry.slice(prefix.length) : "";
}

export function WorkspaceRouteMemory({
  workspaceId,
}: WorkspaceRouteMemoryProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() || "";

  useEffect(() => {
    const normalizedWorkspaceId = text(workspaceId);
    const normalizedPathname = text(pathname);

    if (!normalizedWorkspaceId || !normalizedPathname.startsWith("/")) {
      return;
    }

    const nextRoute = search
      ? `${normalizedPathname}?${search}`
      : normalizedPathname;

    const current = readWorkspaceRememberedRoutes(
      readCookieValue(WORKSPACE_ROUTE_MEMORY_COOKIE_NAME)
    );

    const previous = getRememberedRouteForWorkspace(
      current,
      normalizedWorkspaceId
    );

    if (previous === nextRoute) {
      return;
    }

    const next = rememberWorkspaceRoute({
      current,
      workspaceId: normalizedWorkspaceId,
      route: nextRoute,
    });

    const serialized = serializeWorkspaceRememberedRoutes(next);
    const secure =
      typeof window !== "undefined" && window.location.protocol === "https:"
        ? "; Secure"
        : "";

    document.cookie =
      `${WORKSPACE_ROUTE_MEMORY_COOKIE_NAME}=${serialized}` +
      `; Path=/; Max-Age=${WORKSPACE_ROUTE_MEMORY_COOKIE_MAX_AGE}` +
      `; SameSite=Lax${secure}`;
  }, [workspaceId, pathname, search]);

  return null;
}
