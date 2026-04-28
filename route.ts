import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RouteContext = {
  params:
    | Promise<{
        id: string;
      }>
    | {
        id: string;
      };
};

type JsonRecord = Record<string, unknown>;

type AirtableRecord = {
  id: string;
  fields: JsonRecord;
};

type AirtableReadResult = {
  http_status: number | null;
  record_id: string | null;
  record: AirtableRecord | null;
  error: string | null;
};

type AirtableListResult = {
  http_status: number | null;
  records: AirtableRecord[];
  error: string | null;
  formula_used: string | null;
};

type PreflightCheckStatus = "pass" | "warning" | "fail";

type PreflightRequiredBefore =
  | "mutation"
  | "registry"
  | "command_creation"
  | "execution"
  | "review";

type PreflightCheckItem = {
  id: string;
  label: string;
  status: PreflightCheckStatus;
  blocking: boolean;
  evidence: string;
  required_before: PreflightRequiredBefore;
};

type Confidence = "high" | "medium" | "low" | "unknown";
type CapabilityRole = "router" | "executable" | "terminal" | "orchestrator" | "unknown";

const VERSION = "Incident Detail V5.36";
const SOURCE = "dashboard_incident_detail_v5_36_human_review_gate";
const MODE = "POST_RUN_DRY_RUN_RESULT_REVIEW_ONLY";
const READER_VERSION = "V5.36_HUMAN_REVIEW_GATE";

const INPUT_JSON_FIELD_CANDIDATES = [
  "Input_JSON",
  "input_json",
  "Input JSON",
  "InputJSON",
  "inputJson",
];

const JSON_FIELD_CANDIDATES = [
  "Result_JSON",
  "result_json",
  "Result JSON",
  "ResultJSON",
  "resultJson",
  "Output_JSON",
  "output_json",
  "Output JSON",
  "OutputJSON",
  "outputJson",
  "Response_JSON",
  "response_json",
  "Response JSON",
  "ResponseJSON",
  "responseJson",
  "Input_JSON",
  "input_json",
  "Input JSON",
  "InputJSON",
  "inputJson",
  "Result",
  "result",
  "Output",
  "output",
  "Response",
  "response",
];

function jsonResponse(payload: JsonRecord, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function getEnv(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function getAirtableConfig() {
  const token =
    getEnv("AIRTABLE_API_KEY") ||
    getEnv("AIRTABLE_TOKEN") ||
    getEnv("AIRTABLE_PAT");

  return {
    baseId: getEnv("AIRTABLE_BASE_ID"),
    token,
    operatorIntentsTable:
      getEnv("AIRTABLE_OPERATOR_INTENTS_TABLE") || "Operator_Intents",
    operatorApprovalsTable:
      getEnv("AIRTABLE_OPERATOR_APPROVALS_TABLE") || "Operator_Approvals",
    commandsTable: getEnv("AIRTABLE_COMMANDS_TABLE") || "Commands",
    runsTable:
      getEnv("AIRTABLE_SYSTEM_RUNS_TABLE") ||
      getEnv("AIRTABLE_RUNS_TABLE") ||
      "System_Runs",
    toolCatalogTable:
      getEnv("AIRTABLE_TOOLCATALOG_TABLE") ||
      getEnv("AIRTABLE_TOOL_CATALOG_TABLE") ||
      "ToolCatalog",
    workspaceCapabilitiesTable:
      getEnv("AIRTABLE_WORKSPACE_CAPABILITIES_TABLE") ||
      "Workspace_Capabilities",
  };
}

function airtableConfigPublic(config: ReturnType<typeof getAirtableConfig>) {
  return {
    base_id: config.baseId ? "CONFIGURED" : "MISSING",
    operator_intents_table: config.operatorIntentsTable,
    operator_approvals_table: config.operatorApprovalsTable,
    commands_table: config.commandsTable,
    runs_table: config.runsTable,
    toolcatalog_table: config.toolCatalogTable,
    workspace_capabilities_table: config.workspaceCapabilitiesTable,
    token: config.token ? "CONFIGURED" : "MISSING",
    token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function airtableUrl(baseId: string, tableName: string): string {
  return `https://api.airtable.com/v0/${encodeURIComponent(
    baseId
  )}/${encodeURIComponent(tableName)}`;
}

function airtableRecordUrl(baseId: string, tableName: string, recordId: string) {
  return `${airtableUrl(baseId, tableName)}/${encodeURIComponent(recordId)}`;
}

function airtableHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): JsonRecord {
  return isJsonRecord(value) ? value : {};
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeLooseRawText(value: string): string {
  return value
    .replace(/\uFEFF/g, "")
    .replace(/[\u200B-\u200D\u2060]/g, "")
    .replace(/[“”„‟]/g, '"')
    .replace(/[‘’‚‛]/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .trim();
}

function extractLikelyJsonBody(value: string): string {
  const text = normalizeLooseRawText(value);
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return text.slice(firstBrace, lastBrace + 1);
  }

  return text;
}

function parseFlexibleJsonRecord(value: unknown): JsonRecord | null {
  if (isJsonRecord(value)) return value;
  if (typeof value !== "string") return null;

  const raw = value.trim();
  if (!raw) return null;

  const unquoted = raw.replace(/^"+|"+$/g, "");
  const candidates = [
    raw,
    normalizeLooseRawText(raw),
    extractLikelyJsonBody(raw),
    unquoted,
    unquoted.replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    extractLikelyJsonBody(unquoted.replace(/\\"/g, '"').replace(/\\\\/g, "\\")),
  ];

  for (const candidate of candidates) {
    const parsed = safeParseJson(candidate);

    if (isJsonRecord(parsed)) return parsed;

    if (typeof parsed === "string") {
      const secondParse = safeParseJson(parsed);
      if (isJsonRecord(secondParse)) return secondParse;
    }
  }

  return null;
}

function readPath(record: unknown, path: string): unknown {
  if (!isJsonRecord(record)) return undefined;
  const parts = path.split(".");
  let current: unknown = record;

  for (const part of parts) {
    if (!isJsonRecord(current)) return undefined;
    current = current[part];
  }

  return current;
}

function pickUnknown(record: unknown, paths: string[]): unknown {
  for (const path of paths) {
    const value = readPath(record, path);

    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return undefined;
}

function pickString(record: unknown, paths: string[], fallback = ""): string {
  const value = pickUnknown(record, paths);

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  return fallback;
}

function pickBoolean(record: unknown, paths: string[], fallback = false): boolean {
  const value = pickUnknown(record, paths);

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "off", "disabled", "inactive"].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function pickOptionalBoolean(record: unknown, paths: string[]): boolean | null {
  const value = pickUnknown(record, paths);

  if (value === undefined || value === null || value === "") return null;
  return pickBoolean(record, paths, false);
}

function pickNumber(record: unknown, paths: string[], fallback = 0): number {
  const value = pickUnknown(record, paths);

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function pickArray<T = unknown>(record: unknown, paths: string[]): T[] {
  const value = pickUnknown(record, paths);

  if (Array.isArray(value)) return value as T[];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as T[];
    } catch {
      return [];
    }
  }

  return [];
}

function pickRecord(record: unknown, paths: string[]): JsonRecord | null {
  const value = pickUnknown(record, paths);

  if (isJsonRecord(value)) return value;

  if (typeof value === "string") {
    const parsed = parseFlexibleJsonRecord(value);
    if (parsed) return parsed;
  }

  return null;
}

function stringField(fields: JsonRecord, names: string[], fallback = "") {
  return pickString(fields, names, fallback);
}

function booleanField(fields: JsonRecord, names: string[], fallback = false) {
  return pickBoolean(fields, names, fallback);
}

function normalizeStatusToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function normalizeConfidence(value: unknown): Confidence {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "unknown";
}

function sanitizeErrorText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"')
      .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[REDACTED]"')
      .slice(0, 4000);
  }

  if (value instanceof Error) return value.message.slice(0, 4000);

  try {
    return JSON.stringify(value).slice(0, 4000);
  } catch {
    return "Unknown error";
  }
}

function sanitizeObject(value: unknown, depth = 0): unknown {
  if (depth > 10) return "[MAX_DEPTH_REDACTED]";

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeObject(item, depth + 1));
  }

  if (isJsonRecord(value)) {
    const output: JsonRecord = {};

    for (const [key, raw] of Object.entries(value)) {
      if (/secret|token|authorization|password|credential|api[_-]?key/i.test(key)) {
        output[key] = "SERVER_SIDE_ONLY_NOT_EXPOSED";
      } else {
        output[key] = sanitizeObject(raw, depth + 1);
      }
    }

    return output;
  }

  if (typeof value === "string") return value.slice(0, 12000);
  return value;
}

function getRawInputJsonText(fields: JsonRecord): {
  rawText: string;
  inputJsonFieldUsed: string | null;
  inputJsonRawPresent: boolean;
} {
  for (const fieldName of INPUT_JSON_FIELD_CANDIDATES) {
    const rawValue = fields[fieldName];

    if (rawValue === undefined || rawValue === null || rawValue === "") continue;

    if (typeof rawValue === "string") {
      return {
        rawText: rawValue,
        inputJsonFieldUsed: fieldName,
        inputJsonRawPresent: true,
      };
    }

    return {
      rawText: JSON.stringify(rawValue),
      inputJsonFieldUsed: fieldName,
      inputJsonRawPresent: true,
    };
  }

  return {
    rawText: "",
    inputJsonFieldUsed: null,
    inputJsonRawPresent: false,
  };
}

function readFlexibleInputJson(fields: JsonRecord):
  | {
      ok: true;
      value: JsonRecord;
      inputJsonFieldUsed: string;
      inputJsonRawPresent: boolean;
      inputJsonParseFailed: false;
    }
  | {
      ok: false;
      code: "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED" | "RUN_DRAFT_AUDIT_JSON_MISSING";
      value: null;
      inputJsonFieldUsed: string | null;
      inputJsonRawPresent: boolean;
      inputJsonParseFailed: boolean;
    } {
  for (const fieldName of INPUT_JSON_FIELD_CANDIDATES) {
    const rawValue = fields[fieldName];

    if (rawValue === undefined || rawValue === null || rawValue === "") continue;

    const parsed = parseFlexibleJsonRecord(rawValue);

    if (parsed) {
      return {
        ok: true,
        value: parsed,
        inputJsonFieldUsed: fieldName,
        inputJsonRawPresent: true,
        inputJsonParseFailed: false,
      };
    }

    return {
      ok: false,
      code: "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED",
      value: null,
      inputJsonFieldUsed: fieldName,
      inputJsonRawPresent: true,
      inputJsonParseFailed: true,
    };
  }

  return {
    ok: false,
    code: "RUN_DRAFT_AUDIT_JSON_MISSING",
    value: null,
    inputJsonFieldUsed: null,
    inputJsonRawPresent: false,
    inputJsonParseFailed: false,
  };
}

function extractRawString(rawText: string, keys: string[]): string {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const quotedRegex = new RegExp(
      `["']${escapedKey}["']\\s*:\\s*["']([^"']*)["']`,
      "i"
    );
    const quotedMatch = text.match(quotedRegex);

    if (quotedMatch?.[1]) return quotedMatch[1].trim();

    const looseRegex = new RegExp(
      `${escapedKey}\\s*[:=]\\s*["']?([^"',}\\]\\s]+)`,
      "i"
    );
    const looseMatch = text.match(looseRegex);

    if (looseMatch?.[1]) return looseMatch[1].trim();
  }

  return "";
}

function extractRawBoolean(rawText: string, keys: string[], fallback = false): boolean {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `["']?${escapedKey}["']?\\s*:\\s*["']?(true|false|1|0|yes|no|on|off)["']?`,
      "i"
    );
    const match = text.match(regex);

    if (match?.[1]) {
      const normalized = match[1].toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) return true;
      if (["false", "0", "no", "off"].includes(normalized)) return false;
    }
  }

  return fallback;
}

function extractRawNumber(rawText: string, keys: string[], fallback = 0): number {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `["']?${escapedKey}["']?\\s*:\\s*["']?(-?\\d+(?:\\.\\d+)?)["']?`,
      "i"
    );
    const match = text.match(regex);

    if (match?.[1]) {
      const parsed = Number(match[1]);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return fallback;
}

function buildLooseAuditFromRawText(rawText: string): JsonRecord {
  const repaired = parseFlexibleJsonRecord(rawText);
  if (repaired) return repaired;

  const audit: JsonRecord = {};

  const postRunStatus = extractRawString(rawText, [
    "post_run_status",
    "postrunstatus",
    "postRunStatus",
  ]);
  const workerCallStatus = extractRawString(rawText, [
    "worker_call_status",
    "workercallstatus",
    "workerCallStatus",
  ]);
  const runExecutionStatus = extractRawString(rawText, [
    "run_execution_status",
    "runexecutionstatus",
    "runExecutionStatus",
  ]);
  const airtableRecordId = extractRawString(rawText, [
    "airtable_record_id",
    "airtablerecordid",
    "airtableRecordId",
  ]);
  const runId = extractRawString(rawText, ["run_id", "runid", "runId"]);
  const commandOrchestrator = extractRawString(rawText, [
    "command_orchestrator",
    "commandorchestrator",
    "commandOrchestrator",
    "capability",
  ]);
  const errorsCount = extractRawNumber(rawText, [
    "errors_count",
    "errorscount",
    "errorsCount",
  ]);
  const dryRun = extractRawBoolean(rawText, ["dry_run", "dryrun", "dryRun"], true);

  if (postRunStatus) audit.postrunstatus = postRunStatus;
  if (workerCallStatus) audit.workercallstatus = workerCallStatus;
  if (runExecutionStatus) audit.runexecutionstatus = runExecutionStatus;
  if (airtableRecordId) audit.airtablerecordid = airtableRecordId;
  if (runId) audit.runid = runId;
  if (commandOrchestrator) audit.commandorchestrator = commandOrchestrator;
  audit.errorscount = errorsCount;
  audit.dryrun = dryRun;

  return audit;
}

function detectAuditKeyFormat(audit: JsonRecord): {
  keyFormatDetected: "snake_case" | "compact" | "mixed" | "unknown";
  acceptedSnakeCaseKeys: boolean;
  acceptedCompactKeys: boolean;
} {
  const snakeKeys = [
    "post_run_status",
    "worker_call_status",
    "run_execution_status",
    "worker_response_sanitized",
    "commands_record_ids",
    "errors_count",
    "airtable_record_id",
    "run_id",
    "command_orchestrator",
  ];

  const compactKeys = [
    "postrunstatus",
    "workercallstatus",
    "runexecutionstatus",
    "workerresponsesanitized",
    "commandsrecordids",
    "errorscount",
    "airtablerecordid",
    "runid",
    "commandorchestrator",
  ];

  const hasSnake = snakeKeys.some((key) => audit[key] !== undefined);
  const hasCompact = compactKeys.some((key) => audit[key] !== undefined);

  return {
    keyFormatDetected: hasSnake && hasCompact ? "mixed" : hasSnake ? "snake_case" : hasCompact ? "compact" : "unknown",
    acceptedSnakeCaseKeys: hasSnake,
    acceptedCompactKeys: hasCompact,
  };
}

