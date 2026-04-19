import {
  listMockWorkspaceSummariesForUser,
  resolveMockDedicatedSpace,
  resolveMockWorkspaceContext,
} from "../workspaces/mock-registry";
import type {
  DedicatedSpaceTarget,
  WorkspaceCategory,
  WorkspaceContext,
  WorkspaceSummary,
} from "../workspaces/types";

export const MOCK_AUTH_COOKIE_NAME =
  (process.env.BOSAI_AUTH_COOKIE_NAME || "bosai_auth").trim() || "bosai_auth";

export const MOCK_AUTH_COOKIE_VALUE =
  (process.env.BOSAI_AUTH_COOKIE_VALUE || "authenticated").trim() ||
  "authenticated";

export const MOCK_SESSION_TOKEN_COOKIE_NAME =
  (process.env.BOSAI_SESSION_TOKEN_COOKIE_NAME || "bosai_session_token").trim() ||
  "bosai_session_token";

export const MOCK_ACTIVE_WORKSPACE_COOKIE_NAME = "bosai_active_workspace_id";
export const MOCK_ALLOWED_WORKSPACES_COOKIE_NAME =
  "bosai_allowed_workspace_ids";
export const MOCK_USER_ID_COOKIE_NAME = "bosai_user_id";
export const MOCK_DEDICATED_SPACE_COOKIE_NAME = "bosai_dedicated_space";

export type MockSessionUser = {
  userId: string;
  email: string;
  displayName: string;
  preferredCategory: WorkspaceCategory;
};

type MockSessionSeed = MockSessionUser & {
  tokens: string[];
};

export type MockLoginIntent = {
  token?: string | null;
  requestedWorkspaceId?: string | null;
  preferredCategory?: WorkspaceCategory | null;
};

export type MockSessionCookiePayload = {
  [MOCK_AUTH_COOKIE_NAME]: string;
  [MOCK_SESSION_TOKEN_COOKIE_NAME]: string;
  [MOCK_USER_ID_COOKIE_NAME]: string;
  [MOCK_ACTIVE_WORKSPACE_COOKIE_NAME]: string;
  [MOCK_ALLOWED_WORKSPACES_COOKIE_NAME]: string;
  [MOCK_DEDICATED_SPACE_COOKIE_NAME]: string;
};

export type ResolvedMockSession = {
  isAuthenticated: boolean;
  token: string;
  user: MockSessionUser | null;
  workspace: WorkspaceSummary | null;
  context: WorkspaceContext | null;
  target: DedicatedSpaceTarget | null;
  route: string;
  allowedWorkspaceIds: string[];
};

export type MockLoginOption = {
  label: string;
  description: string;
  token: string;
  userId: string;
  preferredCategory: WorkspaceCategory;
};

const MOCK_SESSION_SEEDS: MockSessionSeed[] = [
  {
    userId: "user_arthur",
    email: "arthur@bosai.local",
    displayName: "Arthur",
    preferredCategory: "agency",
    tokens: [
      "arthur_token",
      "arthur_agency_token",
      "token_arthur_main",
      "mock_arthur",
    ],
  },
  {
    userId: "user_demo_personal",
    email: "personal@bosai.local",
    displayName: "Personal Demo",
    preferredCategory: "personal",
    tokens: [
      "demo_personal_token",
      "token_demo_personal",
      "mock_personal",
    ],
  },
  {
    userId: "user_demo_freelance",
    email: "freelance@bosai.local",
    displayName: "Freelance Demo",
    preferredCategory: "freelance",
    tokens: [
      "demo_freelance_token",
      "token_demo_freelance",
      "mock_freelance",
    ],
  },
  {
    userId: "user_demo_company",
    email: "company@bosai.local",
    displayName: "Company Demo",
    preferredCategory: "company",
    tokens: ["demo_company_token", "token_demo_company", "mock_company"],
  },
  {
    userId: "user_demo_agency",
    email: "agency@bosai.local",
    displayName: "Agency Demo",
    preferredCategory: "agency",
    tokens: ["demo_agency_token", "token_demo_agency", "mock_agency"],
  },
  {
    userId: "user_demo_viewer",
    email: "viewer@bosai.local",
    displayName: "Viewer Demo",
    preferredCategory: "agency",
    tokens: ["demo_viewer_token", "token_demo_viewer", "mock_viewer"],
  },
];

function normalizeText(value?: string | null): string {
  return String(value || "").trim();
}

function normalizeToken(value?: string | null): string {
  return normalizeText(value).toLowerCase();
}

function normalizeCategory(
  value?: WorkspaceCategory | string | null
): WorkspaceCategory | null {
  const normalized = normalizeText(String(value || "")).toLowerCase();

  if (normalized === "personal") return "personal";
  if (normalized === "freelance") return "freelance";
  if (normalized === "company") return "company";
  if (normalized === "agency") return "agency";
  if (normalized === "enterprise") return "enterprise";

  return null;
}

function findSeedByToken(token?: string | null): MockSessionSeed | null {
  const normalized = normalizeToken(token);
  if (!normalized) return null;

  return (
    MOCK_SESSION_SEEDS.find((seed) =>
      seed.tokens.some((item) => normalizeToken(item) === normalized)
    ) || null
  );
}

function findSeedByUserId(userId?: string | null): MockSessionSeed | null {
  const normalized = normalizeText(userId).toLowerCase();
  if (!normalized) return null;

  return (
    MOCK_SESSION_SEEDS.find(
      (seed) => normalizeText(seed.userId).toLowerCase() === normalized
    ) || null
  );
}

