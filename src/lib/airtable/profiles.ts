import "server-only";

import {
  airtableEscapeFormulaValue,
  airtableFirstRecord,
  getLinkedRecordIds,
  getTextCell,
  type AirtableRecord,
} from "./client";
import { getAirtableConfig } from "./config";

type AirtableProfileFields = {
  User_ID?: unknown;
  Email?: unknown;
  Display_Name?: unknown;
  Status_select?: unknown;
  Active_Workspace?: unknown;
  Default_Workspace?: unknown;
  Workspace_Memberships?: unknown;
};

export type LiveProfile = {
  recordId: string;
  userId: string;
  email: string;
  displayName: string;
  status: string;
  activeWorkspaceRecordIds: string[];
  defaultWorkspaceRecordIds: string[];
  membershipRecordIds: string[];
};

function mapProfileRecord(
  record: AirtableRecord<AirtableProfileFields>
): LiveProfile {
  const fields = record.fields || {};

  return {
    recordId: record.id,
    userId: getTextCell(fields.User_ID),
    email: getTextCell(fields.Email).toLowerCase(),
    displayName: getTextCell(fields.Display_Name),
    status: getTextCell(fields.Status_select),
    activeWorkspaceRecordIds: getLinkedRecordIds(fields.Active_Workspace),
    defaultWorkspaceRecordIds: getLinkedRecordIds(fields.Default_Workspace),
    membershipRecordIds: getLinkedRecordIds(fields.Workspace_Memberships),
  };
}

export async function getLiveProfileByUserId(
  userId: string
): Promise<LiveProfile | null> {
  const config = getAirtableConfig();
  const normalized = userId.trim();

  if (!normalized) {
    return null;
  }

  const record = await airtableFirstRecord<AirtableProfileFields>({
    table: config.tables.profiles,
    filterByFormula: `{User_ID}='${airtableEscapeFormulaValue(normalized)}'`,
    maxRecords: 1,
  });

  return record ? mapProfileRecord(record) : null;
}

export async function getLiveProfileByEmail(
  email: string
): Promise<LiveProfile | null> {
  const config = getAirtableConfig();
  const normalized = email.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  const record = await airtableFirstRecord<AirtableProfileFields>({
    table: config.tables.profiles,
    filterByFormula: `LOWER({Email})='${airtableEscapeFormulaValue(normalized)}'`,
    maxRecords: 1,
  });

  return record ? mapProfileRecord(record) : null;
}