function normalizeRunDraftAudit(audit: JsonRecord) {
  const postRunStatus = pickString(audit, [
    "post_run_status",
    "postrunstatus",
    "postRunStatus",
  ]);
  const workerCallStatus = pickString(audit, [
    "worker_call_status",
    "workercallstatus",
    "workerCallStatus",
  ]);
  const runExecutionStatus = pickString(audit, [
    "run_execution_status",
    "runexecutionstatus",
    "runExecutionStatus",
  ]);
  const workerResponseSanitized = pickRecord(audit, [
    "worker_response_sanitized",
    "workerresponsesanitized",
    "workerResponseSanitized",
  ]);
  const commandsRecordIds = pickArray<string>(audit, [
    "commands_record_ids",
    "commandsrecordids",
    "commandsRecordIds",
  ]);
  const errorsCount = pickNumber(audit, ["errors_count", "errorscount", "errorsCount"]);
  const airtableRecordId = pickString(audit, [
    "airtable_record_id",
    "airtablerecordid",
    "airtableRecordId",
  ]);
  const runId = pickString(audit, ["run_id", "runid", "runId"]);
  const commandOrchestrator = pickUnknown(audit, [
    "command_orchestrator",
    "commandorchestrator",
    "commandOrchestrator",
  ]);

  const normalizedPostRunStatus = normalizeStatusToken(postRunStatus);
  const normalizedWorkerCallStatus = normalizeStatusToken(workerCallStatus);
  const normalizedRunExecutionStatus = normalizeStatusToken(runExecutionStatus);

  return {
    postRunStatus,
    workerCallStatus,
    runExecutionStatus,
    workerResponseSanitized,
    commandsRecordIds,
    errorsCount,
    airtableRecordId,
    runId,
    commandOrchestrator,
    normalizedPostRunStatus,
    normalizedWorkerCallStatus,
    normalizedRunExecutionStatus,
    postRunDryRunWasSent: normalizedPostRunStatus === "POSTRUNDRYRUNSENT",
    workerDryRunCallWasSent: normalizedWorkerCallStatus === "DRYRUNCALLSENT",
    runExecutionWasDryRunOnly: normalizedRunExecutionStatus === "DRYRUNONLY",
  };
}

function buildIds(workspaceId: string, incidentId: string) {
  return {
    intentId: `operator-intent:v5.4:${workspaceId}:${incidentId}`,
    intentIdempotencyKey: `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`,
    approvalId: `operator-approval:v5.11:${workspaceId}:${incidentId}`,
    approvalIdempotencyKey: `dashboard:v5.11:gated-operator-approval-persistence:${workspaceId}:${incidentId}`,
    commandDraftId: `command-draft:v5.13:${workspaceId}:${incidentId}`,
    commandIdempotencyKey: `dashboard:v5.13:gated-command-draft-persistence:${workspaceId}:${incidentId}`,
    operationalQueueTransitionId: `operational-queue-transition:v5.19:${workspaceId}:${incidentId}`,
    operationalQueueTransitionIdempotencyKey: `dashboard:v5.19:gated-operational-queue-persistence:${workspaceId}:${incidentId}`,
    runDraftId: `run-draft:v5.22:${workspaceId}:${incidentId}`,
    runIdempotencyKey: `dashboard:v5.22:gated-run-draft-persistence:${workspaceId}:${incidentId}`,
  };
}

function getWorkspaceId(request: Request): string {
  const url = new URL(request.url);
  return (url.searchParams.get("workspace_id") || url.searchParams.get("workspaceId") || "default").trim();
}

async function findRecordByIdempotencyKey(args: {
  baseId: string;
  token: string;
  tableName: string;
  idempotencyKey: string;
}): Promise<AirtableReadResult> {
  const formula = `{Idempotency_Key}='${escapeFormulaValue(args.idempotencyKey)}'`;
  const url = `${airtableUrl(args.baseId, args.tableName)}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: airtableHeaders(args.token),
      cache: "no-store",
    });
    const text = await response.text();
    const parsed = asRecord(safeParseJson(text));

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: null,
        record: null,
        error: sanitizeErrorText(text),
      };
    }

    const records = Array.isArray(parsed.records) ? (parsed.records as AirtableRecord[]) : [];
    const record = records[0] ?? null;

    return {
      http_status: response.status,
      record_id: record?.id ?? null,
      record,
      error: null,
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: null,
      record: null,
      error: sanitizeErrorText(error),
    };
  }
}

async function readAirtableRecordById(args: {
  baseId: string;
  token: string;
  tableName: string;
  recordId: string;
}): Promise<AirtableReadResult> {
  const url = airtableRecordUrl(args.baseId, args.tableName, args.recordId);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: airtableHeaders(args.token),
      cache: "no-store",
    });
    const text = await response.text();
    const parsed = asRecord(safeParseJson(text));

    if (!response.ok) {
      return {
        http_status: response.status,
        record_id: args.recordId,
        record: null,
        error: sanitizeErrorText(text),
      };
    }

    const record = parsed.id
      ? ({ id: String(parsed.id), fields: asRecord(parsed.fields) } satisfies AirtableRecord)
      : null;

    return {
      http_status: response.status,
      record_id: record?.id ?? args.recordId,
      record,
      error: null,
    };
  } catch (error) {
    return {
      http_status: null,
      record_id: args.recordId,
      record: null,
      error: sanitizeErrorText(error),
    };
  }
}

async function readRecordsByFormula(args: {
  baseId: string;
  token: string;
  tableName: string;
  formula: string;
  maxRecords?: number;
}): Promise<AirtableListResult> {
  const url = `${airtableUrl(args.baseId, args.tableName)}?maxRecords=${args.maxRecords ?? 10}&filterByFormula=${encodeURIComponent(args.formula)}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: airtableHeaders(args.token),
      cache: "no-store",
    });
    const text = await response.text();
    const parsed = asRecord(safeParseJson(text));

    if (!response.ok) {
      return {
        http_status: response.status,
        records: [],
        error: sanitizeErrorText(text),
        formula_used: args.formula,
      };
    }

    const records = Array.isArray(parsed.records) ? (parsed.records as AirtableRecord[]) : [];

    return {
      http_status: response.status,
      records,
      error: null,
      formula_used: args.formula,
    };
  } catch (error) {
    return {
      http_status: null,
      records: [],
      error: sanitizeErrorText(error),
      formula_used: args.formula,
    };
  }
}

async function readFirstSuccessfulRegistryFormula(args: {
  baseId: string;
  token: string;
  tableName: string;
  formulas: string[];
  maxRecords?: number;
}): Promise<AirtableListResult> {
  let lastResult: AirtableListResult = {
    http_status: null,
    records: [],
    error: "No formula attempted",
    formula_used: null,
  };

  for (const formula of args.formulas) {
    const result = await readRecordsByFormula({
      baseId: args.baseId,
      token: args.token,
      tableName: args.tableName,
      formula,
      maxRecords: args.maxRecords,
    });

    lastResult = result;

    if (!result.error) return result;
  }

  return lastResult;
}

async function maybeFindRegistryRecords(args: {
  baseId: string;
  token: string;
  toolCatalogTable: string;
  workspaceCapabilitiesTable: string;
  workspaceId: string;
  capability: string;
}) {
  const capability = escapeFormulaValue(args.capability);
  const workspaceId = escapeFormulaValue(args.workspaceId);

  const toolCatalogFormulas = [
    `OR({Capability}='${capability}',{Capability_Key}='${capability}',{Tool_Key}='${capability}',{Name}='${capability}')`,
    `{Capability}='${capability}'`,
    `{Capability_Key}='${capability}'`,
    `{Tool_Key}='${capability}'`,
    `{Name}='${capability}'`,
  ];

  const workspaceCapabilityFormulas = [
    `AND(OR({Workspace_ID}='${workspaceId}',{Workspace}='${workspaceId}'),OR({Capability}='${capability}',{Capability_Key}='${capability}'))`,
    `AND({Workspace_ID}='${workspaceId}',{Capability}='${capability}')`,
    `AND({Workspace_ID}='${workspaceId}',{Capability_Key}='${capability}')`,
    `AND({Workspace}='${workspaceId}',{Capability}='${capability}')`,
    `AND({Workspace}='${workspaceId}',{Capability_Key}='${capability}')`,
    `{Capability}='${capability}'`,
    `{Capability_Key}='${capability}'`,
  ];

  const [toolcatalog, workspaceCapabilities] = await Promise.all([
    readFirstSuccessfulRegistryFormula({
      baseId: args.baseId,
      token: args.token,
      tableName: args.toolCatalogTable,
      formulas: toolCatalogFormulas,
      maxRecords: 5,
    }),
    readFirstSuccessfulRegistryFormula({
      baseId: args.baseId,
      token: args.token,
      tableName: args.workspaceCapabilitiesTable,
      formulas: workspaceCapabilityFormulas,
      maxRecords: 5,
    }),
  ]);

  return {
    toolcatalog,
    workspaceCapabilities,
  };
}

function readJsonRecordFromFields(fields: JsonRecord, names: string[]): {
  value: JsonRecord | null;
  fieldName: string | null;
  rawPresent: boolean;
} {
  let firstPresentField: string | null = null;

  for (const fieldName of names) {
    const rawValue = fields[fieldName];

    if (rawValue === undefined || rawValue === null || rawValue === "") continue;

    if (!firstPresentField) firstPresentField = fieldName;

    const parsed = parseFlexibleJsonRecord(rawValue);

    if (parsed) {
      return { value: parsed, fieldName, rawPresent: true };
    }
  }

  return { value: null, fieldName: firstPresentField, rawPresent: Boolean(firstPresentField) };
}

function buildWorkerResponseFallbackFromRecord(args: {
  record: AirtableRecord;
  workspaceId: string;
}): {
  workerResponse: JsonRecord;
  resultJsonFound: boolean;
  resultJsonFieldUsed: string | null;
} {
  const fields = args.record.fields;
  const parsedJson = readJsonRecordFromFields(fields, JSON_FIELD_CANDIDATES);
  const payload = parsedJson.value ?? {};
  const payloadBody = pickRecord(payload, ["body"]) ?? {};
  const payloadResult = pickRecord(payloadBody, ["result"]) ?? pickRecord(payload, ["result"]) ?? payload;

  const commandRecordIds =
    pickArray<string>(payloadResult, ["commands_record_ids", "commandsrecordids", "commandsRecordIds"]).length > 0
      ? pickArray<string>(payloadResult, ["commands_record_ids", "commandsrecordids", "commandsRecordIds"])
      : pickArray<string>(fields, [
          "Commands_Record_IDs",
          "Command_Record_IDs",
          "commands_record_ids",
          "commandsrecordids",
          "Command_Record_ID",
          "command_record_id",
        ]);

  const result = {
    scanned: pickNumber(payloadResult, ["scanned"], pickNumber(fields, ["Scanned"], 0)),
    executed: pickNumber(payloadResult, ["executed"], pickNumber(fields, ["Executed"], 0)),
    succeeded: pickNumber(payloadResult, ["succeeded"], pickNumber(fields, ["Succeeded"], 0)),
    failed: pickNumber(payloadResult, ["failed"], pickNumber(fields, ["Failed"], 0)),
    blocked: pickNumber(payloadResult, ["blocked"], pickNumber(fields, ["Blocked"], 0)),
    unsupported: pickNumber(payloadResult, ["unsupported"], pickNumber(fields, ["Unsupported"], 0)),
    errors_count: pickNumber(
      payloadResult,
      ["errors_count", "errorscount", "errorsCount"],
      pickNumber(fields, ["Errors_Count", "errors_count", "Errors"], 0)
    ),
    commands_record_ids: commandRecordIds
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
    workspace_id: pickString(payloadResult, ["workspace_id", "workspaceid", "workspaceId"], args.workspaceId),
    selection_mode: pickString(payloadResult, ["selection_mode", "selectionmode"]),
    view: pickString(payloadResult, ["view"]),
  };

  const body = {
    ok: true,
    worker: pickString(payloadBody, ["worker"], pickString(payload, ["worker"])),
    capability: pickString(
      payloadBody,
      ["capability"],
      pickString(payload, ["capability"], stringField(fields, ["Capability", "capability"], "command_orchestrator"))
    ),
    run_id: pickString(
      payloadBody,
      ["run_id", "runid", "runId"],
      pickString(payload, ["run_id", "runid", "runId"], stringField(fields, ["Run_ID", "run_id", "Run ID", "runId"]))
    ),
    airtable_record_id: pickString(
      payloadBody,
      ["airtable_record_id", "airtablerecordid", "airtableRecordId"],
      pickString(payload, ["airtable_record_id", "airtablerecordid", "airtableRecordId"], args.record.id)
    ),
    result,
  };

  return {
    workerResponse: {
      ok: true,
      http_status: pickNumber(payload, ["http_status", "httpstatus", "httpStatus"], 200),
      source: "worker_airtable_run_record_fallback",
      airtable_record_id: args.record.id,
      body,
    },
    resultJsonFound: Boolean(parsedJson.value),
    resultJsonFieldUsed: parsedJson.fieldName,
  };
}

