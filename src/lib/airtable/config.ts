import "server-only";

export type AirtableConfig = {
  apiKey: string;
  baseId: string;
  tables: {
    workspaces: string;
    profiles: string;
    memberships: string;
    usageLedger: string;
  };
  views: {
    workspaceQuota: string;
  };
  requestTimeoutMs: number;
};

function text(value?: string | null): string {
  return String(value || "").trim();
}

function numberFromEnv(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function isAirtableLiveConfigured(): boolean {
  return Boolean(
    text(process.env.AIRTABLE_API_KEY) && text(process.env.AIRTABLE_BASE_ID)
  );
}

export function getAirtableConfig(): AirtableConfig {
  const apiKey = text(process.env.AIRTABLE_API_KEY);
  const baseId = text(process.env.AIRTABLE_BASE_ID);

  if (!apiKey) {
    throw new Error("Missing AIRTABLE_API_KEY");
  }

  if (!baseId) {
    throw new Error("Missing AIRTABLE_BASE_ID");
  }

  return {
    apiKey,
    baseId,
    tables: {
      workspaces: text(process.env.AIRTABLE_TABLE_WORKSPACES) || "Workspaces",
      profiles: text(process.env.AIRTABLE_TABLE_PROFILES) || "Profiles",
      memberships:
        text(process.env.AIRTABLE_TABLE_MEMBERSHIPS) || "Memberships",
      usageLedger:
        text(process.env.AIRTABLE_TABLE_USAGE_LEDGER) || "Usage_Ledger",
    },
    views: {
      workspaceQuota:
        text(process.env.AIRTABLE_VIEW_WORKSPACE_QUOTA) ||
        "Workspace_Quota_V1",
    },
    requestTimeoutMs: numberFromEnv(
      text(process.env.AIRTABLE_REQUEST_TIMEOUT_MS),
      15000
    ),
  };
}
