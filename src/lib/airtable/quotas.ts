import "server-only";

import {
  airtableEscapeFormulaValue,
  airtableFirstRecord,
  airtableListRecords,
  getBooleanCell,
  getNumberCell,
  getTextCell,
  type AirtableRecord,
} from "./client";
import { getAirtableConfig } from "./config";

type AirtableQuotaFields = {
  Usage_ID?: unknown;
  Workspace?: unknown;
  Workspace_ID_Text?: unknown;
  Current_Usage_Period_Key?: unknown;
  Runs_Used?: unknown;
  Runs_Hard_Limit?: unknown;
  Tokens_Used?: unknown;
  Tokens_Hard_Limit?: unknown;
  HTTP_Calls_Used?: unknown;
  HTTP_Calls_Hard_Limit?: unknown;
  Billable?: unknown;
};

export type LiveWorkspaceQuota = {
  recordId: string;
  usageId: string;
  workspaceId: string;
  currentUsagePeriodKey: string;
  runsUsed: number;
  runsHardLimit: number | null;
  tokensUsed: number;
  tokensHardLimit: number | null;
  httpCallsUsed: number;
  httpCallsHardLimit: number | null;
  billable: boolean;
};

function mapQuotaRecord(
  record: AirtableRecord<AirtableQuotaFields>
): LiveWorkspaceQuota {
  const fields = record.fields || {};

  return {
    recordId: record.id,
    usageId: getTextCell(fields.Usage_ID) || record.id,
    workspaceId: getTextCell(fields.Workspace_ID_Text),
    currentUsagePeriodKey: getTextCell(fields.Current_Usage_Period_Key),
    runsUsed: getNumberCell(fields.Runs_Used) ?? 0,
    runsHardLimit: getNumberCell(fields.Runs_Hard_Limit),
    tokensUsed: getNumberCell(fields.Tokens_Used) ?? 0,
    tokensHardLimit: getNumberCell(fields.Tokens_Hard_Limit),
    httpCallsUsed: getNumberCell(fields.HTTP_Calls_Used) ?? 0,
    httpCallsHardLimit: getNumberCell(fields.HTTP_Calls_Hard_Limit),
    billable: getBooleanCell(fields.Billable),
  };
}

export async function listLiveWorkspaceQuotas(): Promise<LiveWorkspaceQuota[]> {
  const config = getAirtableConfig();

  const records = await airtableListRecords<AirtableQuotaFields>({
    table: config.tables.usageLedger,
    view: config.views.workspaceQuota,
    sorts: [{ field: "Workspace_ID_Text", direction: "asc" }],
  });

  return records
    .map(mapQuotaRecord)
    .filter((item) => Boolean(item.workspaceId));
}

export async function getLiveWorkspaceQuotaByWorkspaceId(
  workspaceId: string
): Promise<LiveWorkspaceQuota | null> {
  const config = getAirtableConfig();
  const normalized = workspaceId.trim();

  if (!normalized) {
    return null;
  }

  const record = await airtableFirstRecord<AirtableQuotaFields>({
    table: config.tables.usageLedger,
    view: config.views.workspaceQuota,
    filterByFormula: `{Workspace_ID_Text}='${airtableEscapeFormulaValue(normalized)}'`,
    maxRecords: 1,
  });

  return record ? mapQuotaRecord(record) : null;
}