function buildUnsupportedCommandDiagnosis(args: {
  commandRecordId: string | null;
  commandId: string;
  commandFields: JsonRecord;
  commandStatus: string;
  commandStatusSelect: string;
  workerDryRunResult: {
    scanned: number;
    executed: number;
    unsupported: number;
    errors_count: number;
    capability: string;
    commands_record_ids: string[];
  };
}) {
  const capabilityRequested = stringField(
    args.commandFields,
    ["Capability", "capability"],
    args.workerDryRunResult.capability || "command_orchestrator"
  );
  const targetMode = stringField(args.commandFields, ["Target_Mode", "target_mode", "targetMode"], "dry_run_only");
  const dryRun = booleanField(args.commandFields, ["Dry_Run", "dry_run", "dryRun"], true);
  const workerCallAllowed = booleanField(args.commandFields, ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"], false);
  const runCreationAllowed = booleanField(args.commandFields, ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"], false);

  const unsupportedConfirmed =
    args.workerDryRunResult.unsupported >= 1 &&
    args.workerDryRunResult.executed === 0 &&
    args.workerDryRunResult.errors_count === 0;

  const normalizedCommandStatusSelect = normalizeStatusToken(args.commandStatusSelect);
  const normalizedTargetMode = normalizeStatusToken(targetMode);

  const unsupportedCategory =
    normalizedCommandStatusSelect === "UNSUPPORTED" && unsupportedConfirmed
      ? "COMMAND_STATUS_UNSUPPORTED"
      : normalizedTargetMode === "DRYRUNONLY" && dryRun && !workerCallAllowed && !runCreationAllowed
        ? "DRY_RUN_ONLY_NOT_EXECUTABLE"
        : unsupportedConfirmed
          ? "CAPABILITY_ALLOWLIST_OR_ROUTER_MISMATCH"
          : "UNKNOWN_UNSUPPORTED_REASON";

  return {
    available: true,
    diagnosis_version: "V5.27_UNSUPPORTED_COMMAND_DIAGNOSIS",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    capability_requested: capabilityRequested,
    command_status: args.commandStatus,
    command_status_select: args.commandStatusSelect,
    target_mode: targetMode || null,
    dry_run: dryRun,
    worker_call_allowed: workerCallAllowed,
    run_creation_allowed: runCreationAllowed,
    worker_result_scanned_count: args.workerDryRunResult.scanned,
    worker_result_unsupported_count: args.workerDryRunResult.unsupported,
    worker_result_executed_count: args.workerDryRunResult.executed,
    worker_result_errors_count: args.workerDryRunResult.errors_count,
    worker_command_record_seen: args.commandRecordId
      ? args.workerDryRunResult.commands_record_ids.includes(args.commandRecordId)
      : false,
    unsupported_confirmed: unsupportedConfirmed,
    unsupported_category: unsupportedCategory,
    probable_reason:
      unsupportedCategory === "COMMAND_STATUS_UNSUPPORTED"
        ? "The worker scanned the command but treated it as unsupported because the command record is currently marked Unsupported or the execution router does not consider this queued command executable."
        : unsupportedCategory === "DRY_RUN_ONLY_NOT_EXECUTABLE"
          ? "The command is intentionally configured as dry_run_only with worker_call_allowed=false and run_creation_allowed=false, so it is not eligible for real execution in the current gated chain."
          : "The worker classified the command as unsupported, but the available persisted evidence is not sufficient to assign a more specific reason.",
    safety_interpretation:
      "This is expected in the current gated dry-run chain. The command was reviewed without real execution rights.",
    real_execution_blocker: true,
    recommended_next_action:
      "Inspect the Command router and the Status_select=Unsupported transition for command_orchestrator. Confirm whether command_orchestrator is intended to execute from the current queue or should spawn/route to a lower-level executable capability.",
    required_before_real_run: [
      "verify worker capability allowlist",
      "verify command router supports command_orchestrator",
      "verify command payload schema",
      "verify target_mode can be promoted safely",
      "verify operator approval for non-dry-run execution",
      "add rollback/cancel path before real execution",
    ],
    guardrail_interpretation:
      "V5.27 is diagnostic only. It does not execute the command, does not call the worker, does not mutate Airtable, and does not promote dry-run to real-run.",
  };
}

function commandPayloadPresent(commandFields: JsonRecord): boolean {
  const directRecord = pickRecord(commandFields, [
    "Command_Input_JSON",
    "command_input_json",
    "Command Input JSON",
    "commandInputJson",
    "Input_JSON",
    "input_json",
    "Input JSON",
    "inputJson",
    "Payload_JSON",
    "payload_json",
    "Payload JSON",
    "payloadJson",
    "Payload",
    "payload",
  ]);

  const directString = stringField(commandFields, [
    "Command_Input_JSON",
    "command_input_json",
    "Command Input JSON",
    "commandInputJson",
    "Input_JSON",
    "input_json",
    "Input JSON",
    "inputJson",
    "Payload_JSON",
    "payload_json",
    "Payload JSON",
    "payloadJson",
    "Payload",
    "payload",
  ]);

  return Boolean(directRecord && Object.keys(directRecord).length > 0) || Boolean(directString.trim()) || Object.keys(commandFields).length > 0;
}

function buildRouterAllowlistReadiness(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  commandStatus: string;
  commandStatusSelect: string;
  workerDryRunResult: {
    unsupported: number;
    capability: string;
  };
}) {
  const capabilityRequested = stringField(
    args.commandFields,
    ["Capability", "capability"],
    args.workerDryRunResult.capability || "command_orchestrator"
  );
  const targetMode = stringField(args.commandFields, ["Target_Mode", "target_mode", "targetMode"], "dry_run_only");
  const dryRun = booleanField(args.commandFields, ["Dry_Run", "dry_run", "dryRun"], true);
  const workerCallAllowed = booleanField(args.commandFields, ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"], false);
  const runCreationAllowed = booleanField(args.commandFields, ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"], false);
  const toolKey = stringField(args.commandFields, ["Tool_Key", "tool_key", "Tool Key", "toolKey", "Tool", "tool"]);
  const toolMode = stringField(args.commandFields, ["Tool_Mode", "tool_mode", "Tool Mode", "toolMode", "Mode", "mode"]);
  const payloadPresent = commandPayloadPresent(args.commandFields);
  const normalizedCapability = normalizeStatusToken(capabilityRequested);

  const blockers = [
    "Command is intentionally gated as dry_run_only with worker_call_allowed=false and run_creation_allowed=false.",
    "Command Status_select is Unsupported. Real execution must remain blocked until router/allowlist mapping is reviewed.",
    "Tool_Key / Tool_Mode not found on Command record. ToolCatalog readiness cannot be confirmed from this surface.",
    "Worker dry-run returned unsupported=1. Router or allowlist readiness must be inspected before real execution.",
  ];

  const warnings = [
    normalizedCapability === "COMMANDORCHESTRATOR"
      ? "command_orchestrator may be an orchestration capability rather than a directly executable business capability."
      : "Capability should still be verified against router and allowlist before execution.",
    payloadPresent
      ? "Command payload exists, but schema validation is not performed in V5.28."
      : "Command payload is not readable from current Command fields. Payload schema cannot be validated.",
  ];

  return {
    available: true,
    inspection_version: "V5.28_ROUTER_ALLOWLIST_READINESS_INSPECTION",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    capability_requested: capabilityRequested,
    command_status: args.commandStatus,
    command_status_select: args.commandStatusSelect,
    target_mode: targetMode || null,
    dry_run: dryRun,
    worker_call_allowed: workerCallAllowed,
    run_creation_allowed: runCreationAllowed,
    tool_key: toolKey || null,
    tool_mode: toolMode || null,
    command_payload_present: payloadPresent,
    direct_execution_ready: false,
    router_ready: false,
    allowlist_ready: false,
    readiness_category: "NOT_READY_DRY_RUN_ONLY",
    readiness_score: 0,
    blockers,
    warnings,
    next_safe_action:
      "Inspect whether command_orchestrator should execute directly, or only spawn/route to a lower-level executable capability. Then inspect ToolCatalog / Worker router mapping in read-only mode.",
    real_run_allowed_by_readiness: false,
    guardrail_interpretation:
      "V5.28 is inspection only. It does not call the worker, does not inspect external registries, does not mutate Airtable, and does not promote dry-run to real-run.",
  };
}

function buildToolCatalogRegistryReadiness(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  capabilityRequested: string;
  toolCatalogTable: string;
  workspaceCapabilitiesTable: string;
  registryReads: {
    toolcatalog: AirtableListResult;
    workspaceCapabilities: AirtableListResult;
  } | null;
}) {
  const toolKeyFromCommand = stringField(args.commandFields, ["Tool_Key", "tool_key", "Tool Key", "toolKey", "Tool", "tool"]);
  const toolModeFromCommand = stringField(args.commandFields, ["Tool_Mode", "tool_mode", "Tool Mode", "toolMode", "Mode", "mode"]);
  const toolCatalogRecords = args.registryReads?.toolcatalog.records ?? [];
  const workspaceCapabilityRecords = args.registryReads?.workspaceCapabilities.records ?? [];
  const toolCatalogReadError = args.registryReads?.toolcatalog.error ?? null;
  const workspaceCapabilityReadError = args.registryReads?.workspaceCapabilities.error ?? null;
  const firstToolCatalogFields = toolCatalogRecords[0]?.fields ?? {};
  const firstWorkspaceFields = workspaceCapabilityRecords[0]?.fields ?? {};

  const executableHint = toolCatalogRecords.length > 0
    ? pickOptionalBoolean(firstToolCatalogFields, [
        "Executable",
        "Is_Executable",
        "is_executable",
        "Can_Execute",
        "can_execute",
        "Execution_Allowed",
        "execution_allowed",
        "Enabled",
        "enabled",
        "Active",
        "active",
      ])
    : null;
  const routerHint = toolCatalogRecords.length > 0
    ? pickOptionalBoolean(firstToolCatalogFields, ["Router", "Is_Router", "is_router", "Router_Only", "router_only"])
    : null;
  const workspaceEnabledHint = workspaceCapabilityRecords.length > 0
    ? pickOptionalBoolean(firstWorkspaceFields, ["Enabled", "enabled", "Active", "active", "Allowed", "allowed"])
    : null;

  return {
    available: true,
    inspection_version: "V5.29_TOOLCATALOG_REGISTRY_READINESS_INSPECTION",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    capability_requested: args.capabilityRequested,
    tool_key_from_command: toolKeyFromCommand || null,
    tool_mode_from_command: toolModeFromCommand || null,
    toolcatalog: {
      attempted: Boolean(args.registryReads),
      table: args.toolCatalogTable,
      records_found: toolCatalogRecords.length,
      read_error: toolCatalogReadError,
      matched_record_ids: toolCatalogRecords.map((record) => record.id),
      formula_used: args.registryReads?.toolcatalog.formula_used ?? null,
      capability_known: toolCatalogRecords.length > 0,
      executable_hint: executableHint,
      router_hint: routerHint,
    },
    workspace_capabilities: {
      attempted: Boolean(args.registryReads),
      table: args.workspaceCapabilitiesTable,
      records_found: workspaceCapabilityRecords.length,
      read_error: workspaceCapabilityReadError,
      matched_record_ids: workspaceCapabilityRecords.map((record) => record.id),
      formula_used: args.registryReads?.workspaceCapabilities.formula_used ?? null,
      workspace_capability_known: workspaceCapabilityRecords.length > 0,
      workspace_capability_enabled_hint: workspaceEnabledHint,
    },
    registry_readiness_category: "TOOL_MAPPING_MISSING_ON_COMMAND",
    registry_readiness_score: 0,
    registry_ready_for_real_run: false,
    blockers: [
      "Command has no Tool_Key / Tool_Mode. Registry mapping cannot be promoted to real execution.",
      `ToolCatalog did not confirm capability ${args.capabilityRequested}.`,
      `Workspace_Capabilities did not confirm capability ${args.capabilityRequested} for workspace ${args.workspaceId}.`,
    ],
    warnings: [
      "command_orchestrator may be an orchestration capability. It may need to spawn a lower-level executable capability rather than execute directly.",
    ],
    next_safe_action:
      "Add or confirm Tool_Key / Tool_Mode on the Command model in a future controlled schema step before considering real execution.",
    guardrail_interpretation:
      "V5.29 is registry inspection only. It reads Airtable registry tables in GET/read-only mode when available. It does not call the worker, mutate Airtable, or promote dry-run to real-run.",
  };
}

function buildWorkerRouterMappingInspection(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  commandStatus: string;
  commandStatusSelect: string;
  workerDryRunResult: {
    unsupported: number;
    capability: string;
  };
  routerAllowlistReadiness: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
}) {
  const capabilityRequested = stringField(args.commandFields, ["Capability", "capability"], args.workerDryRunResult.capability || "command_orchestrator");
  const capabilityRole: "orchestrator" | "executable" | "unknown" =
    normalizeStatusToken(capabilityRequested) === "COMMANDORCHESTRATOR"
      ? "orchestrator"
      : capabilityRequested
        ? "executable"
        : "unknown";
  const targetMode = stringField(args.commandFields, ["Target_Mode", "target_mode", "targetMode"], "dry_run_only");
  const dryRun = booleanField(args.commandFields, ["Dry_Run", "dry_run", "dryRun"], true);
  const workerCallAllowed = booleanField(args.commandFields, ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"], false);
  const runCreationAllowed = booleanField(args.commandFields, ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"], false);
  const toolKey = pickString(args.toolcatalogRegistryReadiness, ["tool_key_from_command"]) || pickString(args.routerAllowlistReadiness, ["tool_key"]);
  const toolMode = pickString(args.toolcatalogRegistryReadiness, ["tool_mode_from_command"]) || pickString(args.routerAllowlistReadiness, ["tool_mode"]);
  const payloadPresent = pickBoolean(args.routerAllowlistReadiness, ["command_payload_present"], false);

  return {
    available: true,
    inspection_version: "V5.30_WORKER_ROUTER_MAPPING_INSPECTION",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    capability_requested: capabilityRequested,
    capability_role: capabilityRole,
    direct_execution_expected: false,
    spawn_or_route_expected: capabilityRole === "orchestrator",
    likely_target_capability: null,
    target_capability_confidence: "unknown" as Confidence,
    router_mapping_category: "MISSING_TOOL_MAPPING",
    router_mapping_score: 0,
    router_mapping_ready_for_real_run: false,
    blockers: [
      "Tool_Key / Tool_Mode are missing, so the router cannot map this command to an executable tool.",
      "Registry readiness is false. Router mapping cannot be promoted to real execution.",
      "Command is already marked Unsupported by the dry-run path. Router mapping must be reviewed before any promotion.",
      "Command is gated as dry-run only and cannot be routed to real execution.",
      "command_orchestrator has no proven target capability in the current Command fields.",
    ],
    warnings: [
      "command_orchestrator should likely route or spawn a lower-level executable capability instead of executing directly.",
      "Command payload exists, but V5.30 does not validate the router schema.",
    ],
    next_safe_action:
      "Define Tool_Key / Tool_Mode and registry entries in a controlled schema step, then rerun read-only readiness inspection.",
    evidence: {
      tool_key_present: Boolean(toolKey),
      tool_mode_present: Boolean(toolMode),
      registry_ready_for_real_run: false,
      router_allowlist_real_run_allowed: false,
      command_payload_present: payloadPresent,
      status_select: args.commandStatusSelect || null,
      target_mode: targetMode || null,
      dry_run: dryRun,
      worker_call_allowed: workerCallAllowed,
      run_creation_allowed: runCreationAllowed,
      worker_unsupported_count: args.workerDryRunResult.unsupported,
    },
    guardrail_interpretation:
      "V5.30 is router mapping inspection only. It does not call the worker, mutate Airtable, create target commands, or promote dry-run to real-run.",
  };
}

function buildCandidateCapability(args: {
  capability: string;
  role: "executable" | "router" | "terminal" | "unknown";
  score: number;
  confidence: Confidence;
  reasons: string[];
  blockers: string[];
}) {
  return {
    capability: args.capability,
    role: args.role,
    score: args.score,
    confidence: args.confidence,
    reasons: args.reasons,
    blockers: args.blockers,
    recommended: false,
  };
}

function buildTargetCapabilityDecisionMatrix(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  workerDryRunResult: {
    unsupported: number;
    capability: string;
  };
  routerAllowlistReadiness: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
}) {
  const sourceCapability =
    pickString(args.workerRouterMappingInspection, ["capability_requested"]) ||
    stringField(args.commandFields, ["Capability", "capability"]) ||
    args.workerDryRunResult.capability ||
    "command_orchestrator";
  const sourceCapabilityRole = pickString(args.workerRouterMappingInspection, ["capability_role"], "orchestrator");
  const globalBlocker = "Global prerequisites are not satisfied, so this candidate cannot be recommended for real execution.";

  const candidateCapabilities = [
    buildCandidateCapability({
      capability: "http_exec",
      role: "executable",
      score: 30,
      confidence: "low",
      reasons: ["Found 2 contextual signal(s) for http_exec."],
      blockers: [globalBlocker],
    }),
    buildCandidateCapability({
      capability: "incident_router",
      role: "router",
      score: 50,
      confidence: "low",
      reasons: ["Found 2 contextual signal(s) for incident_router."],
      blockers: [globalBlocker],
    }),
    buildCandidateCapability({
      capability: "internal_escalate",
      role: "executable",
      score: 0,
      confidence: "unknown",
      reasons: [],
      blockers: [globalBlocker, "No explicit escalation, urgent, critical, manager, or alert signal is present."],
    }),
    buildCandidateCapability({
      capability: "resolve_incident",
      role: "terminal",
      score: 0,
      confidence: "unknown",
      reasons: [],
      blockers: [globalBlocker, "No explicit resolved, resolution, or close incident signal is present."],
    }),
    buildCandidateCapability({
      capability: "smart_resolve",
      role: "router",
      score: 0,
      confidence: "unknown",
      reasons: [],
      blockers: [globalBlocker, "No explicit smart_resolve, low severity, or final resolution signal is present."],
    }),
    buildCandidateCapability({
      capability: "complete_flow_incident",
      role: "terminal",
      score: 0,
      confidence: "unknown",
      reasons: [],
      blockers: [globalBlocker, "No explicit complete_flow_incident or incident flow completion signal is present."],
    }),
    buildCandidateCapability({
      capability: "complete_flow_demo",
      role: "terminal",
      score: 0,
      confidence: "unknown",
      reasons: [],
      blockers: [
        globalBlocker,
        "complete_flow_demo must not be recommended for a real ferrera-production incident unless demo context is explicit.",
        "No explicit demo, complete_flow_demo, or clean_test signal is present.",
      ],
    }),
  ];

  return {
    available: true,
    inspection_version: "V5.31_TARGET_CAPABILITY_DECISION_MATRIX",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    source_capability: sourceCapability,
    source_capability_role: sourceCapabilityRole,
    decision_ready: false,
    selected_target_capability: null,
    selected_target_confidence: "unknown" as Confidence,
    decision_category: "TOOL_MAPPING_REQUIRED_FIRST",
    candidate_capabilities: candidateCapabilities,
    missing_decision_inputs: [
      "Tool_Key / Tool_Mode are missing.",
      "Registry readiness is false.",
      "Worker router mapping readiness is false.",
      "No explicit target capability is present.",
    ],
    blockers: [
      "Tool_Key / Tool_Mode are missing, so no target capability can be selected with high confidence.",
      "ToolCatalog / Workspace_Capabilities do not confirm a real-run-ready mapping.",
      "Worker router mapping is not ready for real execution.",
      "No lower-level target capability is proven in the current Command fields.",
      "Command is marked Unsupported or worker returned unsupported=1.",
      "Command target_mode is dry_run_only, so target selection cannot imply execution.",
    ],
    warnings: [
      "Command payload exists, but V5.31 does not validate an executable schema.",
      "Source capability is an orchestrator. It should only select or route to a target capability after explicit mapping is proven.",
    ],
    next_safe_action:
      "Define Tool_Key / Tool_Mode and explicit target capability mapping before selecting a lower-level capability.",
    guardrail_interpretation:
      "V5.31 is a decision matrix only. It does not create commands, call the worker, mutate Airtable, or promote dry-run to real-run.",
  };
}

function buildExecutionMappingContractDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  commandStatus: string;
  commandStatusSelect: string;
  routerAllowlistReadiness: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
}) {
  const sourceCapability =
    pickString(args.workerRouterMappingInspection, ["capability_requested"]) ||
    stringField(args.commandFields, ["Capability", "capability"], "command_orchestrator");
  const sourceRole = pickString(args.workerRouterMappingInspection, ["capability_role"], "orchestrator");
  const targetMode = stringField(args.commandFields, ["Target_Mode", "target_mode", "targetMode"], "dry_run_only");
  const payloadPresent = pickBoolean(args.routerAllowlistReadiness, ["command_payload_present"], true);

  return {
    available: true,
    contract_version: "V5.32_EXECUTION_MAPPING_CONTRACT_DRAFT",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    source: {
      capability: sourceCapability,
      role: sourceRole,
      direct_execution_allowed: false,
      current_status: args.commandStatus || null,
      current_status_select: args.commandStatusSelect || null,
      current_target_mode: targetMode || null,
    },
    target: {
      selected_target_capability: null,
      target_selection_ready: false,
      target_selection_source: "target_capability_decision_matrix",
      target_confidence: "unknown" as Confidence,
      target_required_before_execution: true,
    },
    tool_mapping: {
      tool_key_required: true,
      tool_key_current: pickString(args.toolcatalogRegistryReadiness, ["tool_key_from_command"]) || null,
      tool_mode_required: true,
      tool_mode_current: pickString(args.toolcatalogRegistryReadiness, ["tool_mode_from_command"]) || null,
      tool_mapping_ready: false,
    },
    registry_contract: {
      toolcatalog_entry_required: true,
      workspace_capability_entry_required: true,
      registry_ready: false,
      registry_ready_for_real_run: false,
    },
    payload_contract: {
      payload_present: payloadPresent,
      payload_schema_validated: false,
      payload_schema_required: true,
    },
    promotion_contract: {
      current_mode: targetMode || null,
      promotion_required: true,
      promotion_ready: false,
      operator_approval_required: true,
      rollback_required: true,
      real_run_allowed: false,
    },
    contract_status: "CONTRACT_BLOCKED_TOOL_MAPPING",
    contract_ready_for_execution: false,
    missing_contract_inputs: [
      "Target capability is not selected.",
      "Tool_Key / Tool_Mode are missing.",
      "ToolCatalog / Workspace_Capabilities registry is not ready for real run.",
      "Payload schema has not been validated.",
      "Promotion policy from dry_run_only is missing.",
    ],
    blockers: [
      "Target capability is not selected. Execution mapping cannot proceed.",
      "Tool_Key / Tool_Mode are required before execution mapping can be considered complete.",
      "ToolCatalog / Workspace_Capabilities registry is not ready for real run.",
      "Command is still dry_run_only. A separate promotion policy is required before real execution.",
    ],
    warnings: [
      "command_orchestrator should not be promoted to direct execution until router and target capability mapping are explicit.",
      "Payload exists but schema has not been validated.",
    ],
    next_safe_action: "Define Tool_Key / Tool_Mode before completing the execution mapping contract.",
    guardrail_interpretation:
      "V5.32 is an execution mapping contract draft only. It does not create commands, call the worker, mutate Airtable, or promote dry-run to real-run.",
  };
}

function buildToolMappingProposalDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  workerDryRunResult: { unsupported: number };
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
}) {
  const sourceCapability =
    pickString(args.workerRouterMappingInspection, ["capability_requested"]) ||
    stringField(args.commandFields, ["Capability", "capability"], "command_orchestrator");
  const sourceRole = pickString(args.workerRouterMappingInspection, ["capability_role"], "orchestrator");

  return {
    available: true,
    proposal_version: "V5.33_TOOL_MAPPING_PROPOSAL_DRAFT",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    source: {
      capability: sourceCapability,
      role: sourceRole,
      current_tool_key: pickString(args.toolcatalogRegistryReadiness, ["tool_key_from_command"]) || null,
      current_tool_mode: pickString(args.toolcatalogRegistryReadiness, ["tool_mode_from_command"]) || null,
      direct_execution_allowed: false,
    },
    proposal: {
      proposed_tool_key: "incident_router",
      proposed_tool_mode: "router_only" as const,
      proposed_target_capability: "incident_router",
      proposed_target_role: "router" as CapabilityRole,
      proposal_confidence: "low" as Confidence,
      proposal_ready_to_apply: false,
      proposal_apply_allowed: false,
    },
    reasoning: {
      strongest_candidate: "incident_router",
      strongest_candidate_score: 50,
      strongest_candidate_confidence: "low" as Confidence,
      why_not_ready: [
        "Tool_Key / Tool_Mode are missing on the current Command.",
        "Registry readiness is false.",
        "Target capability decision is not ready.",
        "Worker router mapping is not ready.",
        "Command is still dry_run_only.",
        "Command is marked Unsupported.",
      ],
      why_read_only: [
        "V5.33 does not mutate Airtable.",
        "V5.33 does not create Tool_Key / Tool_Mode.",
        "V5.33 does not create ToolCatalog records.",
        "V5.33 does not create Workspace_Capabilities records.",
        "V5.33 does not create target Commands.",
        "V5.33 does not call the worker.",
        "V5.33 does not promote dry-run to real-run.",
      ],
    },
    required_before_apply: [
      "choose target capability explicitly",
      "define Tool_Key",
      "define Tool_Mode",
      "create or confirm ToolCatalog entry",
      "create or confirm Workspace_Capabilities entry",
      "validate payload schema",
      "define promotion policy",
      "require operator approval",
      "define rollback/cancel path",
      "rerun read-only inspection after mapping",
    ],
    blockers: [
      "Current Command has no Tool_Key / Tool_Mode.",
      "Registry readiness is false.",
      "Target capability decision is not ready.",
      "Worker router mapping is not ready.",
      "Command is still dry_run_only.",
      "Command is marked Unsupported.",
      "Proposal is not approved for mutation or execution.",
    ],
    warnings: [
      "This is a proposal draft only. It must not be applied automatically.",
      "Proposed target capability incident_router is a low-confidence draft and must be validated before any mapping is applied.",
    ],
    next_safe_action:
      `Review the draft mapping ${sourceCapability} -> incident_router, then define Tool_Key / Tool_Mode and registry entries in a separate controlled step.`,
    guardrail_interpretation:
      "V5.33 is a tool mapping proposal draft only. It does not create mappings, mutate Airtable, call the worker, create commands, or promote dry-run to real-run.",
  };
}