function getPrimaryToken(seed: MockSessionSeed): string {
  return seed.tokens[0] || "";
}

function resolveWorkspaceIdFromCategory(
  userId: string,
  preferredCategory?: WorkspaceCategory | null
): string | undefined {
  const category = normalizeCategory(preferredCategory);
  if (!category) return undefined;

  const summaries = listMockWorkspaceSummariesForUser(userId);

  const match = summaries.find(
    (item) => item.category === category && item.status === "active"
  );

  return match?.workspaceId || undefined;
}

function resolveRequestedWorkspaceId(
  userId: string,
  requestedWorkspaceId?: string | null,
  preferredCategory?: WorkspaceCategory | null
): string | undefined {
  const direct = normalizeText(requestedWorkspaceId);
  if (direct) return direct;

  return resolveWorkspaceIdFromCategory(userId, preferredCategory);
}

export function listMockLoginOptions(): MockLoginOption[] {
  return MOCK_SESSION_SEEDS.map((seed) => ({
    label: seed.displayName,
    description: `${seed.preferredCategory} space`,
    token: getPrimaryToken(seed),
    userId: seed.userId,
    preferredCategory: seed.preferredCategory,
  }));
}

export function resolveMockSession(
  input: MockLoginIntent
): ResolvedMockSession {
  const seed = findSeedByToken(input.token);

  if (!seed) {
    return {
      isAuthenticated: false,
      token: "",
      user: null,
      workspace: null,
      context: null,
      target: null,
      route: "/login",
      allowedWorkspaceIds: [],
    };
  }

  const requestedWorkspaceId = resolveRequestedWorkspaceId(
    seed.userId,
    input.requestedWorkspaceId,
    input.preferredCategory || seed.preferredCategory
  );

  const context = resolveMockWorkspaceContext({
    userId: seed.userId,
    requestedWorkspaceId,
  });

  const dedicated = resolveMockDedicatedSpace({
    userId: seed.userId,
    requestedWorkspaceId,
  });

  return {
    isAuthenticated: true,
    token: normalizeText(input.token),
    user: {
      userId: seed.userId,
      email: seed.email,
      displayName: seed.displayName,
      preferredCategory: seed.preferredCategory,
    },
    workspace: context.activeWorkspace,
    context,
    target: dedicated.target,
    route: dedicated.route,
    allowedWorkspaceIds: context.memberships.map((item) => item.workspaceId),
  };
}

export function resolveMockSessionFromCookies(cookies: {
  [key: string]: string | undefined;
}): ResolvedMockSession {
  const authValue = cookies[MOCK_AUTH_COOKIE_NAME];
  const sessionToken = cookies[MOCK_SESSION_TOKEN_COOKIE_NAME];
  const requestedWorkspaceId = cookies[MOCK_ACTIVE_WORKSPACE_COOKIE_NAME];

  if (normalizeText(authValue) !== MOCK_AUTH_COOKIE_VALUE) {
    return {
      isAuthenticated: false,
      token: "",
      user: null,
      workspace: null,
      context: null,
      target: null,
      route: "/login",
      allowedWorkspaceIds: [],
    };
  }

  const fallbackSeed = findSeedByUserId(cookies[MOCK_USER_ID_COOKIE_NAME]) || {
    ...MOCK_SESSION_SEEDS[0],
  };

  const effectiveToken = normalizeText(sessionToken) || getPrimaryToken(fallbackSeed);

  return resolveMockSession({
    token: effectiveToken,
    requestedWorkspaceId,
  });
}

export function buildMockSessionCookiePayload(
  session: ResolvedMockSession
): MockSessionCookiePayload | null {
  if (!session.isAuthenticated || !session.user || !session.workspace) {
    return null;
  }

  return {
    [MOCK_AUTH_COOKIE_NAME]: MOCK_AUTH_COOKIE_VALUE,
    [MOCK_SESSION_TOKEN_COOKIE_NAME]: session.token,
    [MOCK_USER_ID_COOKIE_NAME]: session.user.userId,
    [MOCK_ACTIVE_WORKSPACE_COOKIE_NAME]: session.workspace.workspaceId,
    [MOCK_ALLOWED_WORKSPACES_COOKIE_NAME]: session.allowedWorkspaceIds.join(","),
    [MOCK_DEDICATED_SPACE_COOKIE_NAME]: session.target || "",
  };
}

export function getMockLoginRedirect(
  input: MockLoginIntent
): {
  route: string;
  session: ResolvedMockSession;
} {
  const session = resolveMockSession(input);

  return {
    route: session.route,
    session,
  };
}

export function getMockSessionForUserCategory(
  userId: string,
  preferredCategory?: WorkspaceCategory | null
): ResolvedMockSession {
  const seed = findSeedByUserId(userId);

  if (!seed) {
    return {
      isAuthenticated: false,
      token: "",
      user: null,
      workspace: null,
      context: null,
      target: null,
      route: "/login",
      allowedWorkspaceIds: [],
    };
  }

  return resolveMockSession({
    token: getPrimaryToken(seed),
    preferredCategory: preferredCategory || seed.preferredCategory,
  });
}

export function isMockAuthenticatedCookieValue(
  value?: string | null
): boolean {
  return normalizeText(value) === MOCK_AUTH_COOKIE_VALUE;
}
