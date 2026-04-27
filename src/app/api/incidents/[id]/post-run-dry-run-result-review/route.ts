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

const VERSION = "Incident Detail V5.26.2";
const SOURCE =
  "dashboard_incident_detail_v5_26_2_loose_raw_input_json_fallback_reader";
const MODE = "POST_RUN_DRY_RUN_RESULT_REVIEW_ONLY";
const READER_VERSION =
  "V5.26.2_LOOSE_RAW_INPUT_JSON_FALLBACK_READER";

const INPUT_JSON_FIELD_CANDIDATES = [
  "Input_JSON",
  "input_json",
  "Input JSON",
  "InputJSON",
  "inputJson",
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
  };
}

function airtableConfigPublic(config: ReturnType<typeof getAirtableConfig>) {
  return {
    base_id: config.baseId ? "CONFIGURED" : "MISSING",
    operator_intents_table: config.operatorIntentsTable,
    operator_approvals_table: config.operatorApprovalsTable,
    commands_table: config.commandsTable,
    runs_table: config.runsTable,
    token: config.token ? "CONFIGURED" : "MISSING",
    token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",
  };
}

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function airtableUrl(baseId: string, tableName: string): string {
  return `https://api.airtable.com/v0/${encodeURIComponent(
    baseId
  )}/${encodeURIComponent(tableName)}`;
}

function airtableHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeParseJson(value: unknown): unknown {
  if (typeof value !== "string") return null;

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): JsonRecord {
  if (isJsonRecord(value)) {
    return value;
  }

  return {};
}