function buildControlledMappingPlan(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  toolMappingProposalDraft: JsonRecord;
  executionMappingContractDraft: JsonRecord;
}) {
  const source = asRecord(readPath(args.toolMappingProposalDraft, "source"));
  const proposal = asRecord(readPath(args.toolMappingProposalDraft, "proposal"));
  const sourceCapability = pickString(source, ["capability"], "command_orchestrator");
  const sourceRole = pickString(source, ["role"], "orchestrator");
  const proposedToolKey = pickString(proposal, ["proposed_tool_key"], "incident_router");
  const proposedToolMode = pickString(proposal, ["proposed_tool_mode"], "router_only");
  const proposedTargetCapability = pickString(proposal, ["proposed_target_capability"], "incident_router");
  const proposedTargetRole = pickString(proposal, ["proposed_target_role"], "router");
  const proposalConfidence = normalizeConfidence(pickString(proposal, ["proposal_confidence"], "low"));
  const payloadContract = asRecord(readPath(args.executionMappingContractDraft, "payload_contract"));

  return {
    available: true,
    plan_version: "V5.34_CONTROLLED_MAPPING_PLAN",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    proposed_mapping: {
      source_capability: sourceCapability,
      source_role: sourceRole,
      proposed_tool_key: proposedToolKey,
      proposed_tool_mode: proposedToolMode,
      proposed_target_capability: proposedTargetCapability,
      proposed_target_role: proposedTargetRole,
      proposal_confidence: proposalConfidence,
      apply_allowed_now: false,
    },
    plan_status: "PLAN_BLOCKED_BY_LOW_CONFIDENCE_PROPOSAL",
    plan_ready_for_mutation: false,
    plan_ready_for_execution: false,
    real_run_allowed: false,
    implementation_sequence: [
      `Human review of proposed mapping ${sourceCapability} -> ${proposedTargetCapability}`,
      `Define Tool_Key = ${proposedToolKey} on a future controlled mutation path`,
      `Define Tool_Mode = ${proposedToolMode} on a future controlled mutation path`,
      `Create or confirm ToolCatalog entry for ${proposedTargetCapability}`,
      `Create or confirm Workspace_Capabilities entry for ${args.workspaceId} + ${proposedTargetCapability}`,
      `Define payload schema for ${proposedTargetCapability}`,
      "Validate payload against schema",
      "Define promotion policy from dry_run_only to executable",
      "Require explicit operator approval",
      "Define rollback/cancel path",
      "Rerun GET read-only inspection",
      "Only after all checks pass, consider a separate gated mutation endpoint",
    ],
    validation_sequence: [
      "confirm proposed target capability is correct",
      `confirm ${sourceCapability} should route to ${proposedTargetCapability}`,
      `confirm ${proposedTargetCapability} exists in worker router`,
      "confirm ToolCatalog entry exists",
      "confirm Workspace_Capabilities entry exists",
      "confirm payload schema validates",
      "confirm command is no longer Unsupported only after controlled update",
      "confirm dry_run_only remains until explicit promotion",
      "confirm operator approval is fresh",
      "confirm rollback path exists",
    ],
    rollback_sequence: [
      "keep original Command unchanged until mutation phase",
      "preserve Run Draft evidence",
      "preserve Worker run evidence",
      "if future mapping fails, revert Tool_Key / Tool_Mode",
      "if future registry check fails, disable mapping",
      "if future worker dry-run fails, do not promote to real-run",
      "keep real-run forbidden by default",
    ],
    objects_to_prepare_later: {
      command_fields: [
        { field: "Tool_Key", proposed_value: proposedToolKey, status: "draft_only" },
        { field: "Tool_Mode", proposed_value: proposedToolMode, status: "draft_only" },
        { field: "Target_Capability", proposed_value: proposedTargetCapability, status: "draft_only" },
        { field: "Mapping_Status", proposed_value: "Draft / Review only", status: "draft_only" },
        { field: "Real_Run", proposed_value: "Forbidden", status: "must_remain_forbidden" },
      ],
      toolcatalog_entry: {
        Tool_Key: proposedToolKey,
        Capability: proposedTargetCapability,
        Tool_Mode: proposedToolMode,
        Executable: false,
        Router: true,
        Status: "Draft",
        note: "Draft only. Do not create from V5.34.",
      },
      workspace_capability_entry: {
        Workspace_ID: args.workspaceId,
        Capability_Key: proposedTargetCapability,
        Enabled: false,
        Status: "Draft",
        note: "Draft only. Do not create from V5.34.",
      },
      payload_schema: {
        capability: proposedTargetCapability,
        schema_required: true,
        schema_validated: false,
        payload_present: pickBoolean(payloadContract, ["payload_present"], true),
        note: "Schema must be defined and validated before any executable mapping.",
      },
      promotion_policy: {
        from: "dry_run_only",
        to: "executable",
        allowed_now: false,
        requires_operator_approval: true,
        requires_rollback: true,
        note: "Promotion must be a separate explicit policy, never implicit from this review route.",
      },
      operator_approval: {
        required: true,
        current_approval_valid_for_real_run: false,
        reason: "Current approval covers dry-run / draft only, not real execution.",
      },
    },
    preconditions_before_any_mutation: [
      "human review completed",
      "proposed target capability explicitly accepted",
      "Tool_Key and Tool_Mode approved for controlled mutation",
      "ToolCatalog entry design approved",
      "Workspace_Capabilities entry design approved",
      "payload schema defined",
      "rollback/cancel path defined",
      "fresh operator approval for mutation obtained",
      "separate mutation endpoint or manual controlled update prepared",
    ],
    preconditions_before_any_execution: [
      "Tool_Key exists on Command",
      "Tool_Mode exists on Command",
      "target capability is explicitly selected",
      "ToolCatalog confirms target capability",
      "Workspace_Capabilities confirms workspace can use target capability",
      "worker router supports target capability",
      "payload schema validates",
      "command is safely rechecked after mutation",
      "dry_run_only promotion policy is approved",
      "fresh operator approval for execution exists",
      "rollback/cancel path exists",
      "real-run feature gate remains explicit and closed by default",
    ],
    blockers: [
      "Tool mapping proposal confidence is low. Human review is required before any mutation.",
      "Current Command has no Tool_Key / Tool_Mode. Mapping fields must be defined in a controlled mutation step later.",
      "ToolCatalog / Workspace_Capabilities are not ready. Registry entries must be created or confirmed before execution.",
      "Payload schema is not validated. No executable mapping can be approved before schema validation.",
      "Promotion from dry_run_only to executable mode is not ready.",
      "Target capability decision is not ready. Proposed mapping must remain a draft.",
      "Worker router mapping is not ready for real execution.",
    ],
    warnings: [
      "V5.34 is a controlled mapping plan only. It must not mutate Airtable or create execution objects.",
      "The proposed target capability incident_router is a planning candidate, not an approved runtime mapping.",
    ],
    next_safe_action:
      "Perform human review of the low-confidence mapping proposal, then prepare a separate controlled mutation path for Tool_Key / Tool_Mode only after registry, payload schema, promotion policy, and rollback requirements are explicit.",
    guardrail_interpretation:
      "V5.34 is a controlled mapping plan only. It does not create mappings, mutate Airtable, call the worker, create commands, create registry records, or promote dry-run to real-run.",
  };
}

function buildPreflightCheckItem(args: {
  id: string;
  label: string;
  status: PreflightCheckStatus;
  blocking: boolean;
  evidence: string;
  requiredBefore: PreflightRequiredBefore;
}): PreflightCheckItem {
  return {
    id: args.id,
    label: args.label,
    status: args.status,
    blocking: args.blocking,
    evidence: args.evidence,
    required_before: args.requiredBefore,
  };
}

function summarizePreflightChecks(groups: PreflightCheckItem[][]) {
  const checks = groups.flat();

  return {
    total_checks: checks.length,
    passed_checks: checks.filter((check) => check.status === "pass").length,
    warning_checks: checks.filter((check) => check.status === "warning").length,
    failed_checks: checks.filter((check) => check.status === "fail").length,
    blocking_checks: checks.filter((check) => check.blocking).length,
  };
}

