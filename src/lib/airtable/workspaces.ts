import "server-only";

import type {
  WorkspaceEntitlements,
  WorkspacePlan,
  WorkspaceCategory,
  WorkspaceStatus,
} from "../workspaces/types";
import {
  airtableEscapeFormulaValue,
  airtableFirstRecord,
  airtableListRecords,
  getBooleanCell,
  getNumberCell,
  getStringArrayCell,
  getTextCell,
  type AirtableRecord,
} from "./client";
import { getAirtableConfig } from "./config";

type AirtableWorkspaceFields = {
  Workspace_ID?: unknown;
  Slug?: unknown;
  Type?: unknown;
  Category?: unknown;
  Status_select?: unknown;
  Plan?: unknown;
  Plan_ID?: unknown;
  Plan_ID_Text?: unknown;
  Owner_User?: unknown;
  Owner_User_ID?: unknown;
  Owner_User_ID_Text?: unknown;
  Owner_Email?: unknown;
  API_Key?: unknown;
  Current_Usage_Period_Key?: unknown;
  Allowed_Capabilities?: unknown;
  Can_Access_Dashboard?: unknown;
  Can_Run_HTTP?: unknown;
  Can_View_Incidents?: unknown;
  Can_Manage_Policies?: unknown;
  Can_Manage_Tools?: unknown;
  Can_Manage_Workspaces?: unknown;
  Can_Manage_Billing?: unknown;
  Last_Seen_At?: unknown;
  Usage_Runs_Current_Month?: unknown;
  Usage_Tokens_Current_Month?: unknown;
  Usage_HTTP_Calls_Current_Month?: unknown;
  Hard_Limit_Runs_Month?: unknown;
  Hard_Limit_Tokens_Month?: unknown;
  Hard_Limit_HTTP_Calls_Month?: unknown;
};

export type LiveWorkspace = {
  recordId: string;
  workspaceId: string;
  slug: string;
  name: string;
  category: WorkspaceCategory;
  plan: WorkspacePlan;
  status: WorkspaceStatus;
  ownerUserId: string;
  ownerEmail: string;
  apiKey: string;
  currentUsagePeriodKey: string;
  allowedCapabilities: string[];
  entitlements: WorkspaceEntitlements;
  lastSeenAt: string;
  usageRunsCurrentMonth: number | null;
  usageTokensCurrentMonth: number | null;
  usageHttpCallsCurrentMonth: number | null;
  hardLimitRunsMonth: number | null;
  hardLimitTokensMonth: number | null;
  hardLimitHttpCallsMonth: number | null;
};

function normalizeCategory(value: string): WorkspaceCategory {
  const normalized = value.trim().toLowerCase();

  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";
  return "personal";
}

function normalizePlan(value: string, fallbackCategory: WorkspaceCategory): WorkspacePlan {
  const normalized = value.trim().toLowerCase();

  if (normalized === "enterprise") return "enterprise";
  if (normalized === "agency") return "agency";
  if (normalized === "company") return "company";
  if (normalized === "freelance") return "freelance";
  if (normalized === "personal") return "personal";

  if (fallbackCategory === "agency") return "agency";
  if (fallbackCategory === "company") return "company";
  if (fallbackCategory === "freelance") return "freelance";
  return "personal";
}

function normalizeStatus(value: string): WorkspaceStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === "inactive") return "inactive";
  if (normalized === "blocked") return "blocked";
  if (normalized === "pending") return "pending";
  return "active";
}

function mapEntitlements(
  fields: AirtableWorkspaceFields
): WorkspaceEntitlements {
  return {
    canAccessDashboard: getBooleanCell(fields.Can_Access_Dashboard),
    canRunHttp: getBooleanCell(fields.Can_Run_HTTP),
    canViewIncidents: getBooleanCell(fields.Can_View_Incidents),
    canManagePolicies: getBooleanCell(fields.Can_Manage_Policies),
    canManageTools: getBooleanCell(fields.Can_Manage_Tools),
    canManageWorkspaces: getBooleanCell(fields.Can_Manage_Workspaces),
    canManageBilling: getBooleanCell(fields.Can_Manage_Billing),
  };
}

function mapWorkspaceRecord(
  record: AirtableRecord<AirtableWorkspaceFields>
): LiveWorkspace {
  const fields = record.fields || {};

  const workspaceId = getTextCell(fields.Workspace_ID);
  const slug = getTextCell(fields.Slug);
  const name = getTextCell((fields as Record<string, unknown>).Name) || slug || workspaceId;

  const category = normalizeCategory(
    getTextCell(fields.Type) || getTextCell(fields.Category)
  );

  const plan = normalizePlan(
    getTextCell(fields.Plan_ID_Text) ||
      getTextCell(fields.Plan_ID) ||
      getTextCell(fields.Plan) ||
      category,
    category
  );

  const status = normalizeStatus(getTextCell(fields.Status_select) || "active");

  return {
    recordId: record.id,
    workspaceId,
    slug,
    name,
    category,
    plan,
    status,
    ownerUserId:
      getTextCell(fields.Owner_User_ID_Text) || getTextCell(fields.Owner_User_ID),
    ownerEmail: getTextCell(fields.Owner_Email),
    apiKey: getTextCell(fields.API_Key),
    currentUsagePeriodKey: getTextCell(fields.Current_Usage_Period_Key),
    allowedCapabilities: getStringArrayCell(fields.Allowed_Capabilities),
    entitlements: mapEntitlements(fields),
    lastSeenAt: getTextCell(fields.Last_Seen_At),
    usageRunsCurrentMonth: getNumberCell(fields.Usage_Runs_Current_Month),
    usageTokensCurrentMonth: getNumberCell(fields.Usage_Tokens_Current_Month),
    usageHttpCallsCurrentMonth: getNumberCell(
      fields.Usage_HTTP_Calls_Current_Month
    ),
    hardLimitRunsMonth: getNumberCell(fields.Hard_Limit_Runs_Month),
    hardLimitTokensMonth: getNumberCell(fields.Hard_Limit_Tokens_Month),
    hardLimitHttpCallsMonth: getNumberCell(fields.Hard_Limit_HTTP_Calls_Month),
  };
}

export async function listLiveWorkspaces(args?: {
  activeOnly?: boolean;
}): Promise<LiveWorkspace[]> {
  const config = getAirtableConfig();
  const activeOnly = args?.activeOnly !== false;

  const formula = activeOnly ? "{Status_select}='active'" : undefined;

  const records = await airtableListRecords<AirtableWorkspaceFields>({
    table: config.tables.workspaces,
    filterByFormula: formula,
    sorts: [
      { field: "Type", direction: "asc" },
      { field: "Slug", direction: "asc" },
    ],
  });

  return records.map(mapWorkspaceRecord).filter((item) => Boolean(item.workspaceId));
}

export async function getLiveWorkspaceByWorkspaceId(
  workspaceId: string
): Promise<LiveWorkspace | null> {
  const config = getAirtableConfig();
  const normalized = workspaceId.trim();

  if (!normalized) {
    return null;
  }

  const record = await airtableFirstRecord<AirtableWorkspaceFields>({
    table: config.tables.workspaces,
    filterByFormula: `{Workspace_ID}='${airtableEscapeFormulaValue(normalized)}'`,
    maxRecords: 1,
  });

  return record ? mapWorkspaceRecord(record) : null;
}