function normalizeStatusToken(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

  const candidates = [
    raw,
    normalizeLooseRawText(raw),
    extractLikelyJsonBody(raw),
    raw.replace(/^"+|"+$/g, ""),
    raw.replace(/^"+|"+$/g, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    extractLikelyJsonBody(
      raw.replace(/^"+|"+$/g, "").replace(/\\"/g, '"').replace(/\\\\/g, "\\")
    ),
  ];

  for (const candidate of candidates) {
    const parsed = safeParseJson(candidate);

    if (isJsonRecord(parsed)) {
      return parsed;
    }

    if (typeof parsed === "string") {
      const secondParse = safeParseJson(parsed);

      if (isJsonRecord(secondParse)) {
        return secondParse;
      }
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

function pickString(
  record: unknown,
  paths: string[],
  fallback = ""
): string {
  const value = pickUnknown(record, paths);

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function pickBoolean(
  record: unknown,
  paths: string[],
  fallback = false
): boolean {
  const value = pickUnknown(record, paths);

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "off"].includes(normalized)) {
      return false;
    }
  }

  if (typeof value === "number") return value !== 0;

  return fallback;
}

function pickNumber(
  record: unknown,
  paths: string[],
  fallback = 0
): number {
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

function stringField(fields: JsonRecord, names: string[], fallback = ""): string {
  return pickString(fields, names, fallback);
}

function booleanField(
  fields: JsonRecord,
  names: string[],
  fallback = false
): boolean {
  return pickBoolean(fields, names, fallback);
}

function numberFrom(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return fallback;
}

function nestedValue(record: JsonRecord, path: string[]): unknown {
  let current: unknown = record;

  for (const part of path) {
    if (!isJsonRecord(current)) {
      return undefined;
    }

    current = current[part];
  }

  return current;
}

function nestedString(record: JsonRecord, path: string[], fallback = ""): string {
  const value = nestedValue(record, path);

  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

function sanitizeErrorText(value: unknown): string {
  if (typeof value === "string") {
    return value
      .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
      .replace(/"apiKey"\s*:\s*"[^"]+"/gi, '"apiKey":"[REDACTED]"')
      .replace(/"token"\s*:\s*"[^"]+"/gi, '"token":"[REDACTED]"')
      .slice(0, 4000);
  }

  if (value instanceof Error) {
    return value.message.slice(0, 4000);
  }

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

  if (typeof value === "string") {
    return value.slice(0, 12000);
  }

  return value;
}

function getRawInputJsonText(fields: JsonRecord): {
  rawText: string;
  inputJsonFieldUsed: string | null;
  inputJsonRawPresent: boolean;
} {
  for (const fieldName of INPUT_JSON_FIELD_CANDIDATES) {
    const rawValue = fields[fieldName];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (typeof rawValue === "string") {
      return {
        rawText: rawValue,
        inputJsonFieldUsed: fieldName,
        inputJsonRawPresent: true,
      };
    }

    if (
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      isJsonRecord(rawValue) ||
      Array.isArray(rawValue)
    ) {
      return {
        rawText: JSON.stringify(rawValue),
        inputJsonFieldUsed: fieldName,
        inputJsonRawPresent: true,
      };
    }
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

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

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
    const escapedKey = escapeRegex(key);

    const quotedRegex = new RegExp(
      `["']${escapedKey}["']\\s*:\\s*["']([^"']*)["']`,
      "i"
    );
    const quotedMatch = text.match(quotedRegex);

    if (quotedMatch?.[1]) {
      return quotedMatch[1].trim();
    }

    const looseRegex = new RegExp(
      `${escapedKey}\\s*[:=]\\s*["']?([^"',}\\]\\s]+)`,
      "i"
    );
    const looseMatch = text.match(looseRegex);

    if (looseMatch?.[1]) {
      return looseMatch[1].trim();
    }
  }

  return "";
}

function extractRawBoolean(
  rawText: string,
  keys: string[],
  fallback = false
): boolean {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = escapeRegex(key);
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

function extractRawNumber(
  rawText: string,
  keys: string[],
  fallback = 0
): number {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = escapeRegex(key);
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

function extractRawStringArray(rawText: string, keys: string[]): string[] {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = escapeRegex(key);
    const arrayRegex = new RegExp(
      `["']?${escapedKey}["']?\\s*:\\s*\$begin:math:display$\(\[\^\\$end:math:display$]*)\\]`,
      "i"
    );
    const arrayMatch = text.match(arrayRegex);

    if (arrayMatch?.[1]) {
      const values = [...arrayMatch[1].matchAll(/["']([^"']+)["']/g)]
        .map((match) => match[1]?.trim())
        .filter((item): item is string => Boolean(item));

      if (values.length > 0) return values;
    }

    const singleValue = extractRawString(text, [key]);

    if (singleValue) {
      return [singleValue];
    }
  }

  return [];
}

function extractBalancedObjectFrom(rawText: string, startIndex: number): string {
  const text = normalizeLooseRawText(rawText);

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  let objectStart = -1;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (objectStart === -1) {
      if (char === "{") {
        objectStart = index;
        depth = 1;
      }

      continue;
    }

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (inString) {
      if (char === quote) {
        inString = false;
        quote = "";
      }

      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return text.slice(objectStart, index + 1);
      }
    }
  }

  return "";
}

function extractRawRecord(rawText: string, keys: string[]): JsonRecord | null {
  const text = normalizeLooseRawText(rawText);

  for (const key of keys) {
    const escapedKey = escapeRegex(key);
    const keyRegex = new RegExp(`["']?${escapedKey}["']?\\s*:`, "i");
    const keyMatch = keyRegex.exec(text);

    if (!keyMatch) continue;

    const objectText = extractBalancedObjectFrom(text, keyMatch.index + keyMatch[0].length);

    if (!objectText) continue;

    const parsed = parseFlexibleJsonRecord(objectText);

    if (parsed) return parsed;
  }

  return null;
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

  const workerResponseSanitized = extractRawRecord(rawText, [
    "worker_response_sanitized",
    "workerresponsesanitized",
    "workerResponseSanitized",
  ]);

  const commandsRecordIds = extractRawStringArray(rawText, [
    "commands_record_ids",
    "commandsrecordids",
    "commandsRecordIds",
  ]);

  const errorsCount = extractRawNumber(rawText, [
    "errors_count",
    "errorscount",
    "errorsCount",
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

  const dryRun = extractRawBoolean(rawText, ["dry_run", "dryrun", "dryRun"], true);

  if (postRunStatus) audit.postrunstatus = postRunStatus;
  if (workerCallStatus) audit.workercallstatus = workerCallStatus;
  if (runExecutionStatus) audit.runexecutionstatus = runExecutionStatus;
  if (workerResponseSanitized) audit.workerresponsesanitized = workerResponseSanitized;
  if (commandsRecordIds.length > 0) audit.commandsrecordids = commandsRecordIds;
  audit.errorscount = errorsCount;
  if (airtableRecordId) audit.airtablerecordid = airtableRecordId;
  if (runId) audit.runid = runId;
  if (commandOrchestrator) audit.commandorchestrator = commandOrchestrator;
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
    keyFormatDetected:
      hasSnake && hasCompact
        ? "mixed"
        : hasSnake
          ? "snake_case"
          : hasCompact
            ? "compact"
            : "unknown",
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

  const errorsCount = pickNumber(audit, [
    "errors_count",
    "errorscount",
    "errorsCount",
  ]);

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
    postRunDryRunWasSent:
      normalizedPostRunStatus === "POSTRUNDRYRUNSENT",
    workerDryRunCallWasSent:
      normalizedWorkerCallStatus === "DRYRUNCALLSENT",
    runExecutionWasDryRunOnly:
      normalizedRunExecutionStatus === "DRYRUNONLY",
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

  return (
    url.searchParams.get("workspace_id") ||
    url.searchParams.get("workspaceId") ||
    "default"
  ).trim();
}

async function findRecordByIdempotencyKey(args: {
  baseId: string;
  token: string;
  tableName: string;
  idempotencyKey: string;
}): Promise<AirtableReadResult> {
  const formula = `{Idempotency_Key}='${escapeFormulaValue(args.idempotencyKey)}'`;

  const url = `${airtableUrl(
    args.baseId,
    args.tableName
  )}?maxRecords=1&filterByFormula=${encodeURIComponent(formula)}`;

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

    const records = Array.isArray(parsed.records)
      ? (parsed.records as AirtableRecord[])
      : [];

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
  const rawInputJson = getRawInputJsonText(runFields);

  let runInputJson: JsonRecord = {};
  let rawFallbackUsed = false;
  let parserMode:
    | "strict_json"
    | "loose_raw_text_fallback"
    | "unavailable" = "unavailable";

  if (parsedInputJson.ok) {
    runInputJson = parsedInputJson.value;
    parserMode = "strict_json";
  } else if (
    parsedInputJson.code === "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED" &&
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

  const readFailed =
    intentRead.error || approvalRead.error || commandRead.error || runRead.error;

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
      code: parsedInputJson.code,
      version: VERSION,
      source: SOURCE,
      reader_version: READER_VERSION,
      status: parsedInputJson.code,
      mode: MODE,
      method: "GET",
      incident_id: incidentId,
      workspace_id: workspaceId,
      dry_run: true,
      run_draft_id: ids.runDraftId,
      run_record_id: runRead.record.id,
      run_idempotency_key: ids.runIdempotencyKey,
      diagnostic: {
        input_json_raw_present:
          rawInputJson.inputJsonRawPresent || parsedInputJson.inputJsonRawPresent,
        input_json_parse_failed: parsedInputJson.inputJsonParseFailed,
        input_json_field_used:
          rawInputJson.inputJsonFieldUsed || parsedInputJson.inputJsonFieldUsed,
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
        parsedInputJson.code === "RUN_DRAFT_AUDIT_JSON_PARSE_FAILED"
          ? "Run Draft Input_JSON is present but could not be parsed, and loose raw fallback could not confirm the three critical statuses."
          : "Run Draft Input_JSON was not found on the Run Draft record.",
      next_step:
        "Inspect Input_JSON raw text. This route remains read-only and does not call the worker.",
    });
  }

  const commandStatus = stringField(commandFields, ["Status", "status"]);
  const commandStatusSelect = stringField(commandFields, [
    "Status_select",
    "status_select",
  ]);

  const runStatus = stringField(runFields, ["Status", "status"]);
  const runStatusSelect = stringField(runFields, ["Status_select", "status_select"]);

  const previousPostRunStatus = normalizedAudit.postRunStatus;
  const previousWorkerCallStatus = normalizedAudit.workerCallStatus;
  const previousRunExecutionStatus = normalizedAudit.runExecutionStatus;

  const workerResponseSanitized = normalizedAudit.workerResponseSanitized ?? {};
  const workerResponseBody = pickRecord(workerResponseSanitized, ["body"]) ?? {};
  const workerResult = pickRecord(workerResponseBody, ["result"]) ?? {};
  const usageLedgerWrite =
    pickRecord(workerResult, [
      "usage_ledger_write",
      "usageledgerwrite",
      "usageLedgerWrite",
    ]) ?? {};

  const commandsRecordIdsFromAudit = normalizedAudit.commandsRecordIds;
  const commandsRecordIdsFromWorkerResult = pickArray<string>(workerResult, [
    "commands_record_ids",
    "commandsrecordids",
    "commandsRecordIds",
  ]);

  const commandsRecordIds = (
    commandsRecordIdsFromAudit.length > 0
      ? commandsRecordIdsFromAudit
      : commandsRecordIdsFromWorkerResult
  )
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  const commandRecordId = commandRead.record_id ?? "";

  const workerHttpStatus = pickNumber(workerResponseSanitized, [
    "http_status",
    "httpstatus",
    "httpStatus",
  ]);

  const workerBodyOk = pickBoolean(workerResponseBody, ["ok"]);
  const workerResponseOk = pickBoolean(workerResponseSanitized, ["ok"]);

  const scanned = pickNumber(workerResult, ["scanned"]);
  const executed = pickNumber(workerResult, ["executed"]);
  const succeeded = pickNumber(workerResult, ["succeeded"]);
  const failed = pickNumber(workerResult, ["failed"]);
  const blocked = pickNumber(workerResult, ["blocked"]);
  const unsupported = pickNumber(workerResult, ["unsupported"]);
  const errorsCount = pickNumber(
    workerResult,
    ["errors_count", "errorscount", "errorsCount"],
    normalizedAudit.errorsCount
  );

  const workerName = pickString(workerResponseBody, ["worker"]);
  const workerCapability = pickString(workerResponseBody, ["capability"]);
  const workerRunId = pickString(workerResponseBody, [
    "run_id",
    "runid",
    "runId",
  ]);
  const workerAirtableRecordId = pickString(workerResponseBody, [
    "airtable_record_id",
    "airtablerecordid",
    "airtableRecordId",
  ]);

  const persistedIntentSnapshot = intentRead.record
    ? {
        record_id: intentRead.record.id,
        idempotency_key: stringField(intentFields, ["Idempotency_Key"]),
        intent_id: stringField(intentFields, ["Intent_ID"], ids.intentId),
        workspace_id: stringField(intentFields, ["Workspace_ID"], workspaceId),
        incident_id: stringField(intentFields, ["Incident_ID"], incidentId),
        source_layer: stringField(
          intentFields,
          ["Source_Layer"],
          "Incident Detail V5.8"
        ),
      }
    : null;

  const persistedApprovalSnapshot = approvalRead.record
    ? {
        record_id: approvalRead.record.id,
        idempotency_key: stringField(approvalFields, ["Idempotency_Key"]),
        approval_id: stringField(approvalFields, ["Approval_ID"], ids.approvalId),
        operator_identity: stringField(
          approvalFields,
          ["Operator_Identity"],
          "Arthur"
        ),
        approval_status: stringField(
          approvalFields,
          ["Approval_Status"],
          "Approved"
        ),
        operator_decision: stringField(approvalFields, ["Operator_Decision"]),
        approved_for_command_draft: booleanField(
          approvalFields,
          ["Approved_For_Command_Draft"],
          true
        ),
        source_layer: stringField(
          approvalFields,
          ["Source_Layer"],
          "Incident Detail V5.11"
        ),
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
        intent_record_id: stringField(
          commandFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: stringField(commandFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(
          commandFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        capability: stringField(
          commandFields,
          ["Capability"],
          "command_orchestrator"
        ),
        status: commandStatus,
        status_select: commandStatusSelect,
        target_mode: stringField(commandFields, ["Target_Mode"], "dry_run_only"),
        dry_run: booleanField(commandFields, ["Dry_Run"], true),
        operator_identity: stringField(
          commandFields,
          ["Operator_Identity"],
          "Arthur"
        ),
        queue_allowed: booleanField(commandFields, ["Queue_Allowed"], true),
        run_creation_allowed: booleanField(
          commandFields,
          ["Run_Creation_Allowed"],
          false
        ),
        worker_call_allowed: booleanField(
          commandFields,
          ["Worker_Call_Allowed"],
          false
        ),
        real_run: stringField(commandFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(
          commandFields,
          ["Source_Layer"],
          "Incident Detail V5.19"
        ),
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
        command_record_id: stringField(
          runFields,
          ["Command_Record_ID"],
          commandRecordId
        ),
        intent_id: stringField(runFields, ["Intent_ID"], ids.intentId),
        intent_record_id: stringField(
          runFields,
          ["Intent_Record_ID"],
          intentRead.record_id ?? ""
        ),
        approval_id: stringField(runFields, ["Approval_ID"], ids.approvalId),
        approval_record_id: stringField(
          runFields,
          ["Approval_Record_ID"],
          approvalRead.record_id ?? ""
        ),
        operational_queue_transition_id: stringField(
          runFields,
          ["Operational_Queue_Transition_ID"],
          ids.operationalQueueTransitionId
        ),
        capability: stringField(
          runFields,
          ["Capability"],
          "command_orchestrator"
        ),
        status: runStatus,
        status_select: runStatusSelect,
        dry_run: booleanField(runFields, ["Dry_Run"], true),
        operator_identity: stringField(runFields, ["Operator_Identity"], "Arthur"),
        run_persistence: stringField(runFields, ["Run_Persistence"], "Draft"),
        post_run_allowed: booleanField(runFields, ["Post_Run_Allowed"], false),
        worker_call_allowed: booleanField(
          runFields,
          ["Worker_Call_Allowed"],
          false
        ),
        real_run: stringField(runFields, ["Real_Run"], "Forbidden"),
        secret_exposure: "SERVER_SIDE_ONLY_REDACTED",
        source_layer: stringField(
          runFields,
          ["Source_Layer"],
          "Incident Detail V5.25.1"
        ),
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
    workspace_id: pickString(
      workerResult,
      ["workspace_id", "workspaceid", "workspaceId"],
      workspaceId
    ),
    commands_record_ids: commandsRecordIds,
    usage_ledger_record_id: stringField(usageLedgerWrite, [
      "record_id",
      "recordid",
    ]),
  };

  const reviewCheck = {
    intent_found: Boolean(intentRead.record),
    approval_found: Boolean(approvalRead.record),
    command_found: Boolean(commandRead.record),
    run_found: Boolean(runRead.record),
    run_status_is_draft: runStatus === "Draft",
    command_status_is_queued: commandStatus === "Queued",
    post_run_status_is_sent: normalizedAudit.postRunDryRunWasSent,
    worker_call_status_is_sent: normalizedAudit.workerDryRunCallWasSent,
    run_execution_status_is_dry_run_only:
      normalizedAudit.runExecutionWasDryRunOnly,
    worker_response_exists: Object.keys(workerResponseSanitized).length > 0,
    worker_response_http_200: workerHttpStatus === 200,
    worker_response_ok: workerResponseOk && workerBodyOk,
    worker_capability_is_command_orchestrator:
      normalizeStatusToken(workerCapability) === "COMMANDORCHESTRATOR",
    worker_scanned_at_least_one_command: scanned >= 1,
    worker_command_record_seen: commandRecordId
      ? commandsRecordIds.includes(commandRecordId)
      : false,
    worker_executed_zero: executed === 0,
    worker_unsupported_one: unsupported === 1,
    worker_errors_zero: errorsCount === 0,
    real_run_forbidden: true,
    secret_exposure_disabled: true,
    no_post_run_by_this_surface: true,
    no_worker_called_by_this_surface: true,
    no_airtable_mutation_by_this_surface: true,
  };

  let status = "POST_RUN_DRY_RUN_RESULT_REVIEW_READY";

  if (configMissing) {
    status = "POST_RUN_DRY_RUN_RESULT_REVIEW_CONFIG_MISSING";
  } else if (
    intentRead.error ||
    approvalRead.error ||
    commandRead.error ||
    runRead.error
  ) {
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
    status = parsedInputJson.code;
  } else if (
    !normalizedAudit.postRunDryRunWasSent ||
    !normalizedAudit.workerDryRunCallWasSent ||
    !normalizedAudit.runExecutionWasDryRunOnly
  ) {
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
    operational_queue_transition_idempotency_key:
      ids.operationalQueueTransitionIdempotencyKey,

    run_draft_id: ids.runDraftId,
    run_record_id: runRead.record_id,
    run_idempotency_key: ids.runIdempotencyKey,

    previous_post_run_status: previousPostRunStatus || null,
    previous_worker_call_status: previousWorkerCallStatus || null,
    previous_run_execution_status: previousRunExecutionStatus || null,

    normalized_previous_post_run_status:
      normalizedAudit.normalizedPostRunStatus || null,
    normalized_previous_worker_call_status:
      normalizedAudit.normalizedWorkerCallStatus || null,
    normalized_previous_run_execution_status:
      normalizedAudit.normalizedRunExecutionStatus || null,

    current_run_status: runStatus || null,
    current_run_status_select: runStatusSelect || null,
    current_command_status: commandStatus || null,
    current_command_status_select: commandStatusSelect || null,

    audit_json_compatibility: {
      input_json_field_used:
        rawInputJson.inputJsonFieldUsed ||
        (parsedInputJson.ok
          ? parsedInputJson.inputJsonFieldUsed
          : parsedInputJson.inputJsonFieldUsed),
      input_json_raw_present:
        rawInputJson.inputJsonRawPresent ||
        (parsedInputJson.ok
          ? parsedInputJson.inputJsonRawPresent
          : parsedInputJson.inputJsonRawPresent),
      input_json_parse_failed: parsedInputJson.ok
        ? false
        : parsedInputJson.inputJsonParseFailed,
      parser_mode: parserMode,
      key_format_detected: auditKeyFormat.keyFormatDetected,
      accepted_snake_case_keys: auditKeyFormat.acceptedSnakeCaseKeys,
      accepted_compact_keys: auditKeyFormat.acceptedCompactKeys,
      normalized_post_run_status: normalizedAudit.normalizedPostRunStatus,
      normalized_worker_call_status: normalizedAudit.normalizedWorkerCallStatus,
      normalized_run_execution_status: normalizedAudit.normalizedRunExecutionStatus,
      post_run_dry_run_was_sent: normalizedAudit.postRunDryRunWasSent,
      worker_dry_run_call_was_sent: normalizedAudit.workerDryRunCallWasSent,
      run_execution_was_dry_run_only:
        normalizedAudit.runExecutionWasDryRunOnly,
      raw_fallback_used: rawFallbackUsed,
    },

    post_run_from_this_surface: "DISABLED",
    worker_call_from_this_surface: "DISABLED",
    previous_worker_dry_run_call: normalizedAudit.workerDryRunCallWasSent
      ? "CONFIRMED"
      : "NOT_CONFIRMED",
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

    run_input_json:
      Object.keys(runInputJson).length > 0 ? sanitizeObject(runInputJson) : null,

    worker_dry_run_result: workerDryRunResult,

    dry_run_result_review_check: reviewCheck,

    interpretation: {
      summary:
        "The previous V5.25.1 dry-run POST /run reached the worker successfully. The worker scanned the queued command but did not execute it because it was unsupported in the current worker execution path.",
      result_meaning:
        "Dry-run transport, auth, strict body, workspace routing, and worker response are validated. Capability execution remains a separate future step.",
      unsupported_is_blocking_for_real_execution: true,
      unsupported_fix_required_before_real_execution: true,
    },

    external_execution_review: {
      previous_worker_dry_run_call: normalizedAudit.workerDryRunCallWasSent
        ? "CONFIRMED"
        : "NOT_CONFIRMED",
      post_run_from_this_surface: "DISABLED",
      worker_call_from_this_surface: "DISABLED",
      external_worker_execution: "NOT_VERIFIED_FROM_THIS_SURFACE",
      external_scheduler_effect: "NOT_VERIFIED_FROM_THIS_SURFACE",
      note:
        "This surface reviews the previously persisted dry-run result only. It does not call the worker and does not inspect external scheduler activity.",
    },

    future_requirements: [
      "Review why command_orchestrator returned unsupported for the queued command",
      "Verify the command capability and worker allowlist before any real execution",
      "Keep real execution behind a separate feature gate",
      "Keep POST /run server-side only",
      "Keep worker secret server-side only",
      "Require explicit operator confirmation before any non-dry-run execution",
      "Add rollback or safe cancellation path before real execution",
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
      secret_exposure: "DISABLED",
      review_only: true,
    },

    error:
      status === "POST_RUN_DRY_RUN_RESULT_REVIEW_READY"
        ? null
        : "Dry-run result review is not ready. Check status, audit_json_compatibility, and read sections.",
    next_step:
      "V5.27 may introduce Unsupported Command Diagnosis, still without real execution.",
  });
}