function buildMappingPreflightChecklist(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  approvalFound: boolean;
  commandFields: JsonRecord;
  workerDryRunResult: {
    http_status: number | null;
    ok: boolean;
    scanned: number;
    unsupported: number;
  };
  reviewCheck: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
}) {
  const proposal = asRecord(readPath(args.toolMappingProposalDraft, "proposal"));
  const controlledProposal = asRecord(readPath(args.controlledMappingPlan, "proposed_mapping"));
  const payloadContract = asRecord(readPath(args.executionMappingContractDraft, "payload_contract"));
  const promotionContract = asRecord(readPath(args.executionMappingContractDraft, "promotion_contract"));
  const toolcatalog = asRecord(readPath(args.toolcatalogRegistryReadiness, "toolcatalog"));
  const workspaceCapabilities = asRecord(readPath(args.toolcatalogRegistryReadiness, "workspace_capabilities"));

  const proposedToolKey = pickString(controlledProposal, ["proposed_tool_key"]) || pickString(proposal, ["proposed_tool_key"]);
  const proposedToolMode = pickString(controlledProposal, ["proposed_tool_mode"]) || pickString(proposal, ["proposed_tool_mode"]);
  const proposedTargetCapability = pickString(controlledProposal, ["proposed_target_capability"]) || pickString(proposal, ["proposed_target_capability"]);
  const proposalConfidence = normalizeConfidence(pickString(controlledProposal, ["proposal_confidence"]) || pickString(proposal, ["proposal_confidence"], "unknown"));
  const proposalConfidenceAcceptable = proposalConfidence === "medium" || proposalConfidence === "high";
  const currentToolKey = pickString(args.toolcatalogRegistryReadiness, ["tool_key_from_command"]);
  const currentToolMode = pickString(args.toolcatalogRegistryReadiness, ["tool_mode_from_command"]);
  const toolCatalogReadable = pickBoolean(toolcatalog, ["attempted"], false) && !pickString(toolcatalog, ["read_error"]);
  const workspaceReadable = pickBoolean(workspaceCapabilities, ["attempted"], false) && !pickString(workspaceCapabilities, ["read_error"]);
  const toolCatalogEntryExists = pickNumber(toolcatalog, ["records_found"], 0) > 0;
  const workspaceEntryExists = pickNumber(workspaceCapabilities, ["records_found"], 0) > 0;
  const registryReady = pickBoolean(args.toolcatalogRegistryReadiness, ["registry_ready_for_real_run"], false);
  const payloadPresent = pickBoolean(payloadContract, ["payload_present"], true);
  const payloadSchemaValidated = pickBoolean(payloadContract, ["payload_schema_validated"], false);
  const currentMode = pickString(promotionContract, ["current_mode"], "dry_run_only");
  const realRunAllowed = false;
  const promotionAllowedNow = false;
  const rollbackSequenceListed = Array.isArray(readPath(args.controlledMappingPlan, "rollback_sequence"));
  const rollbackValidated = false;
  const commandStatusSelect = stringField(args.commandFields, ["Status_select", "status_select"], "Unsupported");
  const routerMappingReady = pickBoolean(args.workerRouterMappingInspection, ["router_mapping_ready_for_real_run"], false);
  const targetCapabilitySelected = pickBoolean(args.targetCapabilityDecisionMatrix, ["decision_ready"], false) && Boolean(pickString(args.targetCapabilityDecisionMatrix, ["selected_target_capability"]));

  const mappingMutationPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "mapping_proposal_exists", label: "Mapping proposal exists", status: "pass", blocking: false, evidence: "tool_mapping_proposal_draft.available=true.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "proposal_confidence_acceptable", label: "Proposal confidence is acceptable", status: proposalConfidenceAcceptable ? "pass" : "fail", blocking: true, evidence: `proposal_confidence=${proposalConfidence}. Medium or higher is required before mutation.`, requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "proposed_tool_key_exists", label: "Proposed Tool_Key exists", status: proposedToolKey ? "pass" : "fail", blocking: !proposedToolKey, evidence: proposedToolKey ? `proposed_tool_key=${proposedToolKey}.` : "No proposed_tool_key is available.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "proposed_tool_mode_exists", label: "Proposed Tool_Mode exists", status: proposedToolMode ? "pass" : "fail", blocking: !proposedToolMode, evidence: proposedToolMode ? `proposed_tool_mode=${proposedToolMode}.` : "No proposed_tool_mode is available.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "current_command_has_no_conflicting_tool_key", label: "Current Command has no conflicting Tool_Key", status: !currentToolKey && !currentToolMode ? "pass" : "warning", blocking: false, evidence: !currentToolKey && !currentToolMode ? "Current Command has no Tool_Key / Tool_Mode, so there is no conflicting mapping to overwrite." : `Current mapping exists: Tool_Key=${currentToolKey}, Tool_Mode=${currentToolMode}.`, requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "current_command_mutation_not_allowed_from_this_route", label: "Current Command mutation is not allowed from this route", status: "pass", blocking: false, evidence: "This GET surface is read-only and does not mutate Airtable.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "controlled_mapping_plan_exists", label: "Controlled mapping plan exists", status: "pass", blocking: false, evidence: `controlled_mapping_plan.plan_status=${pickString(args.controlledMappingPlan, ["plan_status"])}.`, requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "human_review_required", label: "Human review required", status: "warning", blocking: true, evidence: "Human review is required because the proposed mapping is low confidence and not approved for mutation.", requiredBefore: "review" }),
  ];

  const registryPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "toolcatalog_table_readable", label: "ToolCatalog table readable", status: toolCatalogReadable ? "pass" : "fail", blocking: !toolCatalogReadable, evidence: toolCatalogReadable ? "ToolCatalog read completed without error." : `ToolCatalog read unavailable or failed: ${pickString(toolcatalog, ["read_error"], "not attempted")}.`, requiredBefore: "registry" }),
    buildPreflightCheckItem({ id: "toolcatalog_entry_exists_for_proposed_target", label: "ToolCatalog entry exists for proposed target", status: toolCatalogEntryExists ? "pass" : "fail", blocking: true, evidence: toolCatalogEntryExists ? "ToolCatalog returned at least one matching record." : `No confirmed ToolCatalog entry for proposed target ${proposedTargetCapability || "unknown"}.`, requiredBefore: "registry" }),
    buildPreflightCheckItem({ id: "workspace_capabilities_table_readable", label: "Workspace_Capabilities table readable", status: workspaceReadable ? "pass" : "fail", blocking: !workspaceReadable, evidence: workspaceReadable ? "Workspace_Capabilities read completed without error." : `Workspace_Capabilities read unavailable or failed: ${pickString(workspaceCapabilities, ["read_error"], "not attempted")}.`, requiredBefore: "registry" }),
    buildPreflightCheckItem({ id: "workspace_capability_entry_exists", label: "Workspace_Capabilities entry exists for workspace + proposed target", status: workspaceEntryExists ? "pass" : "fail", blocking: true, evidence: workspaceEntryExists ? "Workspace_Capabilities returned at least one matching record." : `No confirmed Workspace_Capabilities entry for ${args.workspaceId} + ${proposedTargetCapability || "unknown"}.`, requiredBefore: "registry" }),
    buildPreflightCheckItem({ id: "registry_ready_for_real_run", label: "Registry ready for real-run", status: registryReady ? "pass" : "fail", blocking: true, evidence: `registry_ready_for_real_run=${registryReady}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "registry_mutation_not_allowed_from_this_route", label: "Registry mutation is not allowed from this route", status: "pass", blocking: false, evidence: "This route does not create or update ToolCatalog / Workspace_Capabilities records.", requiredBefore: "registry" }),
  ];

  const payloadSchemaPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "command_payload_present", label: "Command payload present", status: payloadPresent ? "pass" : "fail", blocking: !payloadPresent, evidence: `payload_present=${payloadPresent}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "payload_schema_exists", label: "Payload schema exists", status: "fail", blocking: true, evidence: "No validated payload schema object is available from the current read-only diagnostics.", requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "payload_schema_validated", label: "Payload schema validated", status: payloadSchemaValidated ? "pass" : "fail", blocking: true, evidence: `payload_schema_validated=${payloadSchemaValidated}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "payload_can_be_mapped_to_target_capability", label: "Payload can be mapped to proposed target capability", status: "fail", blocking: true, evidence: "Payload exists, but V5.35 does not validate that it matches incident_router schema.", requiredBefore: "execution" }),
  ];

  const promotionPolicyPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "current_mode_is_dry_run_only", label: "Current mode is dry_run_only", status: normalizeStatusToken(currentMode) === "DRYRUNONLY" ? "pass" : "warning", blocking: false, evidence: `current_mode=${currentMode || "unknown"}. dry_run_only remains a safety guardrail.`, requiredBefore: "review" }),
    buildPreflightCheckItem({ id: "promotion_policy_exists", label: "Promotion policy exists", status: "fail", blocking: true, evidence: "No explicit promotion policy from dry_run_only to executable is validated.", requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "promotion_allowed_now", label: "Promotion allowed now", status: promotionAllowedNow ? "pass" : "fail", blocking: true, evidence: `promotion_allowed_now=${promotionAllowedNow}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "real_run_remains_forbidden", label: "Real-run remains forbidden", status: !realRunAllowed ? "pass" : "fail", blocking: realRunAllowed, evidence: `real_run_allowed=${realRunAllowed}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "execution_separate_from_mapping", label: "Execution must be separate from mapping", status: "pass", blocking: false, evidence: "Mapping mutation, registry preparation, command creation, and real execution must remain separate gated steps.", requiredBefore: "execution" }),
  ];

  const operatorApprovalPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "current_approval_exists", label: "Current approval exists", status: args.approvalFound ? "pass" : "fail", blocking: !args.approvalFound, evidence: args.approvalFound ? "Operator approval record exists." : "Operator approval record is missing.", requiredBefore: "review" }),
    buildPreflightCheckItem({ id: "current_approval_scope_is_dry_run_only", label: "Current approval scope is dry-run/draft only", status: "pass", blocking: false, evidence: "Current approval is treated as valid for draft/dry-run review only, not mutation or real-run.", requiredBefore: "review" }),
    buildPreflightCheckItem({ id: "fresh_approval_required_for_mutation", label: "Fresh approval required for mutation", status: "fail", blocking: true, evidence: "No fresh operator approval for Tool_Key / Tool_Mode mutation is present.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "fresh_approval_required_for_real_run", label: "Fresh approval required for real-run", status: "fail", blocking: true, evidence: "No fresh operator approval for non-dry-run execution is present.", requiredBefore: "execution" }),
  ];

  const rollbackPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "rollback_path_defined", label: "Rollback path defined", status: rollbackSequenceListed ? "warning" : "fail", blocking: true, evidence: rollbackSequenceListed ? "Rollback sequence is listed in V5.34 but not operationally validated." : "Rollback sequence is missing.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "original_command_preserved", label: "Original Command preserved", status: "pass", blocking: false, evidence: "Current route is read-only, so original Command is preserved.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "run_draft_evidence_preserved", label: "Run Draft evidence preserved", status: "pass", blocking: false, evidence: "Current route reads Run Draft only and does not mutate it.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "worker_run_evidence_preserved", label: "Worker run evidence preserved", status: "pass", blocking: false, evidence: "Worker run evidence is read from persisted System_Runs record only.", requiredBefore: "mutation" }),
    buildPreflightCheckItem({ id: "revert_tool_mapping_strategy_defined", label: "Revert Tool_Key / Tool_Mode strategy defined", status: "warning", blocking: true, evidence: "Rollback strategy is described but not validated by an executable rollback procedure.", requiredBefore: "mutation" }),
  ];

  const executionPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({ id: "worker_dry_run_evidence_exists", label: "Worker dry-run evidence exists", status: "pass", blocking: false, evidence: `worker_response_exists=${pickBoolean(args.reviewCheck, ["worker_response_exists"])}, worker_ok=${args.workerDryRunResult.ok}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "worker_scanned_command", label: "Worker scanned command", status: "pass", blocking: false, evidence: `scanned=${args.workerDryRunResult.scanned}, command_seen=${pickBoolean(args.reviewCheck, ["worker_command_record_seen"])}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "worker_returned_unsupported", label: "Worker returned unsupported", status: args.workerDryRunResult.unsupported >= 1 ? "fail" : "pass", blocking: args.workerDryRunResult.unsupported >= 1, evidence: `unsupported=${args.workerDryRunResult.unsupported}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "command_status_select_unsupported", label: "Command Status_select is Unsupported", status: normalizeStatusToken(commandStatusSelect) === "UNSUPPORTED" ? "fail" : "pass", blocking: normalizeStatusToken(commandStatusSelect) === "UNSUPPORTED", evidence: `Status_select=${commandStatusSelect || "unknown"}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "router_mapping_ready_for_real_run", label: "Router mapping ready for real-run", status: routerMappingReady ? "pass" : "fail", blocking: true, evidence: `router_mapping_ready_for_real_run=${routerMappingReady}.`, requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "target_capability_selected", label: "Target capability selected", status: targetCapabilitySelected ? "pass" : "fail", blocking: true, evidence: `selected_target_capability=${pickString(args.targetCapabilityDecisionMatrix, ["selected_target_capability"], "null")}.`, requiredBefore: "command_creation" }),
    buildPreflightCheckItem({ id: "real_run_allowed", label: "Real-run allowed", status: "fail", blocking: true, evidence: "real_run_allowed=false.", requiredBefore: "execution" }),
    buildPreflightCheckItem({ id: "execution_forbidden_from_this_route", label: "Execution is forbidden from this route", status: "pass", blocking: false, evidence: "This route is GET/read-only and cannot execute worker runs or create commands.", requiredBefore: "execution" }),
  ];

  const groups = [
    mappingMutationPreflight,
    registryPreflight,
    payloadSchemaPreflight,
    promotionPolicyPreflight,
    operatorApprovalPreflight,
    rollbackPreflight,
    executionPreflight,
  ];
  const flatChecks = groups.flat();
  const checklistSummary = summarizePreflightChecks(groups);

  return {
    available: true,
    checklist_version: "V5.35_MAPPING_PREFLIGHT_CHECKLIST",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    preflight_status: "PREFLIGHT_BLOCKED_LOW_CONFIDENCE_MAPPING",
    preflight_ready_for_mapping_mutation: false,
    preflight_ready_for_registry_mutation: false,
    preflight_ready_for_command_creation: false,
    preflight_ready_for_execution: false,
    real_run_allowed: false,
    checklist_summary: checklistSummary,
    mapping_mutation_preflight: mappingMutationPreflight,
    registry_preflight: registryPreflight,
    payload_schema_preflight: payloadSchemaPreflight,
    promotion_policy_preflight: promotionPolicyPreflight,
    operator_approval_preflight: operatorApprovalPreflight,
    rollback_preflight: rollbackPreflight,
    execution_preflight: executionPreflight,
    blockers: Array.from(
      new Set(
        flatChecks
          .filter((check) => check.blocking && check.status === "fail")
          .map((check) => `${check.label}: ${check.evidence}`)
      )
    ),
    warnings: Array.from(
      new Set(
        flatChecks
          .filter((check) => check.status === "warning")
          .map((check) => `${check.label}: ${check.evidence}`)
      )
    ),
    next_safe_action:
      "Complete human review of the low-confidence mapping proposal, then validate registry entries, payload schema, promotion policy, fresh operator approval, and rollback before any separate controlled mutation endpoint is considered.",
    guardrail_interpretation:
      "V5.35 is a mapping preflight checklist only. It does not mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

function buildHumanReviewGate(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  approvalRecordId: string | null;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  const proposal = asRecord(readPath(args.toolMappingProposalDraft, "proposal"));
  const controlledProposal = asRecord(readPath(args.controlledMappingPlan, "proposed_mapping"));
  const checklistSummary = asRecord(readPath(args.mappingPreflightChecklist, "checklist_summary"));
  const payloadContract = asRecord(readPath(args.executionMappingContractDraft, "payload_contract"));
  const promotionContract = asRecord(readPath(args.executionMappingContractDraft, "promotion_contract"));
  const rollbackPreflightRaw = readPath(args.mappingPreflightChecklist, "rollback_preflight");
  const rollbackPreflight = Array.isArray(rollbackPreflightRaw)
    ? rollbackPreflightRaw.map((item) => asRecord(item))
    : [];

  const sourceCapability = pickString(controlledProposal, ["source_capability"], "command_orchestrator");
  const targetCapability = pickString(proposal, ["proposed_target_capability"]) || pickString(controlledProposal, ["proposed_target_capability"]);
  const mappingCandidate = targetCapability ? `${sourceCapability} -> ${targetCapability}` : null;
  const proposalConfidence = normalizeConfidence(pickString(proposal, ["proposal_confidence"], "unknown"));
  const preflightStatus = pickString(args.mappingPreflightChecklist, ["preflight_status"]);
  const blockingChecks = pickNumber(checklistSummary, ["blocking_checks"], 0);
  const registryReady = pickBoolean(args.toolcatalogRegistryReadiness, ["registry_ready_for_real_run"], false);
  const payloadSchemaValidated = pickBoolean(payloadContract, ["payload_schema_validated"], false);
  const promotionReady = pickBoolean(promotionContract, ["promotion_ready"], false);
  const rollbackValidated =
    rollbackPreflight.length > 0 &&
    rollbackPreflight.every((item) => {
      const status = pickString(item, ["status"]);
      const blocking = pickBoolean(item, ["blocking"], false);
      return status === "pass" || blocking === false;
    });

  const blockers = [
    "Mapping proposal confidence is low. Human review may discuss it, but cannot approve mutation yet.",
    `Mapping preflight still has ${blockingChecks} blocking check(s). Human review cannot approve mutation while blockers remain.`,
    "Mapping mutation preflight is not ready. Tool_Key / Tool_Mode mutation must remain blocked.",
    "Registry mutation preflight is not ready. ToolCatalog / Workspace_Capabilities mutation must remain blocked.",
    "Command creation preflight is not ready. Target Command creation must remain blocked.",
    "Execution preflight is not ready. Real-run must remain blocked.",
    "Registry readiness is false. Human review cannot approve execution before ToolCatalog and Workspace_Capabilities are confirmed.",
    "Payload schema is not validated. Human review cannot approve execution before payload schema validation.",
    "Promotion policy is not ready. Human review cannot approve dry_run_only to executable promotion.",
    "Rollback path is not operationally validated. Human review cannot approve mutation or real-run without rollback/cancel validation.",
    "Unsupported classification remains unresolved. Human review cannot approve real-run while unsupported remains active.",
  ];

  const warnings = [
    "Human review can discuss the proposed mapping, but this route must not create approval records or mutate Airtable.",
    "Current V5.11 approval is treated as draft/dry-run only and cannot authorize mapping mutation, registry mutation, command creation, or real-run.",
  ];

  return {
    available: true,
    gate_version: "V5.36_HUMAN_REVIEW_GATE",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    gate_status: "HUMAN_REVIEW_BLOCKED_BY_LOW_CONFIDENCE",
    review_scope: {
      can_review_mapping: true,
      can_approve_review_only: true,
      can_approve_mapping_mutation: false,
      can_approve_registry_mutation: false,
      can_approve_command_creation: false,
      can_approve_real_run: false,
    },
    proposed_review_decision: {
      mapping_candidate: mappingCandidate,
      recommendation:
        "Human review should evaluate the low-confidence mapping candidate, but must not approve mutation or execution yet.",
      confidence: proposalConfidence,
      human_review_required: true,
      approval_allowed_now: false,
      approval_scope_allowed_now: "review_only",
    },
    approval_boundaries: {
      current_approval_record_id: args.approvalRecordId,
      current_approval_scope: "draft_dry_run_only",
      current_approval_valid_for_mapping_mutation: false,
      current_approval_valid_for_registry_mutation: false,
      current_approval_valid_for_command_creation: false,
      current_approval_valid_for_real_run: false,
      fresh_approval_required_for_mutation: true,
      fresh_approval_required_for_real_run: true,
    },
    decision_inputs: {
      preflight_status: preflightStatus || null,
      proposal_confidence: proposalConfidence,
      blockers_count: blockers.length,
      blocking_checks: blockingChecks,
      registry_ready: registryReady,
      payload_schema_validated: payloadSchemaValidated,
      promotion_ready: promotionReady,
      rollback_validated: rollbackValidated,
      real_run_allowed: false,
    },
    human_questions_to_answer: [
      "Is incident_router the correct target capability for command_orchestrator?",
      "Should command_orchestrator route instead of execute directly?",
      "What exact Tool_Key should be written later?",
      "What exact Tool_Mode should be written later?",
      "Does ToolCatalog need a new incident_router entry?",
      "Does Workspace_Capabilities need a ferrera-production + incident_router entry?",
      "What payload schema should incident_router require?",
      "What rollback path is acceptable?",
      "What fresh approval is required before mutation?",
      "What separate gate is required before real-run?",
    ],
    required_before_human_approval: [
      "review V5.35 blockers",
      "confirm proposed mapping scope",
      "confirm proposal confidence can be upgraded or rejected",
      "confirm no mutation is being requested now",
      "confirm real-run remains forbidden",
    ],
    required_before_mutation_approval: [
      "improve proposal confidence to medium or high",
      "choose target capability explicitly",
      "define Tool_Key",
      "define Tool_Mode",
      "define ToolCatalog entry",
      "define Workspace_Capabilities entry",
      "validate payload schema",
      "validate rollback strategy",
      "create fresh operator approval for mutation",
      "implement separate mutation endpoint or manual controlled update",
    ],
    required_before_real_run_approval: [
      "mutation completed and rechecked",
      "registry ready",
      "router mapping ready",
      "target capability selected",
      "payload schema validated",
      "dry-run repeated successfully after mapping",
      "unsupported resolved",
      "promotion policy approved",
      "rollback/cancel path validated",
      "fresh real-run approval",
      "real-run feature gate explicitly opened in separate route",
    ],
    blockers,
    warnings,
    next_safe_action:
      "Run human review in review-only mode, decide whether the low-confidence command_orchestrator -> incident_router mapping should be accepted, rejected, or refined, then prepare a separate gated Operator Decision Draft.",
    guardrail_interpretation:
      "V5.36 is a human review gate only. It does not create approvals, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const incidentId = params.id;
  const workspaceId = getWorkspaceId(request);
  const ids = buildIds(workspaceId, incidentId);
  const airtable = getAirtableConfig();
  const configMissing = !airtable.baseId || !airtable.token;

  const emptyRead: AirtableReadResult = {
    http_status: null,
    record_id: null,
    record: null,
    error: configMissing ? "Airtable config missing" : null,
  };

  let intentRead = emptyRead;
  let approvalRead = emptyRead;
  let commandRead = emptyRead;
  let runRead = emptyRead;

  if (!configMissing) {
    [intentRead, approvalRead, commandRead, runRead] = await Promise.all([
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.operatorIntentsTable,
        idempotencyKey: ids.intentIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.operatorApprovalsTable,
        idempotencyKey: ids.approvalIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.commandsTable,
        idempotencyKey: ids.commandIdempotencyKey,
      }),
      findRecordByIdempotencyKey({
        baseId: airtable.baseId,
        token: airtable.token,
        tableName: airtable.runsTable,
        idempotencyKey: ids.runIdempotencyKey,
      }),
    ]);
  }

  const intentFields = intentRead.record?.fields ?? {};
  const approvalFields = approvalRead.record?.fields ?? {};
  const commandFields = commandRead.record?.fields ?? {};
  const runFields = runRead.record?.fields ?? {};
  const parsedInputJson = readFlexibleInputJson(runFields);
  const parsedInputJsonCode = "code" in parsedInputJson ? parsedInputJson.code : null;
  const rawInputJson = getRawInputJsonText(runFields);
  let runInputJson: JsonRecord = {};
  let rawFallbackUsed = false;
  let parserMode: "strict_json" | "loose_raw_text_fallback" | "unavailable" = "unavailable";

  if (parsedInputJson.ok) {
    runInputJson = parsedInputJson.value;
    parserMode = "strict_json";
  } else if (
    parsedInputJsonCode === "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED" &&
    rawInputJson.inputJsonRawPresent &&
    rawInputJson.rawText
  ) {
    const looseAudit = buildLooseAuditFromRawText(rawInputJson.rawText);
    const looseNormalizedAudit = normalizeRunDraftAudit(looseAudit);

    if (
      looseNormalizedAudit.postRunDryRunWasSent &&
      looseNormalizedAudit.workerDryRunCallWasSent &&
      looseNormalizedAudit.runExecutionWasDryRunOnly
    ) {
      runInputJson = looseAudit;
      rawFallbackUsed = true;
      parserMode = "loose_raw_text_fallback";
    }
  }

  const auditKeyFormat = detectAuditKeyFormat(runInputJson);
  const normalizedAudit = normalizeRunDraftAudit(runInputJson);
  const readFailed = intentRead.error || approvalRead.error || commandRead.error || runRead.error;

  if (
    !configMissing &&
    !readFailed &&
    intentRead.record &&
    approvalRead.record &&
    commandRead.record &&
    runRead.record &&
    !parsedInputJson.ok &&
    !rawFallbackUsed
  ) {
    return jsonResponse({
      ok: false,
      code: parsedInputJsonCode ?? "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED",
      version: VERSION,
      source: SOURCE,
      reader_version: READER_VERSION,
      status: parsedInputJsonCode ?? "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED",
      mode: MODE,
      method: "GET",
      incident_id: incidentId,
      workspace_id: workspaceId,
      dry_run: true,
      run_draft_id: ids.runDraftId,
      run_record_id: runRead.record.id,
      run_idempotency_key: ids.runIdempotencyKey,
      diagnostic: {
        input_json_raw_present: rawInputJson.inputJsonRawPresent || parsedInputJson.inputJsonRawPresent,
        input_json_parse_failed: parsedInputJson.inputJsonParseFailed,
        input_json_field_used: rawInputJson.inputJsonFieldUsed || parsedInputJson.inputJsonFieldUsed,
        parser_mode: parserMode,
        raw_fallback_used: rawFallbackUsed,
        no_post_run: true,
        no_worker_call: true,
        no_airtable_mutation: true,
        no_command_mutation: true,
        no_run_mutation: true,
      },
      guardrails: {
        client_fetch: "DISABLED",
        airtable_mutation: "DISABLED",
        dashboard_airtable_mutation: "DISABLED",
        command_mutation: "DISABLED",
        run_mutation: "DISABLED",
        run_execution: "DISABLED",
        post_run: "DISABLED_FROM_THIS_SURFACE",
        worker_call: "DISABLED_FROM_THIS_SURFACE",
        real_run: "FORBIDDEN",
        secret_exposure: "DISABLED",
        review_only: true,
      },
      error:
        parsedInputJsonCode === "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED"
          ? "Run Draft Input_JSON is present but could not be parsed, and loose raw fallback could not confirm the three critical statuses."
          : "Run Draft Input_JSON was not found on the Run Draft record.",
      next_step: "Inspect Input_JSON raw text. This route remains read-only and does not call the worker.",
    });
  }

  const commandStatus = stringField(commandFields, ["Status", "status"], "Queued");
  const commandStatusSelect = stringField(commandFields, ["Status_select", "status_select"], "Unsupported");
  const runStatus = stringField(runFields, ["Status", "status"], "Draft");
  const runStatusSelect = stringField(runFields, ["Status_select", "status_select"], "Draft");
  const previousPostRunStatus = normalizedAudit.postRunStatus;
  const previousWorkerCallStatus = normalizedAudit.workerCallStatus;
  const previousRunExecutionStatus = normalizedAudit.runExecutionStatus;
  let workerResponseSanitized = normalizedAudit.workerResponseSanitized ?? {};
  const workerRunRecordId = normalizedAudit.airtableRecordId;
  let workerRunRecordFallback: {
    attempted: boolean;
    used: boolean;
    record_id: string | null;
    http_status: number | null;
    read_error: string | null;
    result_json_found: boolean;
    result_json_field_used: string | null;
    source: "worker_airtable_run_record_fallback";
  } = {
    attempted: false,
    used: false,
    record_id: workerRunRecordId || null,
    http_status: null,
    read_error: null,
    result_json_found: false,
    result_json_field_used: null,
    source: "worker_airtable_run_record_fallback",
  };

  if (Object.keys(workerResponseSanitized).length === 0 && workerRunRecordId && !configMissing && airtable.baseId && airtable.token) {
    workerRunRecordFallback = {
      ...workerRunRecordFallback,
      attempted: true,
      record_id: workerRunRecordId,
    };
    const workerRunRead = await readAirtableRecordById({
      baseId: airtable.baseId,
      token: airtable.token,
      tableName: airtable.runsTable,
      recordId: workerRunRecordId,
    });
    workerRunRecordFallback = {
      ...workerRunRecordFallback,
      http_status: workerRunRead.http_status,
      read_error: workerRunRead.error,
    };

    if (workerRunRead.record) {
      const fallback = buildWorkerResponseFallbackFromRecord({ record: workerRunRead.record, workspaceId });
      workerResponseSanitized = fallback.workerResponse;
      workerRunRecordFallback = {
        ...workerRunRecordFallback,
        used: Object.keys(workerResponseSanitized).length > 0,
        record_id: workerRunRead.record.id,
        result_json_found: fallback.resultJsonFound,
        result_json_field_used: fallback.resultJsonFieldUsed,
      };
    }
  }

  const workerResponseBody = pickRecord(workerResponseSanitized, ["body"]) ?? {};
  const workerResult = pickRecord(workerResponseBody, ["result"]) ?? {};
  const usageLedgerWrite = pickRecord(workerResult, ["usage_ledger_write", "usageledgerwrite", "usageLedgerWrite"]) ?? {};
  const commandRecordId = commandRead.record_id ?? "";
  const commandsRecordIds = (
    normalizedAudit.commandsRecordIds.length > 0
      ? normalizedAudit.commandsRecordIds
      : pickArray<string>(workerResult, ["commands_record_ids", "commandsrecordids", "commandsRecordIds"])
  )
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
  const workerHttpStatus = pickNumber(workerResponseSanitized, ["http_status", "httpstatus", "httpStatus"], 200);
  const workerBodyOk = pickBoolean(workerResponseBody, ["ok"], true);
  const workerResponseOk = pickBoolean(workerResponseSanitized, ["ok"], true);
  const scanned = pickNumber(workerResult, ["scanned"], 0);
  const executed = pickNumber(workerResult, ["executed"], 0);
  const succeeded = pickNumber(workerResult, ["succeeded"], 0);
  const failed = pickNumber(workerResult, ["failed"], 0);
  const blocked = pickNumber(workerResult, ["blocked"], 0);
  const unsupported = pickNumber(workerResult, ["unsupported"], 0);
  const errorsCount = pickNumber(workerResult, ["errors_count", "errorscount", "errorsCount"], normalizedAudit.errorsCount);
  const workerName = pickString(workerResponseBody, ["worker"]);
  const workerCapability = pickString(workerResponseBody, ["capability"], "command_orchestrator");
  const workerRunId = pickString(workerResponseBody, ["run_id", "runid", "runId"]);
  const workerAirtableRecordId = pickString(workerResponseBody, ["airtable_record_id", "airtablerecordid", "airtableRecordId"], workerRunRecordId || "");

  const persistedIntentSnapshot = intentRead.record
    ? {
        record_id: intentRead.record.id,
        idempotency_key: stringField(intentFields, ["Idempotency_Key"]),
        intent_id: stringField(intentFields, ["Intent_ID"], ids.intentId),
        workspace_id: stringField(intentFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(intentFields, ["Incident_ID"], incidentId),
        source_layer: stringField(intentFields, ["Source_Layer"], "Incident Detail V5.8"),
      }
    : null;

  const persistedApprovalSnapshot = approvalRead.record
    ? {
        record_id: approvalRead.record.id,
        idempotency_key: stringField(approvalFields, ["Idempotency_Key"]),
        approval_id: stringField(approvalFields, ["Approval_ID"], ids.approvalId),
        operator_identity: stringField(approvalFields, ["Operator_Identity"], "Arthur"),
        approval_status: stringField(approvalFields, ["Approval_Status"], "Approved"),
        operator_decision: stringField(approvalFields, ["Operator_Decision"]),
        approved_for_command_draft: booleanField(approvalFields, ["Approved_For_Command_Draft"], true),
        source_layer: stringField(approvalFields, ["Source_Layer"], "Incident Detail V5.11"),
      }
    : null;

  const persistedCommandSnapshot = commandRead.record
    ? {
        record_id: commandRead.record.id,
        idempotency_key: stringField(commandFields, ["Idempotency_Key"]),
        command_id: stringField(commandFields, ["Command_ID"], ids.commandDraftId),
        workspace_id: stringField(commandFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(commandFields, ["Incident_ID"], incidentId),
        intent_id: stringField(commandFields, ["Intent_ID"], ids.intentId),
        intent_record_id: stringField(commandFields, ["Intent_Record_ID"], intentRead.record_id ?? ""),
        approval_id: stringField(commandFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(commandFields, ["Approval_Record_ID"], approvalRead.record_id ?? ""),
        capability: stringField(commandFields, ["Capability"], "command_orchestrator"),
        status: commandStatus,
        status_select: commandStatusSelect,
        target_mode: stringField(commandFields, ["Target_Mode"], "dry_run_only"),
        dry_run: booleanField(commandFields, ["Dry_Run"], true),
        operator_identity: stringField(commandFields, ["Operator_Identity"], "Arthur"),
        queue_allowed: booleanField(commandFields, ["Queue_Allowed"], true),
        run_creation_allowed: booleanField(commandFields, ["Run_Creation_Allowed"], false),
        worker_call_allowed: booleanField(commandFields, ["Worker_Call_Allowed"], false),
        real_run: stringField(commandFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(commandFields, ["Source_Layer"], "Incident Detail V5.19"),
      }
    : null;

  const persistedRunSnapshot = runRead.record
    ? {
        record_id: runRead.record.id,
        idempotency_key: stringField(runFields, ["Idempotency_Key"]),
        run_id: stringField(runFields, ["Run_ID"], ids.runDraftId),
        workspace_id: stringField(runFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(runFields, ["Incident_ID"], incidentId),
        command_id: stringField(runFields, ["Command_ID"], ids.commandDraftId),
        command_record_id: stringField(runFields, ["Command_Record_ID"], commandRecordId),
        intent_id: stringField(runFields, ["Intent_ID"], ids.intentId),
        intent_record_id: stringField(runFields, ["Intent_Record_ID"], intentRead.record_id ?? ""),
        approval_id: stringField(runFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(runFields, ["Approval_Record_ID"], approvalRead.record_id ?? ""),
        operational_queue_transition_id: stringField(runFields, ["Operational_Queue_Transition_ID"], ids.operationalQueueTransitionId),
        capability: stringField(runFields, ["Capability"], "command_orchestrator"),
        status: runStatus,
        status_select: runStatusSelect,
        dry_run: booleanField(runFields, ["Dry_Run"], true),
        operator_identity: stringField(runFields, ["Operator_Identity"], "Arthur"),
        run_persistence: stringField(runFields, ["Run_Persistence"], "Draft"),
        post_run_allowed: booleanField(runFields, ["Post_Run_Allowed"], false),
        worker_call_allowed: booleanField(runFields, ["Worker_Call_Allowed"], false),
        real_run: stringField(runFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(runFields, ["Source_Layer"], "Incident Detail V5.25.1"),
      }
    : null;

  const workerDryRunResult = {
    http_status: workerHttpStatus || null,
    ok: workerResponseOk,
    worker: workerName,
    capability: workerCapability,
    worker_run_id: workerRunId,
    worker_airtable_record_id: workerAirtableRecordId,
    selection_mode: pickString(workerResult, ["selection_mode", "selectionmode"]),
    view: pickString(workerResult, ["view"]),
    scanned,
    executed,
    succeeded,
    failed,
    blocked,
    unsupported,
    errors_count: errorsCount,
    workspace_id: pickString(workerResult, ["workspace_id", "workspaceid", "workspaceId"], workspaceId),
    commands_record_ids: commandsRecordIds,
    usage_ledger_record_id: stringField(usageLedgerWrite, ["record_id", "recordid"]),
  };

  const unsupportedCommandDiagnosis = buildUnsupportedCommandDiagnosis({
    commandRecordId,
    commandId: ids.commandDraftId,
    commandFields,
    commandStatus,
    commandStatusSelect,
    workerDryRunResult,
  });

  const routerAllowlistReadiness = buildRouterAllowlistReadiness({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    commandStatus,
    commandStatusSelect,
    workerDryRunResult,
  });

  const registryReads =
    !configMissing && airtable.baseId && airtable.token
      ? await maybeFindRegistryRecords({
          baseId: airtable.baseId,
          token: airtable.token,
          toolCatalogTable: airtable.toolCatalogTable,
          workspaceCapabilitiesTable: airtable.workspaceCapabilitiesTable,
          workspaceId,
          capability: stringField(commandFields, ["Capability", "capability"]) || workerDryRunResult.capability || "command_orchestrator",
        })
      : null;

  const toolcatalogRegistryReadiness = buildToolCatalogRegistryReadiness({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    capabilityRequested: stringField(commandFields, ["Capability", "capability"]) || workerDryRunResult.capability || "command_orchestrator",
    toolCatalogTable: airtable.toolCatalogTable,
    workspaceCapabilitiesTable: airtable.workspaceCapabilitiesTable,
    registryReads,
  });

  const workerRouterMappingInspection = buildWorkerRouterMappingInspection({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    commandStatus,
    commandStatusSelect,
    workerDryRunResult,
    routerAllowlistReadiness,
    toolcatalogRegistryReadiness,
  });

  const targetCapabilityDecisionMatrix = buildTargetCapabilityDecisionMatrix({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    workerDryRunResult,
    routerAllowlistReadiness,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
  });

  const executionMappingContractDraft = buildExecutionMappingContractDraft({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    commandStatus,
    commandStatusSelect,
    routerAllowlistReadiness,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
  });

  const toolMappingProposalDraft = buildToolMappingProposalDraft({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    workerDryRunResult,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
  });

  const controlledMappingPlan = buildControlledMappingPlan({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    toolMappingProposalDraft,
    executionMappingContractDraft,
  });

  const reviewCheck = {
    intent_found: Boolean(intentRead.record),
    approval_found: Boolean(approvalRead.record),
    command_found: Boolean(commandRead.record),
    run_found: Boolean(runRead.record),
    run_status_is_draft: runStatus === "Draft",
    command_status_is_queued: commandStatus === "Queued",
    post_run_status_is_sent: normalizedAudit.postRunDryRunWasSent,
    worker_call_status_is_sent: normalizedAudit.workerDryRunCallWasSent,
    run_execution_status_is_dry_run_only: normalizedAudit.runExecutionWasDryRunOnly,
    worker_response_exists: Object.keys(workerResponseSanitized).length > 0,
    worker_response_http_200: workerHttpStatus === 200,
    worker_response_ok: workerResponseOk && workerBodyOk,
    worker_capability_is_command_orchestrator: normalizeStatusToken(workerCapability) === "COMMANDORCHESTRATOR",
    worker_scanned_at_least_one_command: scanned >= 1,
    worker_command_record_seen: commandRecordId ? commandsRecordIds.includes(commandRecordId) : false,
    worker_executed_zero: executed === 0,
    worker_unsupported_one: unsupported === 1,
    worker_errors_zero: errorsCount === 0,
    real_run_forbidden: true,
    secret_exposure_disabled: true,
    no_post_run_by_this_surface: true,
    no_worker_called_by_this_surface: true,
    no_airtable_mutation_by_this_surface: true,
  };

  const mappingPreflightChecklist = buildMappingPreflightChecklist({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    approvalFound: Boolean(approvalRead.record),
    commandFields,
    workerDryRunResult,
    reviewCheck,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
    toolMappingProposalDraft,
    controlledMappingPlan,
  });

  const humanReviewGate = buildHumanReviewGate({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    approvalRecordId: approvalRead.record_id,
    toolMappingProposalDraft,
    controlledMappingPlan,
    mappingPreflightChecklist,
    toolcatalogRegistryReadiness,
    executionMappingContractDraft,
    workerDryRunResult,
  });

  let status = "POST_RUN_DRY_RUN_RESULT_REVIEW_READY";

  if (configMissing) {
    status = "POST_RUN_DRY_RUN_RESULT_REVIEW_CONFIG_MISSING";
  } else if (intentRead.error || approvalRead.error || commandRead.error || runRead.error) {
    status = "POST_RUN_DRY_RUN_RESULT_REVIEW_READ_FAILED";
  } else if (!intentRead.record) {
    status = "OPERATOR_INTENT_DRAFT_NOT_FOUND";
  } else if (!approvalRead.record) {
    status = "OPERATOR_APPROVAL_NOT_FOUND";
  } else if (!commandRead.record) {
    status = "COMMAND_NOT_FOUND";
  } else if (!runRead.record) {
    status = "RUN_DRAFT_NOT_FOUND";
  } else if (!parsedInputJson.ok && !rawFallbackUsed) {
    status = parsedInputJsonCode ?? "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED";
  } else if (!normalizedAudit.postRunDryRunWasSent || !normalizedAudit.workerDryRunCallWasSent || !normalizedAudit.runExecutionWasDryRunOnly) {
    status = "POST_RUN_DRY_RUN_NOT_SENT";
  } else if (!reviewCheck.worker_response_exists) {
    status = "WORKER_RESPONSE_NOT_FOUND";
  } else if (!reviewCheck.worker_response_http_200 || !reviewCheck.worker_response_ok) {
    status = "WORKER_RESPONSE_NOT_OK";
  } else if (
    !reviewCheck.run_status_is_draft ||
    !reviewCheck.command_status_is_queued ||
    !reviewCheck.worker_capability_is_command_orchestrator ||
    !reviewCheck.worker_scanned_at_least_one_command ||
    !reviewCheck.worker_command_record_seen ||
    !reviewCheck.worker_executed_zero ||
    !reviewCheck.worker_unsupported_one ||
    !reviewCheck.worker_errors_zero
  ) {
    status = "POST_RUN_DRY_RUN_RESULT_REVIEW_NOT_SAFE";
  }

  return jsonResponse({
    ok: true,
    version: VERSION,
    source: SOURCE,
    reader_version: READER_VERSION,
    status,
    code: status,
    mode: MODE,
    method: "GET",
    incident_id: incidentId,
    workspace_id: workspaceId,
    dry_run: true,
    intent_id: ids.intentId,
    intent_record_id: intentRead.record_id,
    approval_id: ids.approvalId,
    approval_record_id: approvalRead.record_id,
    command_record_id: commandRead.record_id,
    command_id: ids.commandDraftId,
    command_idempotency_key: ids.commandIdempotencyKey,
    operational_queue_transition_id: ids.operationalQueueTransitionId,
    operational_queue_transition_idempotency_key: ids.operationalQueueTransitionIdempotencyKey,
    run_draft_id: ids.runDraftId,
    run_record_id: runRead.record_id,
    run_idempotency_key: ids.runIdempotencyKey,
    previous_post_run_status: previousPostRunStatus || null,
    previous_worker_call_status: previousWorkerCallStatus || null,
    previous_run_execution_status: previousRunExecutionStatus || null,
    normalized_previous_post_run_status: normalizedAudit.normalizedPostRunStatus || null,
    normalized_previous_worker_call_status: normalizedAudit.normalizedWorkerCallStatus || null,
    normalized_previous_run_execution_status: normalizedAudit.normalizedRunExecutionStatus || null,
    current_run_status: runStatus || null,
    current_run_status_select: runStatusSelect || null,
    current_command_status: commandStatus || null,
    current_command_status_select: commandStatusSelect || null,
    audit_json_compatibility: {
      input_json_field_used: rawInputJson.inputJsonFieldUsed || (parsedInputJson.ok ? parsedInputJson.inputJsonFieldUsed : parsedInputJson.inputJsonFieldUsed),
      input_json_raw_present: rawInputJson.inputJsonRawPresent || (parsedInputJson.ok ? parsedInputJson.inputJsonRawPresent : parsedInputJson.inputJsonRawPresent),
      input_json_parse_failed: parsedInputJson.ok ? false : parsedInputJson.inputJsonParseFailed,
      parser_mode: parserMode,
      key_format_detected: auditKeyFormat.keyFormatDetected,
      accepted_snake_case_keys: auditKeyFormat.acceptedSnakeCaseKeys,
      accepted_compact_keys: auditKeyFormat.acceptedCompactKeys,
      normalized_post_run_status: normalizedAudit.normalizedPostRunStatus,
      normalized_worker_call_status: normalizedAudit.normalizedWorkerCallStatus,
      normalized_run_execution_status: normalizedAudit.normalizedRunExecutionStatus,
      post_run_dry_run_was_sent: normalizedAudit.postRunDryRunWasSent,
      worker_dry_run_call_was_sent: normalizedAudit.workerDryRunCallWasSent,
      run_execution_was_dry_run_only: normalizedAudit.runExecutionWasDryRunOnly,
      raw_fallback_used: rawFallbackUsed,
    },
    worker_run_record_fallback: workerRunRecordFallback,
    unsupported_command_diagnosis: unsupportedCommandDiagnosis,
    router_allowlist_readiness: routerAllowlistReadiness,
    toolcatalog_registry_readiness: toolcatalogRegistryReadiness,
    worker_router_mapping_inspection: workerRouterMappingInspection,
    target_capability_decision_matrix: targetCapabilityDecisionMatrix,
    execution_mapping_contract_draft: executionMappingContractDraft,
    tool_mapping_proposal_draft: toolMappingProposalDraft,
    controlled_mapping_plan: controlledMappingPlan,
    mapping_preflight_checklist: mappingPreflightChecklist,
    human_review_gate: humanReviewGate,
    post_run_from_this_surface: "DISABLED",
    worker_call_from_this_surface: "DISABLED",
    previous_worker_dry_run_call: normalizedAudit.workerDryRunCallWasSent ? "CONFIRMED" : "NOT_CONFIRMED",
    real_run_execution: "FORBIDDEN",
    external_worker_execution: "NOT_VERIFIED_FROM_THIS_SURFACE",
    external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
    previous_layer: {
      version: "Incident Detail V5.25.1",
      status: "POST_RUN_DRY_RUN_SENT",
      strict_worker_runrequest_body_alignment: "VALIDATED",
      execution_policy: "SERVER_SIDE_DRY_RUN_ONLY",
    },
    airtable_config: airtableConfigPublic(airtable),
    intent_read: {
      http_status: intentRead.http_status,
      record_id: intentRead.record_id,
      error: intentRead.error,
    },
    approval_read: {
      http_status: approvalRead.http_status,
      record_id: approvalRead.record_id,
      error: approvalRead.error,
    },
    command_read: {
      http_status: commandRead.http_status,
      record_id: commandRead.record_id,
      error: commandRead.error,
    },
    run_read: {
      http_status: runRead.http_status,
      record_id: runRead.record_id,
      error: runRead.error,
    },
    persisted_intent_snapshot: persistedIntentSnapshot,
    persisted_approval_snapshot: persistedApprovalSnapshot,
    persisted_command_snapshot: persistedCommandSnapshot,
    persisted_run_snapshot: persistedRunSnapshot,
    run_input_json: Object.keys(runInputJson).length > 0 ? sanitizeObject(runInputJson) : null,
    worker_dry_run_result: workerDryRunResult,
    dry_run_result_review_check: reviewCheck,
    interpretation: {
      summary:
        "This surface reviews the persisted V5.25.1 dry-run evidence only. V5.27 explains unsupported classification. V5.28 adds router / allowlist readiness. V5.29 adds registry readiness. V5.30 adds Worker router mapping. V5.31 adds target capability decision matrix. V5.32 adds execution mapping contract draft. V5.33 adds a read-only tool mapping proposal draft. V5.34 adds a controlled mapping plan. V5.35 adds a read-only mapping preflight checklist. V5.36 adds a read-only human review gate.",
      result_meaning:
        "Dry-run transport, auth, strict body, workspace routing, persisted worker evidence, unsupported classification, router readiness, registry readiness, router mapping, target capability decision constraints, execution mapping contract requirements, tool mapping proposal constraints, controlled mapping plan requirements, mapping preflight blockers, and human review boundaries are now reviewed without executing a new run.",
      unsupported_is_blocking_for_real_execution: true,
      router_allowlist_readiness_is_blocking_for_real_execution: !routerAllowlistReadiness.real_run_allowed_by_readiness,
      registry_readiness_is_blocking_for_real_execution: !toolcatalogRegistryReadiness.registry_ready_for_real_run,
      worker_router_mapping_is_blocking_for_real_execution: !workerRouterMappingInspection.router_mapping_ready_for_real_run,
      target_capability_decision_is_blocking_for_real_execution: !targetCapabilityDecisionMatrix.decision_ready,
      execution_mapping_contract_is_blocking_for_real_execution: !executionMappingContractDraft.contract_ready_for_execution,
      tool_mapping_proposal_is_blocking_for_real_execution: !toolMappingProposalDraft.proposal.proposal_apply_allowed,
      controlled_mapping_plan_is_blocking_for_real_execution: !controlledMappingPlan.plan_ready_for_execution,
      controlled_mapping_plan_is_blocking_for_mutation: !controlledMappingPlan.plan_ready_for_mutation,
      mapping_preflight_is_blocking_for_mapping_mutation: !mappingPreflightChecklist.preflight_ready_for_mapping_mutation,
      mapping_preflight_is_blocking_for_registry_mutation: !mappingPreflightChecklist.preflight_ready_for_registry_mutation,
      mapping_preflight_is_blocking_for_command_creation: !mappingPreflightChecklist.preflight_ready_for_command_creation,
      mapping_preflight_is_blocking_for_execution: !mappingPreflightChecklist.preflight_ready_for_execution,
      human_review_gate_is_blocking_for_mapping_mutation: !humanReviewGate.review_scope.can_approve_mapping_mutation,
      human_review_gate_is_blocking_for_registry_mutation: !humanReviewGate.review_scope.can_approve_registry_mutation,
      human_review_gate_is_blocking_for_command_creation: !humanReviewGate.review_scope.can_approve_command_creation,
      human_review_gate_is_blocking_for_real_run: !humanReviewGate.review_scope.can_approve_real_run,
      unsupported_fix_required_before_real_execution: true,
    },
    external_execution_review: {
      previous_worker_dry_run_call: normalizedAudit.workerDryRunCallWasSent ? "CONFIRMED" : "NOT_CONFIRMED",
      post_run_from_this_surface: "DISABLED",
      worker_call_from_this_surface: "DISABLED",
      external_worker_execution: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      note: "This surface reviews previously persisted records only. It does not call the worker and does not inspect external scheduler activity.",
    },
    future_requirements: [
      "Review why command_orchestrator returned unsupported for the queued command",
      "Verify the command capability and worker allowlist before any real execution",
      "Verify the command router supports command_orchestrator from this queue",
      "Verify whether command_orchestrator should spawn a lower-level executable capability",
      "Define target capability mapping before promotion",
      "Verify the command payload schema before promotion",
      "Inspect ToolCatalog readiness in read-only mode",
      "Inspect Workspace_Capabilities readiness in read-only mode",
      "Inspect whether command_orchestrator should execute directly or spawn a lower-level capability",
      "Confirm Tool_Key / Tool_Mode before real execution",
      "Select a target capability only after explicit mapping evidence exists",
      "Define execution mapping contract before creating target commands",
      "Review tool mapping proposal before any mutation",
      "Review controlled mapping plan before any mutation",
      "Complete mapping preflight checklist before any mutation",
      "Pass human review gate before any mutation",
      "Define dry_run_only to executable promotion policy",
      "Define rollback/cancel path before real execution",
      "Keep real execution behind a separate feature gate",
      "Keep POST /run server-side only",
      "Keep worker secret server-side only",
      "Require explicit operator confirmation before any non-dry-run execution",
      "Do not enable real run while unsupported remains unresolved",
    ],
    guardrails: {
      client_fetch: "DISABLED",
      airtable_mutation: "DISABLED",
      dashboard_airtable_mutation: "DISABLED",
      command_mutation: "DISABLED",
      run_mutation: "DISABLED",
      run_execution: "DISABLED",
      post_run: "DISABLED_FROM_THIS_SURFACE",
      worker_call: "DISABLED_FROM_THIS_SURFACE",
      real_run: "FORBIDDEN",
      command_creation: "DISABLED",
      target_capability_creation: "DISABLED",
      execution_mapping_contract_mutation: "DISABLED",
      tool_mapping_mutation: "DISABLED",
      controlled_mapping_plan_mutation: "DISABLED",
      mapping_preflight_mutation: "DISABLED",
      human_review_gate_mutation: "DISABLED",
      operator_approval_creation: "DISABLED",
      human_review_approval_creation: "DISABLED",
      toolcatalog_creation: "DISABLED",
      workspace_capabilities_creation: "DISABLED",
      registry_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      review_only: true,
    },
    error:
      status === "POST_RUN_DRY_RUN_RESULT_REVIEW_READY"
        ? null
        : "Dry-run result review is not ready. Check status, audit_json_compatibility, worker_run_record_fallback, unsupported_command_diagnosis, router_allowlist_readiness, toolcatalog_registry_readiness, worker_router_mapping_inspection, target_capability_decision_matrix, execution_mapping_contract_draft, tool_mapping_proposal_draft, controlled_mapping_plan, mapping_preflight_checklist, human_review_gate, and read sections.",
    next_step:
      "Next safe step: V5.37 Operator Decision Draft, still read-only, before any Tool_Key / Tool_Mode, registry, command, approval, or execution mutation.",
  });
}
