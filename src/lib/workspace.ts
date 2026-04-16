type SearchParamsValue = string | string[] | undefined;
type SearchParamsInput = Record<string, SearchParamsValue> | null | undefined;
type CookieValuesInput = Record<string, string | undefined> | null | undefined;

export type WorkspaceSessionLike =
  | Record<string, unknown>
  | {
      user?: Record<string, unknown>;
      session?: Record<string, unknown>;
    }
  | null
  | undefined;

export type ResolvedWorkspaceContext = {
  allowedWorkspaceIds: string[];
  activeWorkspaceId: string;
  source: "query" | "session" | "cookie" | "default" | "none";
};

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

function parseWorkspaceIds(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return uniq(value.flatMap((item) => parseWorkspaceIds(item)));
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return parseWorkspaceIds(parsed);
      } catch {
        return [];
      }
    }

    if (trimmed.includes(",")) {
      return uniq(trimmed.split(","));
    }

    return trimmed ? [trimmed] : [];
  }

  if (typeof value === "object") {
    const rec = value as Record<string, unknown>;

    return uniq([
      ...parseWorkspaceIds(rec.allowedWorkspaceIds),
      ...parseWorkspaceIds(rec.workspaceIds),
      ...parseWorkspaceIds(rec.workspaces),
      ...parseWorkspaceIds(rec.memberships),
      ...parseWorkspaceIds(rec.id),
      ...parseWorkspaceIds(rec.workspace_id),
      ...parseWorkspaceIds(rec.workspaceId),
      ...parseWorkspaceIds(rec.Workspace_ID),
    ]);
  }

  return [];
}

function firstText(values: unknown[]): string {
  for (const value of values) {
    const v = text(value);
    if (v) return v;
  }
  return "";
}

