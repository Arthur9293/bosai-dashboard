import {
  getDedicatedSpaceTarget,
  type DedicatedSpaceTarget,
  type MembershipStatus,
  type WorkspaceCategory,
  type WorkspaceContext,
  type WorkspaceEntitlements,
  type WorkspaceIdentity,
  type WorkspaceMembership,
  type WorkspacePlan,
  type WorkspaceQuotaSnapshot,
  type WorkspaceResolverInput,
  type WorkspaceRole,
  type WorkspaceSummary,
} from "./types";

type WorkspaceRegistryRecord = WorkspaceIdentity & {
  quota: WorkspaceQuotaSnapshot;
};

function getCurrentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

const CURRENT_PERIOD_KEY = getCurrentPeriodKey();

function createQuotaSnapshot(
  periodKey: string,
  values: {
    runsUsed: number;
    runsHardLimit: number | null;
    tokensUsed: number;
    tokensHardLimit: number | null;
    httpCallsUsed: number;
    httpCallsHardLimit: number | null;
  }
): WorkspaceQuotaSnapshot {
  return {
    periodKey,
    runsUsed: values.runsUsed,
    runsHardLimit: values.runsHardLimit,
    tokensUsed: values.tokensUsed,
    tokensHardLimit: values.tokensHardLimit,
    httpCallsUsed: values.httpCallsUsed,
    httpCallsHardLimit: values.httpCallsHardLimit,
  };
}

function createWorkspaceRecord(
  workspace: Omit<WorkspaceIdentity, "status"> & {
    status?: WorkspaceIdentity["status"];
  },
  quota: WorkspaceQuotaSnapshot
): WorkspaceRegistryRecord {
  return {
    workspaceId: workspace.workspaceId,
    slug: workspace.slug,
    name: workspace.name,
    category: workspace.category,
    plan: workspace.plan,
    status: workspace.status ?? "active",
    quota,
  };
}

function createMembership(
  membership: WorkspaceMembership
): WorkspaceMembership {
  return membership;
}

export const MOCK_WORKSPACE_REGISTRY: WorkspaceRegistryRecord[] = [
  createWorkspaceRecord(
    {
      workspaceId: "ws_arthur_personal",
      slug: "arthur-personal",
      name: "Arthur Personal",
      category: "personal",
      plan: "personal",
      status: "active",
    },
    createQuotaSnapshot(CURRENT_PERIOD_KEY, {
      runsUsed: 28,
      runsHardLimit: 200,
      tokensUsed: 182400,
      tokensHardLimit: 500000,
      httpCallsUsed: 41,
      httpCallsHardLimit: 250,
    })
  ),

  createWorkspaceRecord(
    {
      workspaceId: "ws_arthur_freelance",
      slug: "arthur-freelance",
      name: "Arthur Freelance",
      category: "freelance",
      plan: "freelance",
      status: "active",
    },
    createQuotaSnapshot(CURRENT_PERIOD_KEY, {
      runsUsed: 174,
      runsHardLimit: 1200,
      tokensUsed: 940000,
      tokensHardLimit: 3500000,
      httpCallsUsed: 188,
      httpCallsHardLimit: 1200,
    })
  ),

  createWorkspaceRecord(
    {
      workspaceId: "ws_ferrera_company",
      slug: "ferrera-company",
      name: "Ferrera Company",
      category: "company",
      plan: "company",
      status: "active",
    },
    createQuotaSnapshot(CURRENT_PERIOD_KEY, {
      runsUsed: 942,
      runsHardLimit: 8000,
      tokensUsed: 4820000,
      tokensHardLimit: 18000000,
      httpCallsUsed: 1140,
      httpCallsHardLimit: 6000,
    })
  ),

  createWorkspaceRecord(
    {
      workspaceId: "ws_studio_agency",
      slug: "studio-agency",
      name: "Studio Arthur + Joke",
      category: "agency",
      plan: "agency",
      status: "active",
    },
    createQuotaSnapshot(CURRENT_PERIOD_KEY, {
      runsUsed: 2140,
      runsHardLimit: 25000,
      tokensUsed: 12800000,
      tokensHardLimit: 50000000,
      httpCallsUsed: 2940,
      httpCallsHardLimit: 18000,
    })
  ),
];

