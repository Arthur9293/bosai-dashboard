export type WorkspaceCategory =
  | "personal"
  | "freelance"
  | "company"
  | "agency";

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "operator"
  | "member"
  | "viewer";

export type WorkspacePlan =
  | "personal"
  | "freelance"
  | "company"
  | "agency"
  | "enterprise";

export type WorkspaceStatus =
  | "active"
  | "inactive"
  | "blocked"
  | "pending";

export type MembershipStatus =
  | "active"
  | "invited"
  | "revoked"
  | "suspended";

export type WorkspaceQuotaSnapshot = {
  runsUsed: number;
  runsHardLimit: number | null;
  tokensUsed: number;
  tokensHardLimit: number | null;
  httpCallsUsed: number;
  httpCallsHardLimit: number | null;
  periodKey: string;
};

export type WorkspaceEntitlements = {
  canAccessDashboard: boolean;
  canRunHttp: boolean;
  canViewIncidents: boolean;
  canManagePolicies: boolean;
  canManageTools: boolean;
  canManageWorkspaces: boolean;
  canManageBilling: boolean;
};

export type WorkspaceIdentity = {
  workspaceId: string;
  slug: string;
  name: string;
  category: WorkspaceCategory;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
};

export type WorkspaceMembership = {
  membershipId: string;
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  status: MembershipStatus;
  isDefault: boolean;
};

export type WorkspaceSummary = WorkspaceIdentity & {
  membershipRole: WorkspaceRole;
  membershipStatus: MembershipStatus;
  isDefault: boolean;
};

export type WorkspaceContext = {
  activeWorkspace: WorkspaceSummary | null;
  memberships: WorkspaceSummary[];
  quota: WorkspaceQuotaSnapshot | null;
  entitlements: WorkspaceEntitlements;
};

export type WorkspaceResolverInput = {
  userId: string;
  requestedWorkspaceId?: string;
};

export type DedicatedSpaceTarget =
  | "personal_space"
  | "freelance_space"
  | "company_space"
  | "agency_space";

export function getDedicatedSpaceTarget(
  category: WorkspaceCategory
): DedicatedSpaceTarget {
  if (category === "agency") return "agency_space";
  if (category === "company") return "company_space";
  if (category === "freelance") return "freelance_space";
  return "personal_space";
}