function readSearchParam(
  searchParams: SearchParamsInput,
  keys: string[]
): string {
  if (!searchParams) return "";

  for (const key of keys) {
    const raw = searchParams[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const clean = text(value);
    if (clean) return clean;
  }

  return "";
}

function readCookieValue(cookieValues: CookieValuesInput, keys: string[]): string {
  if (!cookieValues) return "";

  for (const key of keys) {
    const clean = text(cookieValues[key]);
    if (clean) return clean;
  }

  return "";
}

function readSessionAllowedWorkspaceIds(session?: WorkspaceSessionLike): string[] {
  if (!session || typeof session !== "object") return [];

  const root = session as Record<string, unknown>;
  const user =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : {};
  const nestedSession =
    root.session && typeof root.session === "object"
      ? (root.session as Record<string, unknown>)
      : {};

  return uniq([
    ...parseWorkspaceIds(root.allowedWorkspaceIds),
    ...parseWorkspaceIds(root.workspaceIds),
    ...parseWorkspaceIds(root.workspaces),
    ...parseWorkspaceIds(root.memberships),
    ...parseWorkspaceIds(user.allowedWorkspaceIds),
    ...parseWorkspaceIds(user.workspaceIds),
    ...parseWorkspaceIds(user.workspaces),
    ...parseWorkspaceIds(user.memberships),
    ...parseWorkspaceIds(nestedSession.allowedWorkspaceIds),
    ...parseWorkspaceIds(nestedSession.workspaceIds),
    ...parseWorkspaceIds(nestedSession.workspaces),
    ...parseWorkspaceIds(nestedSession.memberships),
  ]);
}

function readSessionActiveWorkspaceId(session?: WorkspaceSessionLike): string {
  if (!session || typeof session !== "object") return "";

  const root = session as Record<string, unknown>;
  const user =
    root.user && typeof root.user === "object"
      ? (root.user as Record<string, unknown>)
      : {};
  const nestedSession =
    root.session && typeof root.session === "object"
      ? (root.session as Record<string, unknown>)
      : {};

  return firstText([
    root.activeWorkspaceId,
    root.workspaceId,
    root.workspace_id,
    root.Workspace_ID,
    user.activeWorkspaceId,
    user.workspaceId,
    user.workspace_id,
    user.Workspace_ID,
    nestedSession.activeWorkspaceId,
    nestedSession.workspaceId,
    nestedSession.workspace_id,
    nestedSession.Workspace_ID,
  ]);
}

export function resolveWorkspaceContext(input?: {
  searchParams?: SearchParamsInput;
  cookieValues?: CookieValuesInput;
  session?: WorkspaceSessionLike;
  defaultWorkspaceId?: string;
}): ResolvedWorkspaceContext {
  const queryWorkspaceId = readSearchParam(input?.searchParams, [
    "workspace_id",
    "workspaceId",
  ]);

  const cookieActiveWorkspaceId = readCookieValue(input?.cookieValues, [
    "bosai_active_workspace_id",
    "bosai_workspace_id",
    "workspace_id",
  ]);

  const cookieAllowedWorkspaceIds = uniq([
    ...parseWorkspaceIds(
      readCookieValue(input?.cookieValues, [
        "bosai_allowed_workspace_ids",
        "allowed_workspace_ids",
      ])
    ),
  ]);

  const sessionAllowedWorkspaceIds = readSessionAllowedWorkspaceIds(input?.session);
  const sessionActiveWorkspaceId = readSessionActiveWorkspaceId(input?.session);

  const defaultWorkspaceId = firstText([
    input?.defaultWorkspaceId,
    process.env.NEXT_PUBLIC_BOSAI_DEFAULT_WORKSPACE_ID,
    process.env.BOSAI_DEFAULT_WORKSPACE_ID,
  ]);

  const allowedWorkspaceIds = uniq([
    ...sessionAllowedWorkspaceIds,
    ...cookieAllowedWorkspaceIds,
  ]);

  let activeWorkspaceId = firstText([
    queryWorkspaceId,
    sessionActiveWorkspaceId,
    cookieActiveWorkspaceId,
    allowedWorkspaceIds[0],
    defaultWorkspaceId,
  ]);

  if (
    activeWorkspaceId &&
    allowedWorkspaceIds.length > 0 &&
    !allowedWorkspaceIds.includes(activeWorkspaceId)
  ) {
    activeWorkspaceId = allowedWorkspaceIds[0] || "";
  }

  const source: ResolvedWorkspaceContext["source"] = queryWorkspaceId
    ? "query"
    : sessionActiveWorkspaceId || sessionAllowedWorkspaceIds.length > 0
      ? "session"
      : cookieActiveWorkspaceId || cookieAllowedWorkspaceIds.length > 0
        ? "cookie"
        : defaultWorkspaceId
          ? "default"
          : "none";

  return {
    allowedWorkspaceIds,
    activeWorkspaceId,
    source,
  };
}

export function appendWorkspaceIdToHref(
  href: string,
  workspaceId?: string
): string {
  const cleanWorkspaceId = text(workspaceId);
  if (!cleanWorkspaceId) return href;

  const url = new URL(href, "http://local");
  url.searchParams.set("workspace_id", cleanWorkspaceId);

  return `${url.pathname}${url.search}${url.hash}`;
}

export function extractWorkspaceId(record: unknown): string {
  if (!record || typeof record !== "object" || Array.isArray(record)) {
    return "";
  }

  const top = record as Record<string, unknown>;
  const fields =
    top.fields && typeof top.fields === "object" && !Array.isArray(top.fields)
      ? (top.fields as Record<string, unknown>)
      : {};

  return firstText([
    top.workspace_id,
    top.workspaceId,
    top.Workspace_ID,
    top.workspace,
    fields.workspace_id,
    fields.workspaceId,
    fields.Workspace_ID,
    fields.workspace,
  ]);
}

export function workspaceMatchesOrUnscoped(
  recordWorkspaceId: string,
  activeWorkspaceId: string
): boolean {
  const recordId = text(recordWorkspaceId);
  const activeId = text(activeWorkspaceId);

  if (!activeId) return true;
  if (!recordId) return true;

  return recordId === activeId;
}