export const MOCK_WORKSPACE_MEMBERSHIPS: WorkspaceMembership[] = [
  createMembership({
    membershipId: "mship_arthur_personal_owner",
    userId: "user_arthur",
    workspaceId: "ws_arthur_personal",
    role: "owner",
    status: "active",
    isDefault: false,
  }),

  createMembership({
    membershipId: "mship_arthur_freelance_owner",
    userId: "user_arthur",
    workspaceId: "ws_arthur_freelance",
    role: "owner",
    status: "active",
    isDefault: false,
  }),

  createMembership({
    membershipId: "mship_arthur_company_admin",
    userId: "user_arthur",
    workspaceId: "ws_ferrera_company",
    role: "admin",
    status: "active",
    isDefault: false,
  }),

  createMembership({
    membershipId: "mship_arthur_agency_owner",
    userId: "user_arthur",
    workspaceId: "ws_studio_agency",
    role: "owner",
    status: "active",
    isDefault: true,
  }),

  createMembership({
    membershipId: "mship_demo_personal_owner",
    userId: "user_demo_personal",
    workspaceId: "ws_arthur_personal",
    role: "owner",
    status: "active",
    isDefault: true,
  }),

  createMembership({
    membershipId: "mship_demo_freelance_owner",
    userId: "user_demo_freelance",
    workspaceId: "ws_arthur_freelance",
    role: "owner",
    status: "active",
    isDefault: true,
  }),

  createMembership({
    membershipId: "mship_demo_company_admin",
    userId: "user_demo_company",
    workspaceId: "ws_ferrera_company",
    role: "admin",
    status: "active",
    isDefault: true,
  }),

  createMembership({
    membershipId: "mship_demo_agency_owner",
    userId: "user_demo_agency",
    workspaceId: "ws_studio_agency",
    role: "owner",
    status: "active",
    isDefault: true,
  }),

  createMembership({
    membershipId: "mship_demo_agency_viewer",
    userId: "user_demo_viewer",
    workspaceId: "ws_studio_agency",
    role: "viewer",
    status: "active",
    isDefault: true,
  }),
];

export const MOCK_USER_DEFAULTS: Record<string, string> = {
  user_arthur: "ws_studio_agency",
  user_demo_personal: "ws_arthur_personal",
  user_demo_freelance: "ws_arthur_freelance",
  user_demo_company: "ws_ferrera_company",
  user_demo_agency: "ws_studio_agency",
  user_demo_viewer: "ws_studio_agency",
};

function isMembershipActive(status: MembershipStatus): boolean {
  return status === "active";
}

function isWorkspaceUsable(workspace: WorkspaceIdentity): boolean {
  return workspace.status === "active";
}

export function findMockWorkspaceById(
  workspaceId: string
): WorkspaceRegistryRecord | null {
  const normalized = workspaceId.trim().toLowerCase();

  if (!normalized) return null;

  return (
    MOCK_WORKSPACE_REGISTRY.find(
      (item) => item.workspaceId.trim().toLowerCase() === normalized
    ) || null
  );
}

export function listMockMembershipsByUserId(
  userId: string
): WorkspaceMembership[] {
  const normalized = userId.trim().toLowerCase();

  if (!normalized) return [];

  return MOCK_WORKSPACE_MEMBERSHIPS.filter(
    (item) => item.userId.trim().toLowerCase() === normalized
  );
}

function buildWorkspaceSummary(
  workspace: WorkspaceIdentity,
  membership: WorkspaceMembership
): WorkspaceSummary {
  return {
    workspaceId: workspace.workspaceId,
    slug: workspace.slug,
    name: workspace.name,
    category: workspace.category,
    plan: workspace.plan,
    status: workspace.status,
    membershipRole: membership.role,
    membershipStatus: membership.status,
    isDefault: membership.isDefault,
  };
}

export function listMockWorkspaceSummariesForUser(
  userId: string
): WorkspaceSummary[] {
  const memberships = listMockMembershipsByUserId(userId);

  return memberships
    .map((membership) => {
      const workspace = findMockWorkspaceById(membership.workspaceId);
      if (!workspace) return null;

      return buildWorkspaceSummary(workspace, membership);
    })
    .filter((item): item is WorkspaceSummary => item !== null);
}

function resolveRequestedMembership(
  memberships: WorkspaceMembership[],
  requestedWorkspaceId?: string
): WorkspaceMembership | null {
  const normalized = String(requestedWorkspaceId || "")
    .trim()
    .toLowerCase();

  if (!normalized) return null;

  return (
    memberships.find(
      (item) =>
        item.workspaceId.trim().toLowerCase() === normalized &&
        isMembershipActive(item.status)
    ) || null
  );
}

function resolveDefaultMembership(
  memberships: WorkspaceMembership[],
  userId: string
): WorkspaceMembership | null {
  const explicitDefault =
    memberships.find((item) => item.isDefault && isMembershipActive(item.status)) ||
    null;

  if (explicitDefault) return explicitDefault;

  const configuredDefault = MOCK_USER_DEFAULTS[userId] || "";
  if (configuredDefault) {
    const matchingConfigured = memberships.find(
      (item) =>
        item.workspaceId === configuredDefault && isMembershipActive(item.status)
    );
    if (matchingConfigured) return matchingConfigured;
  }

  return memberships.find((item) => isMembershipActive(item.status)) || null;
}

