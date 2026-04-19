import "server-only";

import type { MembershipStatus, WorkspaceRole } from "../workspaces/types";
import {
  airtableEscapeFormulaValue,
  airtableListRecords,
  getBooleanCell,
  getLinkedRecordIds,
  getTextCell,
  type AirtableRecord,
} from "./client";
import { getAirtableConfig } from "./config";

type AirtableMembershipFields = {
  Membership_ID?: unknown;
  Email?: unknown;
  User?: unknown;
  Role?: unknown;
  Workspace?: unknown;
  Workspace_ID_Cache?: unknown;
  Profile?: unknown;
  Status?: unknown;
  User_ID_Text?: unknown;
  Workspace_ID_Text?: unknown;
  User_Email?: unknown;
  Is_Default?: unknown;
};

export type LiveMembership = {
  recordId: string;
  membershipId: string;
  email: string;
  userRecordIds: string[];
  profileRecordIds: string[];
  workspaceRecordIds: string[];
  role: WorkspaceRole;
  status: MembershipStatus;
  userIdText: string;
  workspaceIdText: string;
  workspaceIdCache: string;
  userEmail: string;
  isDefault: boolean;
};

function normalizeRole(value: string): WorkspaceRole {
  const normalized = value.trim().toLowerCase();

  if (normalized === "admin") return "admin";
  if (normalized === "operator") return "operator";
  if (normalized === "member") return "member";
  if (normalized === "viewer") return "viewer";
  return "owner";
}

function normalizeMembershipStatus(value: string): MembershipStatus {
  const normalized = value.trim().toLowerCase();

  if (normalized === "invited") return "invited";
  if (normalized === "revoked") return "revoked";
  if (normalized === "suspended") return "suspended";
  return "active";
}

function mapMembershipRecord(
  record: AirtableRecord<AirtableMembershipFields>
): LiveMembership {
  const fields = record.fields || {};

  return {
    recordId: record.id,
    membershipId: getTextCell(fields.Membership_ID) || record.id,
    email: getTextCell(fields.Email).toLowerCase(),
    userRecordIds: getLinkedRecordIds(fields.User),
    profileRecordIds: getLinkedRecordIds(fields.Profile),
    workspaceRecordIds: getLinkedRecordIds(fields.Workspace),
    role: normalizeRole(getTextCell(fields.Role) || "owner"),
    status: normalizeMembershipStatus(getTextCell(fields.Status) || "active"),
    userIdText: getTextCell(fields.User_ID_Text),
    workspaceIdText: getTextCell(fields.Workspace_ID_Text),
    workspaceIdCache: getTextCell(fields.Workspace_ID_Cache),
    userEmail: getTextCell(fields.User_Email).toLowerCase(),
    isDefault: getBooleanCell(fields.Is_Default),
  };
}

export async function listLiveMembershipsForUser(args: {
  userId?: string;
  email?: string;
}): Promise<LiveMembership[]> {
  const config = getAirtableConfig();
  const userId = args.userId?.trim() || "";
  const email = args.email?.trim().toLowerCase() || "";

  const formulas: string[] = [];

  if (userId) {
    const safeUserId = airtableEscapeFormulaValue(userId);
    formulas.push(`{User_ID_Text}='${safeUserId}'`);
  }

  if (email) {
    const safeEmail = airtableEscapeFormulaValue(email);
    formulas.push(`LOWER({User_Email})='${safeEmail}'`);
    formulas.push(`LOWER({Email})='${safeEmail}'`);
  }

  if (formulas.length === 0) {
    return [];
  }

  const filterByFormula =
    formulas.length === 1 ? formulas[0] : `OR(${formulas.join(",")})`;

  const records = await airtableListRecords<AirtableMembershipFields>({
    table: config.tables.memberships,
    filterByFormula,
    sorts: [
      { field: "Is_Default", direction: "desc" },
      { field: "Created_At", direction: "asc" },
    ],
  });

  return records
    .map(mapMembershipRecord)
    .filter((item) => item.status === "active");
}