export function resolveMockActiveWorkspace(
  input: WorkspaceResolverInput
): WorkspaceSummary | null {
  const userId = input.userId.trim();
  if (!userId) return null;

  const memberships = listMockMembershipsByUserId(userId);
  if (memberships.length === 0) return null;

  const requestedMembership = resolveRequestedMembership(
    memberships,
    input.requestedWorkspaceId
  );

  const selectedMembership =
    requestedMembership || resolveDefaultMembership(memberships, userId);

  if (!selectedMembership) return null;

  const workspace = findMockWorkspaceById(selectedMembership.workspaceId);
  if (!workspace) return null;
  if (!isWorkspaceUsable(workspace)) return null;

  return buildWorkspaceSummary(workspace, selectedMembership);
}

export function getMockQuotaSnapshot(
  workspaceId: string
): WorkspaceQuotaSnapshot | null {
  const workspace = findMockWorkspaceById(workspaceId);
  return workspace?.quota ?? null;
}

function getPlanEntitlements(plan: WorkspacePlan): WorkspaceEntitlements {
  if (plan === "enterprise") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: true,
      canManageTools: true,
      canManageWorkspaces: true,
      canManageBilling: true,
    };
  }

  if (plan === "agency") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: true,
      canManageTools: true,
      canManageWorkspaces: true,
      canManageBilling: true,
    };
  }

  if (plan === "company") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: true,
      canManageTools: true,
      canManageWorkspaces: true,
      canManageBilling: true,
    };
  }

  if (plan === "freelance") {
    return {
      canAccessDashboard: true,
      canRunHttp: true,
      canViewIncidents: true,
      canManagePolicies: false,
      canManageTools: false,
      canManageWorkspaces: false,
      canManageBilling: true,
    };
  }

  return {
    canAccessDashboard: true,
    canRunHttp: true,
    canViewIncidents: true,
    canManagePolicies: false,
    canManageTools: false,
    canManageWorkspaces: false,
    canManageBilling: false,
  };
}

function applyRoleRestrictions(
  base: WorkspaceEntitlements,
  role: WorkspaceRole
): WorkspaceEntitlements {
  if (role === "owner") {
    return { ...base };
  }

  if (role === "admin") {
    return {
      ...base,
      canManageBilling: base.canManageBilling,
    };
  }

  if (role === "operator") {
    return {
      ...base,
      canManagePolicies: false,
      canManageTools: false,
      canManageWorkspaces: false,
      canManageBilling: false,
    };
  }

  if (role === "member") {
    return {
      ...base,
      canManagePolicies: false,
      canManageTools: false,
      canManageWorkspaces: false,
      canManageBilling: false,
    };
  }

  return {
    canAccessDashboard: base.canAccessDashboard,
    canRunHttp: false,
    canViewIncidents: true,
    canManagePolicies: false,
    canManageTools: false,
    canManageWorkspaces: false,
    canManageBilling: false,
  };
}

export function getMockEntitlements(
  workspaceId: string,
  role: WorkspaceRole
): WorkspaceEntitlements {
  const workspace = findMockWorkspaceById(workspaceId);

  if (!workspace) {
    return {
      canAccessDashboard: false,
      canRunHttp: false,
      canViewIncidents: false,
      canManagePolicies: false,
      canManageTools: false,
      canManageWorkspaces: false,
      canManageBilling: false,
    };
  }

  const base = getPlanEntitlements(workspace.plan);
  return applyRoleRestrictions(base, role);
}

export function resolveMockWorkspaceContext(
  input: WorkspaceResolverInput
): WorkspaceContext {
  const memberships = listMockWorkspaceSummariesForUser(input.userId);
  const activeWorkspace = resolveMockActiveWorkspace(input);

  if (!activeWorkspace) {
    return {
      activeWorkspace: null,
      memberships,
      quota: null,
      entitlements: {
        canAccessDashboard: false,
        canRunHttp: false,
        canViewIncidents: false,
        canManagePolicies: false,
        canManageTools: false,
        canManageWorkspaces: false,
        canManageBilling: false,
      },
    };
  }

  return {
    activeWorkspace,
    memberships,
    quota: getMockQuotaSnapshot(activeWorkspace.workspaceId),
    entitlements: getMockEntitlements(
      activeWorkspace.workspaceId,
      activeWorkspace.membershipRole
    ),
  };
}

export function getMockDedicatedSpaceRoute(
  category: WorkspaceCategory
): string {
  if (category === "agency") return "/?workspace_category=agency";
  if (category === "company") return "/?workspace_category=company";
  if (category === "freelance") return "/?workspace_category=freelance";
  return "/?workspace_category=personal";
}

export function resolveMockDedicatedSpace(input: WorkspaceResolverInput): {
  target: DedicatedSpaceTarget | null;
  route: string;
  workspace: WorkspaceSummary | null;
} {
  const workspace = resolveMockActiveWorkspace(input);

  if (!workspace) {
    return {
      target: null,
      route: "/login",
      workspace: null,
    };
  }

  const target = getDedicatedSpaceTarget(workspace.category);

  return {
    target,
    route: getMockDedicatedSpaceRoute(workspace.category),
    workspace,
  };
}
