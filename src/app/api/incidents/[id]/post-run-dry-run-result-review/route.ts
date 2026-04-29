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

const VERSION = "Incident Detail V5.46";
const SOURCE = "dashboard_incident_detail_v5_46_review_decision_ui_action_contract";
const MODE = "POST_RUN_DRY_RUN_RESULT_REVIEW_ONLY";
const READER_VERSION = "V5.46_REVIEW_DECISION_UI_ACTION_CONTRACT";

const INPUT_JSON_FIELD_CANDIDATES = [
  "Input_JSON",
  "input_json",
  "Input JSON",
  "InputJSON",
  "inputJson",
];

const WORKER_RESULT_JSON_FIELD_CANDIDATES = [
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

function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function airtableUrl(baseId: string, tableName: string): string {
  return `https://api.airtable.com/v0/${encodeURIComponent(
    baseId
  )}/${encodeURIComponent(tableName)}`;
}

function airtableRecordUrl(
  baseId: string,
  tableName: string,
  recordId: string
): string {
  return `${airtableUrl(baseId, tableName)}/${encodeURIComponent(recordId)}`;
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

    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }

    if (
      ["false", "0", "no", "n", "off", "disabled", "inactive"].includes(
        normalized
      )
    ) {
      return false;
    }
  }

  if (typeof value === "number") return value !== 0;

  return fallback;
}

function pickOptionalBoolean(
  record: unknown,
  paths: string[]
): boolean | null {
  const value = pickUnknown(record, paths);

  if (value === undefined || value === null || value === "") return null;

  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "on", "enabled", "active"].includes(normalized)) {
      return true;
    }

    if (
      ["false", "0", "no", "n", "off", "disabled", "inactive"].includes(
        normalized
      )
    ) {
      return false;
    }
  }

  if (typeof value === "number") return value !== 0;

  return null;
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

    const objectText = extractBalancedObjectFrom(
      text,
      keyMatch.index + keyMatch[0].length
    );

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

function readJsonRecordFromFields(fields: JsonRecord, names: string[]): {
  value: JsonRecord | null;
  fieldName: string | null;
  rawPresent: boolean;
} {
  let firstPresentField: string | null = null;

  for (const fieldName of names) {
    const rawValue = fields[fieldName];

    if (rawValue === undefined || rawValue === null || rawValue === "") {
      continue;
    }

    if (!firstPresentField) {
      firstPresentField = fieldName;
    }

    const parsed = parseFlexibleJsonRecord(rawValue);

    if (parsed) {
      return {
        value: parsed,
        fieldName,
        rawPresent: true,
      };
    }
  }

  return {
    value: null,
    fieldName: firstPresentField,
    rawPresent: Boolean(firstPresentField),
  };
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

async function readRecordsByFormula(args: {
  baseId: string;
  token: string;
  tableName: string;
  formula: string;
  maxRecords?: number;
}): Promise<AirtableListResult> {
  const url = `${airtableUrl(args.baseId, args.tableName)}?maxRecords=${
    args.maxRecords ?? 10
  }&filterByFormula=${encodeURIComponent(args.formula)}`;

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

    const records = Array.isArray(parsed.records)
      ? (parsed.records as AirtableRecord[])
      : [];

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

    if (!result.error) {
      return result;
    }
  }

  return lastResult;
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
      ? ({
          id: String(parsed.id),
          fields: asRecord(parsed.fields),
        } satisfies AirtableRecord)
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

function hasWorkerResultShape(record: JsonRecord): boolean {
  return [
    "scanned",
    "executed",
    "succeeded",
    "failed",
    "blocked",
    "unsupported",
    "errors_count",
    "errorscount",
    "commands_record_ids",
    "commandsrecordids",
  ].some((key) => record[key] !== undefined);
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
  const parsedJson = readJsonRecordFromFields(
    fields,
    WORKER_RESULT_JSON_FIELD_CANDIDATES
  );

  const payload = parsedJson.value ?? {};
  const payloadBody = pickRecord(payload, ["body"]) ?? {};
  const payloadResult =
    pickRecord(payloadBody, ["result"]) ??
    pickRecord(payload, ["result"]) ??
    (hasWorkerResultShape(payload) ? payload : {});

  const directStatus = stringField(fields, ["Status", "status"]);
  const directStatusSelect = stringField(fields, ["Status_select", "status_select"]);
  const directCapability = stringField(fields, ["Capability", "capability"]);
  const directRunId = stringField(fields, ["Run_ID", "run_id", "Run ID", "runId"]);
  const directWorkspaceId = stringField(
    fields,
    ["Workspace_ID", "workspace_id", "Workspace ID", "workspaceId"],
    args.workspaceId
  );

  const commandRecordIds =
    pickArray<string>(payloadResult, [
      "commands_record_ids",
      "commandsrecordids",
      "commandsRecordIds",
    ]).length > 0
      ? pickArray<string>(payloadResult, [
          "commands_record_ids",
          "commandsrecordids",
          "commandsRecordIds",
        ])
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
    executed: pickNumber(
      payloadResult,
      ["executed"],
      pickNumber(fields, ["Executed"], 0)
    ),
    succeeded: pickNumber(
      payloadResult,
      ["succeeded"],
      pickNumber(fields, ["Succeeded"], 0)
    ),
    failed: pickNumber(payloadResult, ["failed"], pickNumber(fields, ["Failed"], 0)),
    blocked: pickNumber(
      payloadResult,
      ["blocked"],
      pickNumber(fields, ["Blocked"], 0)
    ),
    unsupported: pickNumber(
      payloadResult,
      ["unsupported"],
      pickNumber(fields, ["Unsupported"], 0)
    ),
    errors_count: pickNumber(
      payloadResult,
      ["errors_count", "errorscount", "errorsCount"],
      pickNumber(fields, ["Errors_Count", "errors_count", "Errors"], 0)
    ),
    commands_record_ids: commandRecordIds
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean),
    workspace_id: pickString(
      payloadResult,
      ["workspace_id", "workspaceid", "workspaceId"],
      directWorkspaceId
    ),
    selection_mode: pickString(payloadResult, ["selection_mode", "selectionmode"]),
    view: pickString(payloadResult, ["view"]),
  };

  const body = {
    ok:
      pickBoolean(payloadBody, ["ok"], false) ||
      pickBoolean(payload, ["ok"], false) ||
      normalizeStatusToken(directStatus) === "DONE" ||
      normalizeStatusToken(directStatusSelect) === "DONE" ||
      true,
    worker: pickString(payloadBody, ["worker"], pickString(payload, ["worker"])),
    capability: pickString(
      payloadBody,
      ["capability"],
      pickString(payload, ["capability"], directCapability)
    ),
    run_id: pickString(
      payloadBody,
      ["run_id", "runid", "runId"],
      pickString(payload, ["run_id", "runid", "runId"], directRunId)
    ),
    airtable_record_id: pickString(
      payloadBody,
      ["airtable_record_id", "airtablerecordid", "airtableRecordId"],
      pickString(
        payload,
        ["airtable_record_id", "airtablerecordid", "airtableRecordId"],
        args.record.id
      )
    ),
    result,
  };

  const workerResponse = {
    ok: true,
    http_status: pickNumber(
      payload,
      ["http_status", "httpstatus", "httpStatus"],
      200
    ),
    source: "worker_airtable_run_record_fallback",
    airtable_record_id: args.record.id,
    body,
  };

  return {
    workerResponse,
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
    args.workerDryRunResult.capability || "unknown"
  );

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const dryRun = booleanField(args.commandFields, ["Dry_Run", "dry_run", "dryRun"], true);

  const workerCallAllowed = booleanField(
    args.commandFields,
    ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"],
    false
  );

  const runCreationAllowed = booleanField(
    args.commandFields,
    ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"],
    false
  );

  const normalizedCapability = normalizeStatusToken(capabilityRequested);
  const normalizedCommandStatus = normalizeStatusToken(args.commandStatus);
  const normalizedCommandStatusSelect = normalizeStatusToken(args.commandStatusSelect);
  const normalizedTargetMode = normalizeStatusToken(targetMode);

  const unsupportedConfirmed =
    args.workerDryRunResult.unsupported >= 1 &&
    args.workerDryRunResult.executed === 0 &&
    args.workerDryRunResult.errors_count === 0;

  const currentQueueNotExecutable =
    normalizedCapability === "COMMANDORCHESTRATOR" &&
    normalizedCommandStatus === "QUEUED" &&
    normalizedCommandStatusSelect === "UNSUPPORTED" &&
    unsupportedConfirmed;

  const dryRunOnlyNotExecutable =
    normalizedTargetMode === "DRYRUNONLY" &&
    dryRun === true &&
    workerCallAllowed === false &&
    runCreationAllowed === false;

  let unsupportedCategory:
    | "CAPABILITY_NOT_EXECUTABLE_FROM_CURRENT_QUEUE"
    | "CAPABILITY_ALLOWLIST_OR_ROUTER_MISMATCH"
    | "COMMAND_STATUS_UNSUPPORTED"
    | "DRY_RUN_ONLY_NOT_EXECUTABLE"
    | "COMMAND_PAYLOAD_INCOMPLETE"
    | "UNKNOWN_UNSUPPORTED_REASON" = "UNKNOWN_UNSUPPORTED_REASON";

  if (currentQueueNotExecutable) {
    unsupportedCategory = "COMMAND_STATUS_UNSUPPORTED";
  } else if (dryRunOnlyNotExecutable) {
    unsupportedCategory = "DRY_RUN_ONLY_NOT_EXECUTABLE";
  } else if (
    capabilityRequested &&
    args.workerDryRunResult.executed === 0 &&
    args.workerDryRunResult.unsupported >= 1 &&
    args.workerDryRunResult.errors_count === 0
  ) {
    unsupportedCategory = "CAPABILITY_ALLOWLIST_OR_ROUTER_MISMATCH";
  } else if (!capabilityRequested || normalizedCapability === "UNKNOWN") {
    unsupportedCategory = "COMMAND_PAYLOAD_INCOMPLETE";
  }

  const probableReason =
    unsupportedCategory === "COMMAND_STATUS_UNSUPPORTED"
      ? "The worker scanned the command but treated it as unsupported because the command record is currently marked Unsupported or the execution router does not consider this queued command executable."
      : unsupportedCategory === "DRY_RUN_ONLY_NOT_EXECUTABLE"
        ? "The command is intentionally configured as dry_run_only with worker_call_allowed=false and run_creation_allowed=false, so it is not eligible for real execution in the current gated chain."
        : unsupportedCategory === "CAPABILITY_ALLOWLIST_OR_ROUTER_MISMATCH"
          ? "The requested capability exists on the command, but the worker returned unsupported with zero execution and zero errors. This suggests a capability allowlist, router, or execution-path mismatch."
          : unsupportedCategory === "COMMAND_PAYLOAD_INCOMPLETE"
            ? "The command payload does not expose enough executable capability information for the worker router to promote it safely."
            : "The worker classified the command as unsupported, but the available persisted evidence is not sufficient to assign a more specific reason.";

  const safetyInterpretation = dryRunOnlyNotExecutable
    ? "This is expected in the current gated dry-run chain. The command was reviewed without real execution rights."
    : "The dry-run proved transport, auth, workspace routing, and persisted worker evidence. Real execution remains blocked until the unsupported classification is explained and cleared.";

  const realExecutionBlocker =
    unsupportedConfirmed ||
    dryRunOnlyNotExecutable ||
    normalizedCommandStatusSelect === "UNSUPPORTED";

  const requiredBeforeRealRun = [
    "verify worker capability allowlist",
    "verify command router supports command_orchestrator",
    "verify command payload schema",
    "verify target_mode can be promoted safely",
    "verify operator approval for non-dry-run execution",
    "add rollback/cancel path before real execution",
  ];

  const recommendedNextAction =
    unsupportedCategory === "COMMAND_STATUS_UNSUPPORTED"
      ? "Inspect the Command router and the Status_select=Unsupported transition for command_orchestrator. Confirm whether command_orchestrator is intended to execute from the current queue or should spawn/route to a lower-level executable capability."
      : unsupportedCategory === "DRY_RUN_ONLY_NOT_EXECUTABLE"
        ? "Keep this command gated. Define the explicit promotion path from dry_run_only to a real executable mode before any non-dry-run execution."
        : unsupportedCategory === "CAPABILITY_ALLOWLIST_OR_ROUTER_MISMATCH"
          ? "Compare the command capability against the worker executable capability allowlist and router mapping. Add a read-only route-level diagnostic before changing the worker."
          : "Inspect the command fields and Input_JSON payload to identify the missing executable schema elements.";

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
    unsupported_is_blocking_for_real_execution:
      true,
    probable_reason: probableReason,
    safety_interpretation: safetyInterpretation,
    real_execution_blocker: realExecutionBlocker,
    recommended_next_action: recommendedNextAction,
    required_before_real_run: requiredBeforeRealRun,
    guardrail_interpretation:
      "V5.27 is diagnostic only. It does not execute the command, does not call the worker, does not mutate Airtable, and does not promote dry-run to real-run.",
  };
}

function buildRouterAllowlistReadiness(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
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
    args.workerDryRunResult.capability || "unknown"
  );

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const dryRun = booleanField(
    args.commandFields,
    ["Dry_Run", "dry_run", "dryRun"],
    true
  );

  const workerCallAllowed = booleanField(
    args.commandFields,
    ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"],
    false
  );

  const runCreationAllowed = booleanField(
    args.commandFields,
    ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"],
    false
  );

  const toolKey = stringField(args.commandFields, [
    "Tool_Key",
    "tool_key",
    "Tool Key",
    "toolKey",
    "Tool",
    "tool",
  ]);

  const toolMode = stringField(args.commandFields, [
    "Tool_Mode",
    "tool_mode",
    "Tool Mode",
    "toolMode",
    "Mode",
    "mode",
  ]);

  const commandPayloadRecord =
    pickRecord(args.commandFields, [
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
    ]) ?? null;

  const commandPayloadString = stringField(args.commandFields, [
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

  const commandPayloadPresent =
    Boolean(commandPayloadRecord && Object.keys(commandPayloadRecord).length > 0) ||
    Boolean(commandPayloadString && commandPayloadString.trim().length > 0);

  const normalizedCapability = normalizeStatusToken(capabilityRequested);
  const normalizedCommandStatusSelect = normalizeStatusToken(
    args.commandStatusSelect
  );
  const normalizedTargetMode = normalizeStatusToken(targetMode);

  const blockers: string[] = [];
  const warnings: string[] = [];

  const dryRunOnlyBlocked =
    normalizedTargetMode === "DRYRUNONLY" &&
    dryRun === true &&
    workerCallAllowed === false &&
    runCreationAllowed === false;

  const unsupportedStatusBlocked =
    normalizedCommandStatusSelect === "UNSUPPORTED";

  const isCommandOrchestrator =
    normalizedCapability === "COMMANDORCHESTRATOR";

  if (dryRunOnlyBlocked) {
    blockers.push(
      "Command is intentionally gated as dry_run_only with worker_call_allowed=false and run_creation_allowed=false."
    );
  }

  if (unsupportedStatusBlocked) {
    blockers.push(
      "Command Status_select is Unsupported. Real execution must remain blocked until router/allowlist mapping is reviewed."
    );
  }

  if (isCommandOrchestrator) {
    warnings.push(
      "command_orchestrator may be an orchestration capability rather than a directly executable business capability."
    );
  }

  if (!toolKey || !toolMode) {
    blockers.push(
      "Tool_Key / Tool_Mode not found on Command record. ToolCatalog readiness cannot be confirmed from this surface."
    );
  } else {
    warnings.push(
      "Tool mapping fields are present, but V5.28 does not call ToolCatalog or Worker router. This requires a future read-only registry inspection."
    );
  }

  if (!commandPayloadPresent) {
    blockers.push(
      "Command payload is not readable from current Command fields. Payload schema cannot be validated."
    );
  } else {
    warnings.push(
      "Command payload exists, but schema validation is not performed in V5.28."
    );
  }

  if (args.workerDryRunResult.unsupported >= 1) {
    blockers.push(
      "Worker dry-run returned unsupported=1. Router or allowlist readiness must be inspected before real execution."
    );
  }

  let readinessScore = 100;

  if (dryRunOnlyBlocked) readinessScore -= 35;
  if (unsupportedStatusBlocked) readinessScore -= 30;
  if (!toolKey) readinessScore -= 20;
  if (!toolMode) readinessScore -= 20;
  if (!commandPayloadPresent) readinessScore -= 15;
  if (args.workerDryRunResult.unsupported >= 1) readinessScore -= 20;

  readinessScore = Math.max(0, readinessScore);

  let readinessCategory:
    | "NOT_READY_DRY_RUN_ONLY"
    | "NOT_READY_COMMAND_STATUS_UNSUPPORTED"
    | "NOT_READY_ROUTER_MAPPING_UNKNOWN"
    | "NOT_READY_TOOL_MAPPING_MISSING"
    | "NOT_READY_PAYLOAD_INCOMPLETE"
    | "READY_FOR_ROUTER_REVIEW_ONLY"
    | "UNKNOWN_READINESS" = "UNKNOWN_READINESS";

  if (dryRunOnlyBlocked) {
    readinessCategory = "NOT_READY_DRY_RUN_ONLY";
  } else if (unsupportedStatusBlocked) {
    readinessCategory = "NOT_READY_COMMAND_STATUS_UNSUPPORTED";
  } else if (!toolKey || !toolMode) {
    readinessCategory = "NOT_READY_TOOL_MAPPING_MISSING";
  } else if (!commandPayloadPresent) {
    readinessCategory = "NOT_READY_PAYLOAD_INCOMPLETE";
  } else if (isCommandOrchestrator || args.workerDryRunResult.unsupported >= 1) {
    readinessCategory = "NOT_READY_ROUTER_MAPPING_UNKNOWN";
  } else {
    readinessCategory = "READY_FOR_ROUTER_REVIEW_ONLY";
  }

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
    command_payload_present: commandPayloadPresent,
    direct_execution_ready: false,
    router_ready: false,
    allowlist_ready: false,
    readiness_category: readinessCategory,
    readiness_score: readinessScore,
    blockers,
    warnings,
    next_safe_action: isCommandOrchestrator
      ? "Inspect whether command_orchestrator should execute directly, or only spawn/route to a lower-level executable capability. Then inspect ToolCatalog / Worker router mapping in read-only mode."
      : "Inspect ToolCatalog, Workspace_Capabilities, and Worker router mapping in read-only mode before any real execution.",
    real_run_allowed_by_readiness: false,
    guardrail_interpretation:
      "V5.28 is inspection only. It does not call the worker, does not inspect external registries, does not mutate Airtable, and does not promote dry-run to real-run.",
  };
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

function buildToolCatalogRegistryReadiness(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  capabilityRequested: string;
  routerAllowlistReadiness: {
    real_run_allowed_by_readiness?: boolean;
  };
  toolCatalogTable: string;
  workspaceCapabilitiesTable: string;
  registryReads: {
    toolcatalog: AirtableListResult;
    workspaceCapabilities: AirtableListResult;
  } | null;
}) {
  const toolKeyFromCommand = stringField(args.commandFields, [
    "Tool_Key",
    "tool_key",
    "Tool Key",
    "toolKey",
    "Tool",
    "tool",
  ]);

  const toolModeFromCommand = stringField(args.commandFields, [
    "Tool_Mode",
    "tool_mode",
    "Tool Mode",
    "toolMode",
    "Mode",
    "mode",
  ]);

  const normalizedCapability = normalizeStatusToken(args.capabilityRequested);
  const isCommandOrchestrator = normalizedCapability === "COMMANDORCHESTRATOR";

  const toolCatalogRecords = args.registryReads?.toolcatalog.records ?? [];
  const workspaceCapabilityRecords =
    args.registryReads?.workspaceCapabilities.records ?? [];

  const toolCatalogReadError = args.registryReads?.toolcatalog.error ?? null;
  const workspaceCapabilityReadError =
    args.registryReads?.workspaceCapabilities.error ?? null;

  const toolCatalogCapabilityKnown = toolCatalogRecords.length > 0;
  const workspaceCapabilityKnown = workspaceCapabilityRecords.length > 0;

  const firstToolCatalogFields = toolCatalogRecords[0]?.fields ?? {};
  const firstWorkspaceCapabilityFields = workspaceCapabilityRecords[0]?.fields ?? {};

  const executableHint = toolCatalogCapabilityKnown
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

  const routerHint = toolCatalogCapabilityKnown
    ? pickOptionalBoolean(firstToolCatalogFields, [
        "Router",
        "Is_Router",
        "is_router",
        "Router_Only",
        "router_only",
        "Orchestrator",
        "Is_Orchestrator",
        "is_orchestrator",
      ])
    : null;

  const workspaceCapabilityEnabledHint = workspaceCapabilityKnown
    ? pickOptionalBoolean(firstWorkspaceCapabilityFields, [
        "Enabled",
        "enabled",
        "Active",
        "active",
        "Allowed",
        "allowed",
        "Is_Enabled",
        "is_enabled",
        "Capability_Enabled",
        "capability_enabled",
      ])
    : null;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!toolKeyFromCommand || !toolModeFromCommand) {
    blockers.push(
      "Command has no Tool_Key / Tool_Mode. Registry mapping cannot be promoted to real execution."
    );
  }

  if (toolCatalogReadError || !toolCatalogCapabilityKnown) {
    blockers.push(
      `ToolCatalog did not confirm capability ${args.capabilityRequested}.`
    );
  }

  if (workspaceCapabilityReadError || !workspaceCapabilityKnown) {
    blockers.push(
      `Workspace_Capabilities did not confirm capability ${args.capabilityRequested} for workspace ${args.workspaceId}.`
    );
  }

  if (isCommandOrchestrator) {
    warnings.push(
      "command_orchestrator may be an orchestration capability. It may need to spawn a lower-level executable capability rather than execute directly."
    );
  }

  if (toolCatalogReadError) {
    warnings.push(
      "ToolCatalog read was attempted but returned an error. This may be caused by a missing table, missing fields in the formula, or unavailable registry configuration."
    );
  }

  if (workspaceCapabilityReadError) {
    warnings.push(
      "Workspace_Capabilities read was attempted but returned an error. This may be caused by a missing table, missing fields in the formula, or unavailable registry configuration."
    );
  }

  if (toolCatalogCapabilityKnown && executableHint !== true) {
    warnings.push(
      "ToolCatalog record exists, but executable readiness was not explicitly confirmed."
    );
  }

  if (workspaceCapabilityKnown && workspaceCapabilityEnabledHint !== true) {
    warnings.push(
      "Workspace capability record exists, but workspace capability enabled state was not explicitly confirmed."
    );
  }

  let registryReadinessScore = 100;

  if (!toolKeyFromCommand) registryReadinessScore -= 35;
  if (!toolModeFromCommand) registryReadinessScore -= 35;
  if (!toolCatalogCapabilityKnown) registryReadinessScore -= 25;
  if (!workspaceCapabilityKnown) registryReadinessScore -= 25;
  if (isCommandOrchestrator) registryReadinessScore -= 20;
  if (!args.routerAllowlistReadiness.real_run_allowed_by_readiness) {
    registryReadinessScore -= 20;
  }

  registryReadinessScore = Math.max(0, registryReadinessScore);

  let registryReadinessCategory:
    | "REGISTRY_NOT_CONFIGURED_OR_UNREADABLE"
    | "TOOLCATALOG_NOT_FOUND"
    | "WORKSPACE_CAPABILITY_NOT_FOUND"
    | "TOOL_MAPPING_MISSING_ON_COMMAND"
    | "CAPABILITY_KNOWN_BUT_NOT_EXECUTION_READY"
    | "REGISTRY_READY_FOR_REVIEW_ONLY"
    | "UNKNOWN_REGISTRY_READINESS" = "UNKNOWN_REGISTRY_READINESS";

  if (!toolKeyFromCommand || !toolModeFromCommand) {
    registryReadinessCategory = "TOOL_MAPPING_MISSING_ON_COMMAND";
  } else if (toolCatalogReadError && workspaceCapabilityReadError) {
    registryReadinessCategory = "REGISTRY_NOT_CONFIGURED_OR_UNREADABLE";
  } else if (!toolCatalogCapabilityKnown) {
    registryReadinessCategory = "TOOLCATALOG_NOT_FOUND";
  } else if (!workspaceCapabilityKnown) {
    registryReadinessCategory = "WORKSPACE_CAPABILITY_NOT_FOUND";
  } else if (
    executableHint !== true ||
    workspaceCapabilityEnabledHint !== true ||
    isCommandOrchestrator ||
    !args.routerAllowlistReadiness.real_run_allowed_by_readiness
  ) {
    registryReadinessCategory = "CAPABILITY_KNOWN_BUT_NOT_EXECUTION_READY";
  } else {
    registryReadinessCategory = "REGISTRY_READY_FOR_REVIEW_ONLY";
  }

  const registryReadyForRealRun = false;

  const nextSafeAction =
    registryReadinessCategory === "TOOL_MAPPING_MISSING_ON_COMMAND"
      ? "Add or confirm Tool_Key / Tool_Mode on the Command model in a future controlled schema step before considering real execution."
      : registryReadinessCategory === "TOOLCATALOG_NOT_FOUND"
        ? "Create or confirm a ToolCatalog entry for command_orchestrator, then rerun this read-only inspection."
        : registryReadinessCategory === "WORKSPACE_CAPABILITY_NOT_FOUND"
          ? "Create or confirm a Workspace_Capabilities entry for this workspace and capability, then rerun this read-only inspection."
          : registryReadinessCategory === "CAPABILITY_KNOWN_BUT_NOT_EXECUTION_READY"
            ? "Inspect whether command_orchestrator should route/spawn a lower-level executable capability instead of executing directly."
            : "Continue with read-only Worker router mapping inspection before any real execution.";

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
      capability_known: toolCatalogCapabilityKnown,
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
      workspace_capability_known: workspaceCapabilityKnown,
      workspace_capability_enabled_hint: workspaceCapabilityEnabledHint,
    },

    registry_readiness_category: registryReadinessCategory,
    registry_readiness_score: registryReadinessScore,
    registry_ready_for_real_run: registryReadyForRealRun,
    blockers,
    warnings,
    next_safe_action: nextSafeAction,
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
    scanned: number;
    executed: number;
    unsupported: number;
    errors_count: number;
    capability: string;
    commands_record_ids: string[];
  };
  routerAllowlistReadiness: {
    command_payload_present?: boolean;
    tool_key?: string | null;
    tool_mode?: string | null;
    real_run_allowed_by_readiness?: boolean;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
    tool_key_from_command?: string | null;
    tool_mode_from_command?: string | null;
  };
}) {
  const capabilityRequested = stringField(
    args.commandFields,
    ["Capability", "capability"],
    args.workerDryRunResult.capability || "unknown"
  );

  const normalizedCapability = normalizeStatusToken(capabilityRequested);
  const capabilityRole:
    | "orchestrator"
    | "executable"
    | "unknown" =
    normalizedCapability === "COMMANDORCHESTRATOR"
      ? "orchestrator"
      : capabilityRequested && capabilityRequested !== "unknown"
        ? "executable"
        : "unknown";

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const dryRun = booleanField(
    args.commandFields,
    ["Dry_Run", "dry_run", "dryRun"],
    true
  );

  const workerCallAllowed = booleanField(
    args.commandFields,
    ["Worker_Call_Allowed", "worker_call_allowed", "workerCallAllowed"],
    false
  );

  const runCreationAllowed = booleanField(
    args.commandFields,
    ["Run_Creation_Allowed", "run_creation_allowed", "runCreationAllowed"],
    false
  );

  const toolKey =
    args.toolcatalogRegistryReadiness.tool_key_from_command ||
    args.routerAllowlistReadiness.tool_key ||
    stringField(args.commandFields, [
      "Tool_Key",
      "tool_key",
      "Tool Key",
      "toolKey",
      "Tool",
      "tool",
    ]);

  const toolMode =
    args.toolcatalogRegistryReadiness.tool_mode_from_command ||
    args.routerAllowlistReadiness.tool_mode ||
    stringField(args.commandFields, [
      "Tool_Mode",
      "tool_mode",
      "Tool Mode",
      "toolMode",
      "Mode",
      "mode",
    ]);

  const explicitTargetCapability = stringField(args.commandFields, [
    "Target_Capability",
    "target_capability",
    "targetCapability",
    "Next_Capability",
    "next_capability",
    "nextCapability",
    "Spawn_Capability",
    "spawn_capability",
    "spawnCapability",
    "Child_Capability",
    "child_capability",
    "childCapability",
    "Capability_Target",
    "capability_target",
    "capabilityTarget",
  ]);

  const commandPayloadPresent =
    args.routerAllowlistReadiness.command_payload_present === true;

  const normalizedTargetMode = normalizeStatusToken(targetMode);
  const normalizedStatusSelect = normalizeStatusToken(args.commandStatusSelect);

  const isCommandOrchestrator = capabilityRole === "orchestrator";
  const directExecutionExpected = false;
  const spawnOrRouteExpected = isCommandOrchestrator;

  const likelyTargetCapability = explicitTargetCapability || null;
  const targetCapabilityConfidence:
    | "high"
    | "medium"
    | "low"
    | "unknown" =
    explicitTargetCapability ? "medium" : "unknown";

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (isCommandOrchestrator) {
    warnings.push(
      "command_orchestrator should likely route or spawn a lower-level executable capability instead of executing directly."
    );
  }

  if (!toolKey || !toolMode) {
    blockers.push(
      "Tool_Key / Tool_Mode are missing, so the router cannot map this command to an executable tool."
    );
  }

  if (args.toolcatalogRegistryReadiness.registry_ready_for_real_run === false) {
    blockers.push(
      "Registry readiness is false. Router mapping cannot be promoted to real execution."
    );
  }

  if (
    normalizedStatusSelect === "UNSUPPORTED" ||
    args.workerDryRunResult.unsupported >= 1
  ) {
    blockers.push(
      "Command is already marked Unsupported by the dry-run path. Router mapping must be reviewed before any promotion."
    );
  }

  if (
    normalizedTargetMode === "DRYRUNONLY" ||
    dryRun === true ||
    workerCallAllowed === false ||
    runCreationAllowed === false
  ) {
    blockers.push(
      "Command is gated as dry-run only and cannot be routed to real execution."
    );
  }

  if (commandPayloadPresent) {
    warnings.push(
      "Command payload exists, but V5.30 does not validate the router schema."
    );
  } else {
    blockers.push(
      "Command payload is missing or unreadable; router schema cannot be inferred."
    );
  }

  if (isCommandOrchestrator && !likelyTargetCapability) {
    blockers.push(
      "command_orchestrator has no proven target capability in the current Command fields."
    );
  }

  let routerMappingScore = 100;

  if (isCommandOrchestrator && !likelyTargetCapability) routerMappingScore -= 30;
  if (!toolKey) routerMappingScore -= 25;
  if (!toolMode) routerMappingScore -= 25;
  if (normalizedStatusSelect === "UNSUPPORTED") routerMappingScore -= 25;
  if (normalizedTargetMode === "DRYRUNONLY") routerMappingScore -= 20;
  if (args.workerDryRunResult.unsupported >= 1) routerMappingScore -= 20;
  if (args.toolcatalogRegistryReadiness.registry_ready_for_real_run === false) {
    routerMappingScore -= 20;
  }
  if (commandPayloadPresent) {
    routerMappingScore -= 15;
  } else {
    routerMappingScore -= 30;
  }

  routerMappingScore = Math.max(0, routerMappingScore);

  let routerMappingCategory:
    | "ORCHESTRATOR_NEEDS_TARGET_CAPABILITY"
    | "MISSING_TARGET_CAPABILITY_MAPPING"
    | "MISSING_TOOL_MAPPING"
    | "UNSUPPORTED_STATUS_BLOCKS_ROUTING"
    | "DRY_RUN_ONLY_BLOCKS_ROUTING"
    | "PAYLOAD_NEEDS_SCHEMA_VALIDATION"
    | "ROUTER_MAPPING_READY_FOR_REVIEW_ONLY"
    | "UNKNOWN_ROUTER_MAPPING" = "UNKNOWN_ROUTER_MAPPING";

  if (!toolKey || !toolMode) {
    routerMappingCategory = "MISSING_TOOL_MAPPING";
  } else if (normalizedStatusSelect === "UNSUPPORTED") {
    routerMappingCategory = "UNSUPPORTED_STATUS_BLOCKS_ROUTING";
  } else if (normalizedTargetMode === "DRYRUNONLY" || dryRun === true) {
    routerMappingCategory = "DRY_RUN_ONLY_BLOCKS_ROUTING";
  } else if (isCommandOrchestrator && !likelyTargetCapability) {
    routerMappingCategory = "ORCHESTRATOR_NEEDS_TARGET_CAPABILITY";
  } else if (!likelyTargetCapability && spawnOrRouteExpected) {
    routerMappingCategory = "MISSING_TARGET_CAPABILITY_MAPPING";
  } else if (!commandPayloadPresent) {
    routerMappingCategory = "PAYLOAD_NEEDS_SCHEMA_VALIDATION";
  } else {
    routerMappingCategory = "ROUTER_MAPPING_READY_FOR_REVIEW_ONLY";
  }

  const routerMappingReadyForRealRun = false;

  const nextSafeAction =
    routerMappingCategory === "MISSING_TOOL_MAPPING"
      ? "Define Tool_Key / Tool_Mode and registry entries in a controlled schema step, then rerun read-only readiness inspection."
      : routerMappingCategory === "ORCHESTRATOR_NEEDS_TARGET_CAPABILITY" ||
          routerMappingCategory === "MISSING_TARGET_CAPABILITY_MAPPING"
        ? "Decide which lower-level executable capability command_orchestrator should spawn or route to, then represent that mapping explicitly before any real execution."
        : routerMappingCategory === "UNSUPPORTED_STATUS_BLOCKS_ROUTING"
          ? "Inspect Worker router mapping and the Unsupported transition before promoting the command."
          : routerMappingCategory === "DRY_RUN_ONLY_BLOCKS_ROUTING"
            ? "Keep the command gated. Define a separate promotion path from dry_run_only to executable mode."
            : "Continue with Worker router code inspection or controlled registry/schema definition before real execution.";

  return {
    available: true,
    inspection_version: "V5.30_WORKER_ROUTER_MAPPING_INSPECTION",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    capability_requested: capabilityRequested,
    capability_role: capabilityRole,
    direct_execution_expected: directExecutionExpected,
    spawn_or_route_expected: spawnOrRouteExpected,
    likely_target_capability: likelyTargetCapability,
    target_capability_confidence: targetCapabilityConfidence,
    router_mapping_category: routerMappingCategory,
    router_mapping_score: routerMappingScore,
    router_mapping_ready_for_real_run: routerMappingReadyForRealRun,
    blockers,
    warnings,
    next_safe_action: nextSafeAction,
    evidence: {
      tool_key_present: Boolean(toolKey),
      tool_mode_present: Boolean(toolMode),
      registry_ready_for_real_run:
        args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true,
      router_allowlist_real_run_allowed:
        args.routerAllowlistReadiness.real_run_allowed_by_readiness === true,
      command_payload_present: commandPayloadPresent,
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

function buildSearchContextText(value: unknown): string {
  try {
    return JSON.stringify(sanitizeObject(value)).toLowerCase();
  } catch {
    return "";
  }
}

function countKeywordHits(text: string, keywords: string[]): number {
  return keywords.reduce((count, keyword) => {
    return text.includes(keyword.toLowerCase()) ? count + 1 : count;
  }, 0);
}

function buildCandidateCapability(args: {
  capability: string;
  role: "executable" | "router" | "terminal" | "unknown";
  contextText: string;
  positiveKeywords: string[];
  negativeReasonWhenNoSignal: string;
  baseScore?: number;
  globalRecommendedAllowed: boolean;
  globalBlockers: string[];
}) {
  const hits = countKeywordHits(args.contextText, args.positiveKeywords);
  const reasons: string[] = [];
  const blockers: string[] = [...args.globalBlockers];

  let score = args.baseScore ?? 0;

  if (hits > 0) {
    score += Math.min(60, hits * 15);
    reasons.push(
      `Found ${hits} contextual signal(s) for ${args.capability}.`
    );
  } else {
    blockers.push(args.negativeReasonWhenNoSignal);
  }

  score = Math.max(0, Math.min(100, score));

  const confidence: "high" | "medium" | "low" | "unknown" =
    hits >= 4
      ? "medium"
      : hits >= 2
        ? "low"
        : hits === 1
          ? "low"
          : "unknown";

  const recommended =
    args.globalRecommendedAllowed && score >= 70 && confidence !== "unknown";

  return {
    capability: args.capability,
    role: args.role,
    score,
    confidence,
    reasons,
    blockers,
    recommended,
  };
}

function buildTargetCapabilityDecisionMatrix(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  commandFields: JsonRecord;
  runInputJson: JsonRecord;
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
  routerAllowlistReadiness: {
    command_payload_present?: boolean;
    real_run_allowed_by_readiness?: boolean;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
    tool_key_from_command?: string | null;
    tool_mode_from_command?: string | null;
  };
  workerRouterMappingInspection: {
    capability_requested?: string;
    capability_role?: "orchestrator" | "executable" | "unknown";
    likely_target_capability?: string | null;
    target_capability_confidence?: "high" | "medium" | "low" | "unknown";
    router_mapping_ready_for_real_run?: boolean;
  };
}) {
  const sourceCapability =
    args.workerRouterMappingInspection.capability_requested ||
    stringField(args.commandFields, ["Capability", "capability"]) ||
    args.workerDryRunResult.capability ||
    "command_orchestrator";

  const sourceCapabilityRole =
    args.workerRouterMappingInspection.capability_role || "unknown";

  const toolKey = args.toolcatalogRegistryReadiness.tool_key_from_command || "";
  const toolMode = args.toolcatalogRegistryReadiness.tool_mode_from_command || "";

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const explicitTargetCapability =
    args.workerRouterMappingInspection.likely_target_capability ||
    stringField(args.commandFields, [
      "Target_Capability",
      "target_capability",
      "targetCapability",
      "Next_Capability",
      "next_capability",
      "nextCapability",
      "Spawn_Capability",
      "spawn_capability",
      "spawnCapability",
      "Child_Capability",
      "child_capability",
      "childCapability",
      "Capability_Target",
      "capability_target",
      "capabilityTarget",
    ]) ||
    null;

  const contextText = buildSearchContextText({
    incident_id: args.incidentId,
    workspace_id: args.workspaceId,
    command_fields: args.commandFields,
    run_input_json: args.runInputJson,
    command_status: args.commandStatus,
    command_status_select: args.commandStatusSelect,
    target_mode: targetMode,
    worker_dry_run_result: args.workerDryRunResult,
  });

  const missingDecisionInputs: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  const toolMappingMissing = !toolKey || !toolMode;
  const registryReady =
    args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true;
  const routerMappingReady =
    args.workerRouterMappingInspection.router_mapping_ready_for_real_run === true;
  const payloadPresent =
    args.routerAllowlistReadiness.command_payload_present === true;
  const unsupportedBlocked =
    normalizeStatusToken(args.commandStatusSelect) === "UNSUPPORTED" ||
    args.workerDryRunResult.unsupported >= 1;
  const dryRunOnlyBlocked =
    normalizeStatusToken(targetMode) === "DRYRUNONLY";

  if (toolMappingMissing) {
    missingDecisionInputs.push("Tool_Key / Tool_Mode are missing.");
    blockers.push(
      "Tool_Key / Tool_Mode are missing, so no target capability can be selected with high confidence."
    );
  }

  if (!registryReady) {
    missingDecisionInputs.push("Registry readiness is false.");
    blockers.push(
      "ToolCatalog / Workspace_Capabilities do not confirm a real-run-ready mapping."
    );
  }

  if (!routerMappingReady) {
    missingDecisionInputs.push("Worker router mapping readiness is false.");
    blockers.push(
      "Worker router mapping is not ready for real execution."
    );
  }

  if (!explicitTargetCapability) {
    missingDecisionInputs.push("No explicit target capability is present.");
    blockers.push(
      "No lower-level target capability is proven in the current Command fields."
    );
  }

  if (!payloadPresent) {
    missingDecisionInputs.push("Command payload is missing or unreadable.");
    blockers.push(
      "Payload schema cannot be used to infer a target capability."
    );
  } else {
    warnings.push(
      "Command payload exists, but V5.31 does not validate an executable schema."
    );
  }

  if (unsupportedBlocked) {
    blockers.push(
      "Command is marked Unsupported or worker returned unsupported=1."
    );
  }

  if (dryRunOnlyBlocked) {
    blockers.push(
      "Command target_mode is dry_run_only, so target selection cannot imply execution."
    );
  }

  if (sourceCapabilityRole === "orchestrator") {
    warnings.push(
      "Source capability is an orchestrator. It should only select or route to a target capability after explicit mapping is proven."
    );
  }

  const globalRecommendedAllowed =
    !toolMappingMissing &&
    registryReady &&
    routerMappingReady &&
    Boolean(explicitTargetCapability) &&
    !unsupportedBlocked &&
    !dryRunOnlyBlocked;

  const globalCandidateBlockers = globalRecommendedAllowed
    ? []
    : [
        "Global prerequisites are not satisfied, so this candidate cannot be recommended for real execution.",
      ];

  const candidateCapabilities = [
    buildCandidateCapability({
      capability: "http_exec",
      role: "executable",
      contextText,
      positiveKeywords: ["url", "method", "endpoint", "http", "request", "webhook"],
      negativeReasonWhenNoSignal:
        "No HTTP URL, method, endpoint, request, or webhook signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "incident_router",
      role: "router",
      contextText,
      positiveKeywords: [
        "incident_id",
        "incident",
        "severity",
        "urgency",
        "status incident",
        "route incident",
      ],
      negativeReasonWhenNoSignal:
        "No strong incident routing signal is present beyond the generic Incident Detail context.",
      baseScore: args.incidentId ? 20 : 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "internal_escalate",
      role: "executable",
      contextText,
      positiveKeywords: [
        "escalation",
        "escalate",
        "urgent",
        "critical",
        "manager",
        "email alert",
      ],
      negativeReasonWhenNoSignal:
        "No explicit escalation, urgent, critical, manager, or alert signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "resolve_incident",
      role: "terminal",
      contextText,
      positiveKeywords: ["resolve", "resolved", "resolution", "close incident"],
      negativeReasonWhenNoSignal:
        "No explicit resolved, resolution, or close incident signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "smart_resolve",
      role: "router",
      contextText,
      positiveKeywords: [
        "smart_resolve",
        "automatic resolution",
        "low severity",
        "final resolution",
      ],
      negativeReasonWhenNoSignal:
        "No explicit smart_resolve, low severity, or final resolution signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "complete_flow_incident",
      role: "terminal",
      contextText,
      positiveKeywords: [
        "complete_flow_incident",
        "flow completed",
        "incident flow done",
      ],
      negativeReasonWhenNoSignal:
        "No explicit complete_flow_incident or incident flow completion signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: globalCandidateBlockers,
    }),
    buildCandidateCapability({
      capability: "complete_flow_demo",
      role: "terminal",
      contextText,
      positiveKeywords: ["demo", "complete_flow_demo", "clean_test"],
      negativeReasonWhenNoSignal:
        "No explicit demo, complete_flow_demo, or clean_test signal is present.",
      baseScore: 0,
      globalRecommendedAllowed,
      globalBlockers: [
        ...globalCandidateBlockers,
        "complete_flow_demo must not be recommended for a real ferrera-production incident unless demo context is explicit.",
      ],
    }),
  ];

  let selectedTargetCapability: string | null = null;
  let selectedTargetConfidence: "high" | "medium" | "low" | "unknown" =
    "unknown";

  if (globalRecommendedAllowed) {
    const recommendedCandidate = candidateCapabilities
      .filter((candidate) => candidate.recommended)
      .sort((left, right) => right.score - left.score)[0];

    if (recommendedCandidate) {
      selectedTargetCapability = recommendedCandidate.capability;
      selectedTargetConfidence = recommendedCandidate.confidence;
    }
  }

  let decisionCategory:
    | "TARGET_CAPABILITY_NOT_PROVEN"
    | "TOOL_MAPPING_REQUIRED_FIRST"
    | "PAYLOAD_SCHEMA_REQUIRED_FIRST"
    | "REGISTRY_REQUIRED_FIRST"
    | "WORKER_ROUTER_CODE_INSPECTION_REQUIRED"
    | "TARGET_CAPABILITY_READY_FOR_REVIEW_ONLY"
    | "UNKNOWN_TARGET_DECISION" = "UNKNOWN_TARGET_DECISION";

  if (toolMappingMissing) {
    decisionCategory = "TOOL_MAPPING_REQUIRED_FIRST";
  } else if (!payloadPresent) {
    decisionCategory = "PAYLOAD_SCHEMA_REQUIRED_FIRST";
  } else if (!registryReady) {
    decisionCategory = "REGISTRY_REQUIRED_FIRST";
  } else if (!routerMappingReady) {
    decisionCategory = "WORKER_ROUTER_CODE_INSPECTION_REQUIRED";
  } else if (!selectedTargetCapability) {
    decisionCategory = "TARGET_CAPABILITY_NOT_PROVEN";
  } else {
    decisionCategory = "TARGET_CAPABILITY_READY_FOR_REVIEW_ONLY";
  }

  const decisionReady =
    Boolean(selectedTargetCapability) &&
    selectedTargetConfidence !== "unknown" &&
    globalRecommendedAllowed;

  return {
    available: true,
    inspection_version: "V5.31_TARGET_CAPABILITY_DECISION_MATRIX",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,
    source_capability: sourceCapability,
    source_capability_role: sourceCapabilityRole,
    decision_ready: decisionReady,
    selected_target_capability: decisionReady ? selectedTargetCapability : null,
    selected_target_confidence: decisionReady
      ? selectedTargetConfidence
      : "unknown",
    decision_category: decisionCategory,
    candidate_capabilities: candidateCapabilities,
    missing_decision_inputs: Array.from(new Set(missingDecisionInputs)),
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    next_safe_action:
      decisionCategory === "TOOL_MAPPING_REQUIRED_FIRST"
        ? "Define Tool_Key / Tool_Mode and explicit target capability mapping before selecting a lower-level capability."
        : decisionCategory === "REGISTRY_REQUIRED_FIRST"
          ? "Create or confirm ToolCatalog and Workspace_Capabilities entries before target capability selection."
          : decisionCategory === "WORKER_ROUTER_CODE_INSPECTION_REQUIRED"
            ? "Inspect Worker router code in a separate read-only engineering step before selecting a target capability."
            : decisionCategory === "PAYLOAD_SCHEMA_REQUIRED_FIRST"
              ? "Validate or expose Command payload schema before target capability selection."
              : "Keep the decision read-only and require explicit mapping evidence before creating any target command.",
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
  routerAllowlistReadiness: {
    command_payload_present?: boolean;
    tool_key?: string | null;
    tool_mode?: string | null;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
    tool_key_from_command?: string | null;
    tool_mode_from_command?: string | null;
  };
  workerRouterMappingInspection: {
    capability_requested?: string;
    capability_role?: "orchestrator" | "executable" | "unknown";
    direct_execution_expected?: boolean;
    router_mapping_ready_for_real_run?: boolean;
  };
  targetCapabilityDecisionMatrix: {
    decision_ready?: boolean;
    selected_target_capability?: string | null;
    selected_target_confidence?: "high" | "medium" | "low" | "unknown";
  };
}) {
  const sourceCapability =
    args.workerRouterMappingInspection.capability_requested ||
    stringField(args.commandFields, ["Capability", "capability"]) ||
    "command_orchestrator";

  const sourceRole =
    args.workerRouterMappingInspection.capability_role ||
    (normalizeStatusToken(sourceCapability) === "COMMANDORCHESTRATOR"
      ? "orchestrator"
      : "unknown");

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const dryRun = booleanField(
    args.commandFields,
    ["Dry_Run", "dry_run", "dryRun"],
    true
  );

  const toolKeyCurrent =
    args.toolcatalogRegistryReadiness.tool_key_from_command ||
    args.routerAllowlistReadiness.tool_key ||
    stringField(args.commandFields, [
      "Tool_Key",
      "tool_key",
      "Tool Key",
      "toolKey",
      "Tool",
      "tool",
    ]) ||
    null;

  const toolModeCurrent =
    args.toolcatalogRegistryReadiness.tool_mode_from_command ||
    args.routerAllowlistReadiness.tool_mode ||
    stringField(args.commandFields, [
      "Tool_Mode",
      "tool_mode",
      "Tool Mode",
      "toolMode",
      "Mode",
      "mode",
    ]) ||
    null;

  const targetSelectionReady =
    args.targetCapabilityDecisionMatrix.decision_ready === true;

  const selectedTargetCapability = targetSelectionReady
    ? args.targetCapabilityDecisionMatrix.selected_target_capability ?? null
    : null;

  const targetConfidence = targetSelectionReady
    ? args.targetCapabilityDecisionMatrix.selected_target_confidence ?? "unknown"
    : "unknown";

  const payloadPresent = args.routerAllowlistReadiness.command_payload_present === true;
  const payloadSchemaValidated = false;
  const registryReadyForRealRun =
    args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true;
  const toolMappingReady = Boolean(toolKeyCurrent && toolModeCurrent);
  const promotionRequired =
    normalizeStatusToken(targetMode) === "DRYRUNONLY" || dryRun === true;
  const promotionReady = false;

  const missingContractInputs: string[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (normalizeStatusToken(sourceCapability) === "COMMANDORCHESTRATOR") {
    warnings.push(
      "command_orchestrator should not be promoted to direct execution until router and target capability mapping are explicit."
    );
  }

  if (!targetSelectionReady) {
    missingContractInputs.push("Target capability is not selected.");
    blockers.push("Target capability is not selected. Execution mapping cannot proceed.");
  }

  if (!toolMappingReady) {
    missingContractInputs.push("Tool_Key / Tool_Mode are missing.");
    blockers.push(
      "Tool_Key / Tool_Mode are required before execution mapping can be considered complete."
    );
  }

  if (!registryReadyForRealRun) {
    missingContractInputs.push(
      "ToolCatalog / Workspace_Capabilities registry is not ready for real run."
    );
    blockers.push(
      "ToolCatalog / Workspace_Capabilities registry is not ready for real run."
    );
  }

  if (!payloadPresent) {
    missingContractInputs.push("Payload is missing or unreadable.");
    blockers.push("Payload is missing or unreadable.");
  } else {
    warnings.push("Payload exists but schema has not been validated.");
  }

  if (!payloadSchemaValidated) {
    missingContractInputs.push("Payload schema has not been validated.");
  }

  if (promotionRequired) {
    missingContractInputs.push("Promotion policy from dry_run_only is missing.");
    blockers.push(
      "Command is still dry_run_only. A separate promotion policy is required before real execution."
    );
  }

  let contractStatus:
    | "CONTRACT_DRAFT_ONLY"
    | "CONTRACT_BLOCKED_TOOL_MAPPING"
    | "CONTRACT_BLOCKED_TARGET_CAPABILITY"
    | "CONTRACT_BLOCKED_REGISTRY"
    | "CONTRACT_BLOCKED_PAYLOAD_SCHEMA"
    | "CONTRACT_BLOCKED_PROMOTION_POLICY"
    | "CONTRACT_READY_FOR_REVIEW_ONLY"
    | "UNKNOWN_CONTRACT_STATUS" = "UNKNOWN_CONTRACT_STATUS";

  if (!toolMappingReady) {
    contractStatus = "CONTRACT_BLOCKED_TOOL_MAPPING";
  } else if (!targetSelectionReady) {
    contractStatus = "CONTRACT_BLOCKED_TARGET_CAPABILITY";
  } else if (!registryReadyForRealRun) {
    contractStatus = "CONTRACT_BLOCKED_REGISTRY";
  } else if (!payloadPresent || !payloadSchemaValidated) {
    contractStatus = "CONTRACT_BLOCKED_PAYLOAD_SCHEMA";
  } else if (promotionRequired || !promotionReady) {
    contractStatus = "CONTRACT_BLOCKED_PROMOTION_POLICY";
  } else {
    contractStatus = "CONTRACT_READY_FOR_REVIEW_ONLY";
  }

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
      selected_target_capability: selectedTargetCapability,
      target_selection_ready: targetSelectionReady,
      target_selection_source: "target_capability_decision_matrix",
      target_confidence: targetConfidence,
      target_required_before_execution: true,
    },

    tool_mapping: {
      tool_key_required: true,
      tool_key_current: toolKeyCurrent,
      tool_mode_required: true,
      tool_mode_current: toolModeCurrent,
      tool_mapping_ready: toolMappingReady,
    },

    registry_contract: {
      toolcatalog_entry_required: true,
      workspace_capability_entry_required: true,
      registry_ready: registryReadyForRealRun,
      registry_ready_for_real_run: registryReadyForRealRun,
    },

    payload_contract: {
      payload_present: payloadPresent,
      payload_schema_validated: payloadSchemaValidated,
      payload_schema_required: true,
    },

    promotion_contract: {
      current_mode: targetMode || null,
      promotion_required: promotionRequired,
      promotion_ready: promotionReady,
      operator_approval_required: true,
      rollback_required: true,
      real_run_allowed: false,
    },

    contract_status: contractStatus,
    contract_ready_for_execution: false,
    missing_contract_inputs: Array.from(new Set(missingContractInputs)),
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    next_safe_action:
      contractStatus === "CONTRACT_BLOCKED_TOOL_MAPPING"
        ? "Define Tool_Key / Tool_Mode before completing the execution mapping contract."
        : contractStatus === "CONTRACT_BLOCKED_TARGET_CAPABILITY"
          ? "Select and explicitly map a target capability before any target command creation."
          : contractStatus === "CONTRACT_BLOCKED_REGISTRY"
            ? "Create or confirm ToolCatalog and Workspace_Capabilities entries before promotion."
            : contractStatus === "CONTRACT_BLOCKED_PAYLOAD_SCHEMA"
              ? "Define and validate the executable payload schema before promotion."
              : contractStatus === "CONTRACT_BLOCKED_PROMOTION_POLICY"
                ? "Define the dry_run_only to executable promotion policy, operator approval, and rollback path."
                : "Keep this contract in review-only mode until every execution prerequisite is explicitly satisfied.",
    guardrail_interpretation:
      "V5.32 is an execution mapping contract draft only. It does not create commands, call the worker, mutate Airtable, or promote dry-run to real-run.",
  };
}

function normalizeProposalConfidence(value: unknown): "high" | "medium" | "low" | "unknown" {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "high") return "high";
  if (normalized === "medium") return "medium";
  if (normalized === "low") return "low";
  return "unknown";
}

function normalizeProposalRole(value: unknown): "router" | "executable" | "terminal" | "unknown" {
  const normalized = String(value || "").trim().toLowerCase();

  if (normalized === "router") return "router";
  if (normalized === "executable") return "executable";
  if (normalized === "terminal") return "terminal";
  return "unknown";
}

function capProposalConfidenceForDraft(
  value: "high" | "medium" | "low" | "unknown"
): "medium" | "low" | "unknown" {
  if (value === "high" || value === "medium") return "medium";
  if (value === "low") return "low";
  return "unknown";
}

function buildToolMappingProposalDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  workerDryRunResult: {
    unsupported: number;
  };
  routerAllowlistReadiness: {
    tool_key?: string | null;
    tool_mode?: string | null;
    command_payload_present?: boolean;
    real_run_allowed_by_readiness?: boolean;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
    tool_key_from_command?: string | null;
    tool_mode_from_command?: string | null;
  };
  workerRouterMappingInspection: {
    capability_requested?: string;
    capability_role?: "orchestrator" | "executable" | "unknown";
    router_mapping_ready_for_real_run?: boolean;
  };
  targetCapabilityDecisionMatrix: {
    decision_ready?: boolean;
    selected_target_capability?: string | null;
    selected_target_confidence?: "high" | "medium" | "low" | "unknown";
    candidate_capabilities?: unknown[];
  };
  executionMappingContractDraft: {
    contract_ready_for_execution?: boolean;
    contract_status?: string;
  };
}) {
  const sourceCapability =
    args.workerRouterMappingInspection.capability_requested ||
    stringField(args.commandFields, ["Capability", "capability"]) ||
    "command_orchestrator";

  const sourceRole =
    args.workerRouterMappingInspection.capability_role ||
    (normalizeStatusToken(sourceCapability) === "COMMANDORCHESTRATOR"
      ? "orchestrator"
      : "unknown");

  const currentToolKey =
    args.toolcatalogRegistryReadiness.tool_key_from_command ||
    args.routerAllowlistReadiness.tool_key ||
    stringField(args.commandFields, [
      "Tool_Key",
      "tool_key",
      "Tool Key",
      "toolKey",
      "Tool",
      "tool",
    ]) ||
    null;

  const currentToolMode =
    args.toolcatalogRegistryReadiness.tool_mode_from_command ||
    args.routerAllowlistReadiness.tool_mode ||
    stringField(args.commandFields, [
      "Tool_Mode",
      "tool_mode",
      "Tool Mode",
      "toolMode",
      "Mode",
      "mode",
    ]) ||
    null;

  const candidates = Array.isArray(
    args.targetCapabilityDecisionMatrix.candidate_capabilities
  )
    ? args.targetCapabilityDecisionMatrix.candidate_capabilities
        .map((candidate) => asRecord(candidate))
        .filter((candidate) => pickString(candidate, ["capability"]))
    : [];

  const strongestCandidate = candidates
    .slice()
    .sort((left, right) => {
      const rightScore = pickNumber(right, ["score"], 0);
      const leftScore = pickNumber(left, ["score"], 0);
      return rightScore - leftScore;
    })[0];

  const strongestCandidateName = strongestCandidate
    ? pickString(strongestCandidate, ["capability"])
    : null;

  const strongestCandidateScore = strongestCandidate
    ? pickNumber(strongestCandidate, ["score"], 0)
    : 0;

  const strongestCandidateConfidence = strongestCandidate
    ? normalizeProposalConfidence(pickString(strongestCandidate, ["confidence"]))
    : "unknown";

  const strongestCandidateRole = strongestCandidate
    ? normalizeProposalRole(pickString(strongestCandidate, ["role"]))
    : "unknown";

  const selectedTargetCapability =
    args.targetCapabilityDecisionMatrix.decision_ready === true
      ? args.targetCapabilityDecisionMatrix.selected_target_capability ?? null
      : null;

  const selectedTargetConfidence =
    args.targetCapabilityDecisionMatrix.decision_ready === true
      ? normalizeProposalConfidence(
          args.targetCapabilityDecisionMatrix.selected_target_confidence
        )
      : "unknown";

  const proposedTargetCapability =
    selectedTargetCapability ||
    (strongestCandidateName && strongestCandidateScore > 0
      ? strongestCandidateName
      : null);

  const proposedTargetRole =
    selectedTargetCapability && strongestCandidateName === selectedTargetCapability
      ? strongestCandidateRole
      : strongestCandidateName === proposedTargetCapability
        ? strongestCandidateRole
        : "unknown";

  const proposedToolKey = proposedTargetCapability || null;

  const proposedToolMode:
    | "review_only"
    | "dry_run_only"
    | "router_only"
    | null =
    proposedTargetCapability === "incident_router" &&
    normalizeStatusToken(sourceCapability) === "COMMANDORCHESTRATOR"
      ? "router_only"
      : proposedTargetCapability === "http_exec"
        ? "dry_run_only"
        : proposedTargetCapability
          ? "review_only"
          : null;

  const proposalConfidence = selectedTargetCapability
    ? capProposalConfidenceForDraft(selectedTargetConfidence)
    : capProposalConfidenceForDraft(strongestCandidateConfidence);

  const blockers: string[] = [];
  const warnings: string[] = [];
  const whyNotReady: string[] = [];
  const whyReadOnly: string[] = [];

  if (!currentToolKey || !currentToolMode) {
    blockers.push("Current Command has no Tool_Key / Tool_Mode.");
    whyNotReady.push("Tool_Key / Tool_Mode are missing on the current Command.");
  }

  if (args.toolcatalogRegistryReadiness.registry_ready_for_real_run !== true) {
    blockers.push("Registry readiness is false.");
    whyNotReady.push("Registry readiness is false.");
  }

  if (args.targetCapabilityDecisionMatrix.decision_ready !== true) {
    blockers.push("Target capability decision is not ready.");
    whyNotReady.push("Target capability decision is not ready.");
  }

  if (args.workerRouterMappingInspection.router_mapping_ready_for_real_run !== true) {
    blockers.push("Worker router mapping is not ready.");
    whyNotReady.push("Worker router mapping is not ready.");
  }

  const targetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  if (normalizeStatusToken(targetMode) === "DRYRUNONLY") {
    blockers.push("Command is still dry_run_only.");
    whyNotReady.push("Command is still dry_run_only.");
  }

  const commandStatusSelect = stringField(args.commandFields, [
    "Status_select",
    "status_select",
  ]);

  if (
    normalizeStatusToken(commandStatusSelect) === "UNSUPPORTED" ||
    args.workerDryRunResult.unsupported >= 1
  ) {
    blockers.push("Command is marked Unsupported.");
    whyNotReady.push("Command is marked Unsupported.");
  }

  blockers.push("Proposal is not approved for mutation or execution.");
  warnings.push(
    "This is a proposal draft only. It must not be applied automatically."
  );

  if (proposedTargetCapability) {
    warnings.push(
      `Proposed target capability ${proposedTargetCapability} is a low-confidence draft and must be validated before any mapping is applied.`
    );
  } else {
    warnings.push(
      "No target capability can be proposed with sufficient confidence from the current evidence."
    );
  }

  whyReadOnly.push("V5.33 does not mutate Airtable.");
  whyReadOnly.push("V5.33 does not create Tool_Key / Tool_Mode.");
  whyReadOnly.push("V5.33 does not create ToolCatalog records.");
  whyReadOnly.push("V5.33 does not create Workspace_Capabilities records.");
  whyReadOnly.push("V5.33 does not create target Commands.");
  whyReadOnly.push("V5.33 does not call the worker.");
  whyReadOnly.push("V5.33 does not promote dry-run to real-run.");

  const requiredBeforeApply = [
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
  ];

  return {
    available: true,
    proposal_version: "V5.33_TOOL_MAPPING_PROPOSAL_DRAFT",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,

    source: {
      capability: sourceCapability,
      role: sourceRole,
      current_tool_key: currentToolKey,
      current_tool_mode: currentToolMode,
      direct_execution_allowed: false,
    },

    proposal: {
      proposed_tool_key: proposedToolKey,
      proposed_tool_mode: proposedToolMode,
      proposed_target_capability: proposedTargetCapability,
      proposed_target_role: proposedTargetRole,
      proposal_confidence: proposalConfidence,
      proposal_ready_to_apply: false,
      proposal_apply_allowed: false,
    },

    reasoning: {
      strongest_candidate: strongestCandidateName,
      strongest_candidate_score: strongestCandidateScore,
      strongest_candidate_confidence: strongestCandidateConfidence,
      why_not_ready: Array.from(new Set(whyNotReady)),
      why_read_only: whyReadOnly,
    },

    required_before_apply: requiredBeforeApply,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
    next_safe_action:
      proposedTargetCapability
        ? `Review the draft mapping ${sourceCapability} -> ${proposedTargetCapability}, then define Tool_Key / Tool_Mode and registry entries in a separate controlled step.`
        : "Define an explicit target capability before drafting Tool_Key / Tool_Mode.",
    guardrail_interpretation:
      "V5.33 is a tool mapping proposal draft only. It does not create mappings, mutate Airtable, call the worker, create commands, or promote dry-run to real-run.",
  };
}

function buildControlledMappingPlan(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  toolMappingProposalDraft: {
    source?: {
      capability?: string;
      role?: string;
      current_tool_key?: string | null;
      current_tool_mode?: string | null;
    };
    proposal?: {
      proposed_tool_key?: string | null;
      proposed_tool_mode?: "review_only" | "dry_run_only" | "router_only" | null;
      proposed_target_capability?: string | null;
      proposed_target_role?: "router" | "executable" | "terminal" | "unknown";
      proposal_confidence?: "high" | "medium" | "low" | "unknown";
      proposal_ready_to_apply?: boolean;
      proposal_apply_allowed?: boolean;
    };
  };
  executionMappingContractDraft: {
    payload_contract?: {
      payload_present?: boolean;
      payload_schema_validated?: boolean;
    };
    promotion_contract?: {
      current_mode?: string | null;
      real_run_allowed?: boolean;
    };
  };
  targetCapabilityDecisionMatrix: {
    decision_ready?: boolean;
  };
  workerRouterMappingInspection: {
    router_mapping_ready_for_real_run?: boolean;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
  };
}) {
  const sourceCapability =
    args.toolMappingProposalDraft.source?.capability ||
    stringField(args.commandFields, ["Capability", "capability"]) ||
    "command_orchestrator";

  const sourceRole =
    args.toolMappingProposalDraft.source?.role ||
    (normalizeStatusToken(sourceCapability) === "COMMANDORCHESTRATOR"
      ? "orchestrator"
      : "unknown");

  const proposedToolKey =
    args.toolMappingProposalDraft.proposal?.proposed_tool_key ?? null;
  const proposedToolMode =
    args.toolMappingProposalDraft.proposal?.proposed_tool_mode ?? null;
  const proposedTargetCapability =
    args.toolMappingProposalDraft.proposal?.proposed_target_capability ?? null;
  const proposedTargetRole =
    args.toolMappingProposalDraft.proposal?.proposed_target_role ?? "unknown";
  const proposalConfidence =
    args.toolMappingProposalDraft.proposal?.proposal_confidence ?? "unknown";

  const currentToolKey =
    args.toolMappingProposalDraft.source?.current_tool_key ?? null;
  const currentToolMode =
    args.toolMappingProposalDraft.source?.current_tool_mode ?? null;

  const registryReadyForRealRun =
    args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true;
  const payloadSchemaValidated =
    args.executionMappingContractDraft.payload_contract?.payload_schema_validated ===
    true;
  const payloadPresent =
    args.executionMappingContractDraft.payload_contract?.payload_present === true;
  const promotionRealRunAllowed =
    args.executionMappingContractDraft.promotion_contract?.real_run_allowed ===
    true;

  const blockers: string[] = [];
  const warnings: string[] = [];

  if (proposalConfidence === "low" || proposalConfidence === "unknown") {
    blockers.push(
      "Tool mapping proposal confidence is low. Human review is required before any mutation."
    );
  }

  if (!currentToolKey || !currentToolMode) {
    blockers.push(
      "Current Command has no Tool_Key / Tool_Mode. Mapping fields must be defined in a controlled mutation step later."
    );
  }

  if (!registryReadyForRealRun) {
    blockers.push(
      "ToolCatalog / Workspace_Capabilities are not ready. Registry entries must be created or confirmed before execution."
    );
  }

  if (!payloadSchemaValidated) {
    blockers.push(
      "Payload schema is not validated. No executable mapping can be approved before schema validation."
    );
  }

  if (!promotionRealRunAllowed) {
    blockers.push(
      "Promotion from dry_run_only to executable mode is not ready."
    );
  }

  if (!args.targetCapabilityDecisionMatrix.decision_ready) {
    blockers.push(
      "Target capability decision is not ready. Proposed mapping must remain a draft."
    );
  }

  if (!args.workerRouterMappingInspection.router_mapping_ready_for_real_run) {
    blockers.push(
      "Worker router mapping is not ready for real execution."
    );
  }

  warnings.push(
    "V5.34 is a controlled mapping plan only. It must not mutate Airtable or create execution objects."
  );

  if (proposedTargetCapability) {
    warnings.push(
      `The proposed target capability ${proposedTargetCapability} is a planning candidate, not an approved runtime mapping.`
    );
  } else {
    warnings.push(
      "No proposed target capability is available. Mapping must remain fully blocked."
    );
  }

  let planStatus:
    | "PLAN_DRAFT_ONLY"
    | "PLAN_BLOCKED_BY_LOW_CONFIDENCE_PROPOSAL"
    | "PLAN_BLOCKED_BY_MISSING_TOOL_MAPPING"
    | "PLAN_BLOCKED_BY_MISSING_REGISTRY"
    | "PLAN_BLOCKED_BY_UNVALIDATED_PAYLOAD_SCHEMA"
    | "PLAN_BLOCKED_BY_PROMOTION_POLICY"
    | "PLAN_READY_FOR_HUMAN_REVIEW_ONLY"
    | "UNKNOWN_PLAN_STATUS" = "UNKNOWN_PLAN_STATUS";

  if (proposalConfidence === "low" || proposalConfidence === "unknown") {
    planStatus = "PLAN_BLOCKED_BY_LOW_CONFIDENCE_PROPOSAL";
  } else if (!currentToolKey || !currentToolMode) {
    planStatus = "PLAN_BLOCKED_BY_MISSING_TOOL_MAPPING";
  } else if (!registryReadyForRealRun) {
    planStatus = "PLAN_BLOCKED_BY_MISSING_REGISTRY";
  } else if (!payloadSchemaValidated) {
    planStatus = "PLAN_BLOCKED_BY_UNVALIDATED_PAYLOAD_SCHEMA";
  } else if (!promotionRealRunAllowed) {
    planStatus = "PLAN_BLOCKED_BY_PROMOTION_POLICY";
  } else {
    planStatus = "PLAN_READY_FOR_HUMAN_REVIEW_ONLY";
  }

  const proposedToolKeyForPlan = proposedToolKey || "incident_router";
  const proposedToolModeForPlan = proposedToolMode || "router_only";
  const proposedTargetForPlan = proposedTargetCapability || "incident_router";

  const implementationSequence = [
    `Human review of proposed mapping ${sourceCapability} -> ${proposedTargetForPlan}`,
    `Define Tool_Key = ${proposedToolKeyForPlan} on a future controlled mutation path`,
    `Define Tool_Mode = ${proposedToolModeForPlan} on a future controlled mutation path`,
    `Create or confirm ToolCatalog entry for ${proposedTargetForPlan}`,
    `Create or confirm Workspace_Capabilities entry for ${args.workspaceId} + ${proposedTargetForPlan}`,
    `Define payload schema for ${proposedTargetForPlan}`,
    "Validate payload against schema",
    "Define promotion policy from dry_run_only to executable",
    "Require explicit operator approval",
    "Define rollback/cancel path",
    "Rerun GET read-only inspection",
    "Only after all checks pass, consider a separate gated mutation endpoint",
  ];

  const validationSequence = [
    "confirm proposed target capability is correct",
    `confirm ${sourceCapability} should route to ${proposedTargetForPlan}`,
    `confirm ${proposedTargetForPlan} exists in worker router`,
    "confirm ToolCatalog entry exists",
    "confirm Workspace_Capabilities entry exists",
    "confirm payload schema validates",
    "confirm command is no longer Unsupported only after controlled update",
    "confirm dry_run_only remains until explicit promotion",
    "confirm operator approval is fresh",
    "confirm rollback path exists",
  ];

  const rollbackSequence = [
    "keep original Command unchanged until mutation phase",
    "preserve Run Draft evidence",
    "preserve Worker run evidence",
    "if future mapping fails, revert Tool_Key / Tool_Mode",
    "if future registry check fails, disable mapping",
    "if future worker dry-run fails, do not promote to real-run",
    "keep real-run forbidden by default",
  ];

  const preconditionsBeforeAnyMutation = [
    "human review completed",
    "proposed target capability explicitly accepted",
    "Tool_Key and Tool_Mode approved for controlled mutation",
    "ToolCatalog entry design approved",
    "Workspace_Capabilities entry design approved",
    "payload schema defined",
    "rollback/cancel path defined",
    "fresh operator approval for mutation obtained",
    "separate mutation endpoint or manual controlled update prepared",
  ];

  const preconditionsBeforeAnyExecution = [
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
  ];

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

    plan_status: planStatus,
    plan_ready_for_mutation: false,
    plan_ready_for_execution: false,
    real_run_allowed: false,

    implementation_sequence: implementationSequence,
    validation_sequence: validationSequence,
    rollback_sequence: rollbackSequence,

    objects_to_prepare_later: {
      command_fields: [
        {
          field: "Tool_Key",
          proposed_value: proposedToolKey,
          status: "draft_only",
        },
        {
          field: "Tool_Mode",
          proposed_value: proposedToolMode,
          status: "draft_only",
        },
        {
          field: "Target_Capability",
          proposed_value: proposedTargetCapability,
          status: "draft_only",
        },
        {
          field: "Mapping_Status",
          proposed_value: "Draft / Review only",
          status: "draft_only",
        },
        {
          field: "Real_Run",
          proposed_value: "Forbidden",
          status: "must_remain_forbidden",
        },
      ],
      toolcatalog_entry: {
        Tool_Key: proposedToolKeyForPlan,
        Capability: proposedTargetForPlan,
        Tool_Mode: proposedToolModeForPlan,
        Executable: false,
        Router: proposedTargetRole === "router" || proposedTargetForPlan === "incident_router",
        Status: "Draft",
        note: "Draft only. Do not create from V5.34.",
      },
      workspace_capability_entry: {
        Workspace_ID: args.workspaceId,
        Capability_Key: proposedTargetForPlan,
        Enabled: false,
        Status: "Draft",
        note: "Draft only. Do not create from V5.34.",
      },
      payload_schema: {
        capability: proposedTargetForPlan,
        schema_required: true,
        schema_validated: false,
        payload_present: payloadPresent,
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

    preconditions_before_any_mutation: preconditionsBeforeAnyMutation,
    preconditions_before_any_execution: preconditionsBeforeAnyExecution,
    blockers: Array.from(new Set(blockers)),
    warnings: Array.from(new Set(warnings)),
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
    errors_count: number;
    commands_record_ids: string[];
  };
  reviewCheck: {
    worker_response_exists?: boolean;
    worker_scanned_at_least_one_command?: boolean;
    worker_command_record_seen?: boolean;
  };
  routerAllowlistReadiness: {
    command_payload_present?: boolean;
    real_run_allowed_by_readiness?: boolean;
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
    tool_key_from_command?: string | null;
    tool_mode_from_command?: string | null;
    toolcatalog?: {
      attempted?: boolean;
      records_found?: number;
      read_error?: string | null;
    };
    workspace_capabilities?: {
      attempted?: boolean;
      records_found?: number;
      read_error?: string | null;
    };
  };
  workerRouterMappingInspection: {
    router_mapping_ready_for_real_run?: boolean;
  };
  targetCapabilityDecisionMatrix: {
    decision_ready?: boolean;
    selected_target_capability?: string | null;
  };
  executionMappingContractDraft: {
    payload_contract?: {
      payload_present?: boolean;
      payload_schema_validated?: boolean;
    };
    promotion_contract?: {
      current_mode?: string | null;
      real_run_allowed?: boolean;
    };
  };
  toolMappingProposalDraft: {
    available?: boolean;
    proposal?: {
      proposed_tool_key?: string | null;
      proposed_tool_mode?: "review_only" | "dry_run_only" | "router_only" | null;
      proposed_target_capability?: string | null;
      proposal_confidence?: "high" | "medium" | "low" | "unknown";
      proposal_ready_to_apply?: boolean;
      proposal_apply_allowed?: boolean;
    };
  };
  controlledMappingPlan: {
    available?: boolean;
    plan_status?: string;
    plan_ready_for_mutation?: boolean;
    plan_ready_for_execution?: boolean;
    proposed_mapping?: {
      proposal_confidence?: "high" | "medium" | "low" | "unknown";
      proposed_tool_key?: string | null;
      proposed_tool_mode?: "review_only" | "dry_run_only" | "router_only" | null;
      proposed_target_capability?: string | null;
      apply_allowed_now?: boolean;
    };
    rollback_sequence?: string[];
    preconditions_before_any_mutation?: string[];
    preconditions_before_any_execution?: string[];
  };
}) {
  const currentToolKey =
    args.toolcatalogRegistryReadiness.tool_key_from_command ||
    stringField(args.commandFields, [
      "Tool_Key",
      "tool_key",
      "Tool Key",
      "toolKey",
      "Tool",
      "tool",
    ]) ||
    null;

  const currentToolMode =
    args.toolcatalogRegistryReadiness.tool_mode_from_command ||
    stringField(args.commandFields, [
      "Tool_Mode",
      "tool_mode",
      "Tool Mode",
      "toolMode",
      "Mode",
      "mode",
    ]) ||
    null;

  const commandStatusSelect = stringField(args.commandFields, [
    "Status_select",
    "status_select",
  ]);

  const targetMode =
    args.executionMappingContractDraft.promotion_contract?.current_mode ||
    stringField(args.commandFields, ["Target_Mode", "target_mode", "targetMode"]);

  const proposedToolKey =
    args.controlledMappingPlan.proposed_mapping?.proposed_tool_key ||
    args.toolMappingProposalDraft.proposal?.proposed_tool_key ||
    null;

  const proposedToolMode =
    args.controlledMappingPlan.proposed_mapping?.proposed_tool_mode ||
    args.toolMappingProposalDraft.proposal?.proposed_tool_mode ||
    null;

  const proposedTargetCapability =
    args.controlledMappingPlan.proposed_mapping?.proposed_target_capability ||
    args.toolMappingProposalDraft.proposal?.proposed_target_capability ||
    null;

  const proposalConfidence =
    args.controlledMappingPlan.proposed_mapping?.proposal_confidence ||
    args.toolMappingProposalDraft.proposal?.proposal_confidence ||
    "unknown";

  const proposalExists = args.toolMappingProposalDraft.available === true;
  const controlledPlanExists = args.controlledMappingPlan.available === true;
  const proposalConfidenceAcceptable =
    proposalConfidence === "medium" || proposalConfidence === "high";
  const toolCatalogAttempted =
    args.toolcatalogRegistryReadiness.toolcatalog?.attempted === true;
  const toolCatalogReadable =
    toolCatalogAttempted &&
    !args.toolcatalogRegistryReadiness.toolcatalog?.read_error;
  const toolCatalogEntryExists =
    (args.toolcatalogRegistryReadiness.toolcatalog?.records_found ?? 0) > 0;

  const workspaceCapabilitiesAttempted =
    args.toolcatalogRegistryReadiness.workspace_capabilities?.attempted === true;
  const workspaceCapabilitiesReadable =
    workspaceCapabilitiesAttempted &&
    !args.toolcatalogRegistryReadiness.workspace_capabilities?.read_error;
  const workspaceCapabilitiesEntryExists =
    (args.toolcatalogRegistryReadiness.workspace_capabilities?.records_found ?? 0) >
    0;

  const registryReady =
    args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true;

  const payloadPresent =
    args.executionMappingContractDraft.payload_contract?.payload_present === true ||
    args.routerAllowlistReadiness.command_payload_present === true;
  const payloadSchemaValidated =
    args.executionMappingContractDraft.payload_contract?.payload_schema_validated ===
    true;

  const currentModeIsDryRunOnly =
    normalizeStatusToken(targetMode) === "DRYRUNONLY";

  const realRunAllowed =
    args.executionMappingContractDraft.promotion_contract?.real_run_allowed === true;

  const promotionAllowedNow = realRunAllowed === true;
  const rollbackSequenceListed =
    Array.isArray(args.controlledMappingPlan.rollback_sequence) &&
    args.controlledMappingPlan.rollback_sequence.length > 0;

  const rollbackValidated = false;
  const originalCommandPreserved = true;
  const runDraftEvidencePreserved = true;
  const workerRunEvidencePreserved =
    args.reviewCheck.worker_response_exists === true &&
    args.workerDryRunResult.http_status === 200;

  const workerDryRunEvidenceExists =
    args.reviewCheck.worker_response_exists === true &&
    args.workerDryRunResult.ok === true;
  const workerScannedCommand =
    args.reviewCheck.worker_scanned_at_least_one_command === true &&
    args.reviewCheck.worker_command_record_seen === true;
  const workerReturnedUnsupported = args.workerDryRunResult.unsupported >= 1;
  const commandIsUnsupported =
    normalizeStatusToken(commandStatusSelect) === "UNSUPPORTED";

  const routerMappingReady =
    args.workerRouterMappingInspection.router_mapping_ready_for_real_run === true;
  const targetCapabilitySelected =
    args.targetCapabilityDecisionMatrix.decision_ready === true &&
    Boolean(args.targetCapabilityDecisionMatrix.selected_target_capability);

  const mappingMutationPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "mapping_proposal_exists",
      label: "Mapping proposal exists",
      status: proposalExists ? "pass" : "fail",
      blocking: !proposalExists,
      evidence: proposalExists
        ? "tool_mapping_proposal_draft.available=true."
        : "tool_mapping_proposal_draft is missing or unavailable.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "proposal_confidence_acceptable",
      label: "Proposal confidence is acceptable",
      status: proposalConfidenceAcceptable ? "pass" : "fail",
      blocking: true,
      evidence: `proposal_confidence=${proposalConfidence}. Medium or higher is required before mutation.`,
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "proposed_tool_key_exists",
      label: "Proposed Tool_Key exists",
      status: proposedToolKey ? "pass" : "fail",
      blocking: !proposedToolKey,
      evidence: proposedToolKey
        ? `proposed_tool_key=${proposedToolKey}.`
        : "No proposed_tool_key is available.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "proposed_tool_mode_exists",
      label: "Proposed Tool_Mode exists",
      status: proposedToolMode ? "pass" : "fail",
      blocking: !proposedToolMode,
      evidence: proposedToolMode
        ? `proposed_tool_mode=${proposedToolMode}.`
        : "No proposed_tool_mode is available.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "current_command_has_no_conflicting_tool_key",
      label: "Current Command has no conflicting Tool_Key",
      status: !currentToolKey && !currentToolMode ? "pass" : "warning",
      blocking: false,
      evidence:
        !currentToolKey && !currentToolMode
          ? "Current Command has no Tool_Key / Tool_Mode, so there is no conflicting mapping to overwrite."
          : `Current mapping exists: Tool_Key=${currentToolKey}, Tool_Mode=${currentToolMode}.`,
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "current_command_mutation_not_allowed_from_this_route",
      label: "Current Command mutation is not allowed from this route",
      status: "pass",
      blocking: false,
      evidence: "This GET surface is read-only and does not mutate Airtable.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "controlled_mapping_plan_exists",
      label: "Controlled mapping plan exists",
      status: controlledPlanExists ? "pass" : "fail",
      blocking: !controlledPlanExists,
      evidence: controlledPlanExists
        ? `controlled_mapping_plan.plan_status=${args.controlledMappingPlan.plan_status}.`
        : "controlled_mapping_plan is missing.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "human_review_required",
      label: "Human review required",
      status: "warning",
      blocking: true,
      evidence:
        "Human review is required because the proposed mapping is low confidence and not approved for mutation.",
      requiredBefore: "review",
    }),
  ];

  const registryPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "toolcatalog_table_readable",
      label: "ToolCatalog table readable",
      status: toolCatalogReadable ? "pass" : "fail",
      blocking: !toolCatalogReadable,
      evidence: toolCatalogReadable
        ? "ToolCatalog read completed without error."
        : `ToolCatalog read unavailable or failed: ${
            args.toolcatalogRegistryReadiness.toolcatalog?.read_error || "not attempted"
          }.`,
      requiredBefore: "registry",
    }),
    buildPreflightCheckItem({
      id: "toolcatalog_entry_exists_for_proposed_target",
      label: "ToolCatalog entry exists for proposed target",
      status: toolCatalogEntryExists ? "pass" : "fail",
      blocking: true,
      evidence: toolCatalogEntryExists
        ? "ToolCatalog returned at least one matching record."
        : `No confirmed ToolCatalog entry for proposed target ${
            proposedTargetCapability || "unknown"
          }.`,
      requiredBefore: "registry",
    }),
    buildPreflightCheckItem({
      id: "workspace_capabilities_table_readable",
      label: "Workspace_Capabilities table readable",
      status: workspaceCapabilitiesReadable ? "pass" : "fail",
      blocking: !workspaceCapabilitiesReadable,
      evidence: workspaceCapabilitiesReadable
        ? "Workspace_Capabilities read completed without error."
        : `Workspace_Capabilities read unavailable or failed: ${
            args.toolcatalogRegistryReadiness.workspace_capabilities?.read_error ||
            "not attempted"
          }.`,
      requiredBefore: "registry",
    }),
    buildPreflightCheckItem({
      id: "workspace_capability_entry_exists",
      label: "Workspace_Capabilities entry exists for workspace + proposed target",
      status: workspaceCapabilitiesEntryExists ? "pass" : "fail",
      blocking: true,
      evidence: workspaceCapabilitiesEntryExists
        ? "Workspace_Capabilities returned at least one matching record."
        : `No confirmed Workspace_Capabilities entry for ${args.workspaceId} + ${
            proposedTargetCapability || "unknown"
          }.`,
      requiredBefore: "registry",
    }),
    buildPreflightCheckItem({
      id: "registry_ready_for_real_run",
      label: "Registry ready for real-run",
      status: registryReady ? "pass" : "fail",
      blocking: true,
      evidence: `registry_ready_for_real_run=${registryReady}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "registry_mutation_not_allowed_from_this_route",
      label: "Registry mutation is not allowed from this route",
      status: "pass",
      blocking: false,
      evidence:
        "This route does not create or update ToolCatalog / Workspace_Capabilities records.",
      requiredBefore: "registry",
    }),
  ];

  const payloadSchemaPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "command_payload_present",
      label: "Command payload present",
      status: payloadPresent ? "pass" : "fail",
      blocking: !payloadPresent,
      evidence: `payload_present=${payloadPresent}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "payload_schema_exists",
      label: "Payload schema exists",
      status: "fail",
      blocking: true,
      evidence:
        "No validated payload schema object is available from the current read-only diagnostics.",
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "payload_schema_validated",
      label: "Payload schema validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: true,
      evidence: `payload_schema_validated=${payloadSchemaValidated}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "payload_can_be_mapped_to_target_capability",
      label: "Payload can be mapped to proposed target capability",
      status: "fail",
      blocking: true,
      evidence:
        "Payload exists, but V5.35 does not validate that it matches incident_router schema.",
      requiredBefore: "execution",
    }),
  ];

  const promotionPolicyPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "current_mode_is_dry_run_only",
      label: "Current mode is dry_run_only",
      status: currentModeIsDryRunOnly ? "pass" : "warning",
      blocking: false,
      evidence: `current_mode=${targetMode || "unknown"}. dry_run_only remains a safety guardrail.`,
      requiredBefore: "review",
    }),
    buildPreflightCheckItem({
      id: "promotion_policy_exists",
      label: "Promotion policy exists",
      status: "fail",
      blocking: true,
      evidence:
        "No explicit promotion policy from dry_run_only to executable is validated.",
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "promotion_allowed_now",
      label: "Promotion allowed now",
      status: promotionAllowedNow ? "pass" : "fail",
      blocking: true,
      evidence: `promotion_allowed_now=${promotionAllowedNow}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "real_run_remains_forbidden",
      label: "Real-run remains forbidden",
      status: !realRunAllowed ? "pass" : "fail",
      blocking: realRunAllowed,
      evidence: `real_run_allowed=${realRunAllowed}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "execution_separate_from_mapping",
      label: "Execution must be separate from mapping",
      status: "pass",
      blocking: false,
      evidence:
        "Mapping mutation, registry preparation, command creation, and real execution must remain separate gated steps.",
      requiredBefore: "execution",
    }),
  ];

  const operatorApprovalPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "current_approval_exists",
      label: "Current approval exists",
      status: args.approvalFound ? "pass" : "fail",
      blocking: !args.approvalFound,
      evidence: args.approvalFound
        ? "Operator approval record exists."
        : "Operator approval record is missing.",
      requiredBefore: "review",
    }),
    buildPreflightCheckItem({
      id: "current_approval_scope_is_dry_run_only",
      label: "Current approval scope is dry-run/draft only",
      status: "pass",
      blocking: false,
      evidence:
        "Current approval is treated as valid for draft/dry-run review only, not mutation or real-run.",
      requiredBefore: "review",
    }),
    buildPreflightCheckItem({
      id: "fresh_approval_required_for_mutation",
      label: "Fresh approval required for mutation",
      status: "fail",
      blocking: true,
      evidence:
        "No fresh operator approval for Tool_Key / Tool_Mode mutation is present.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "fresh_approval_required_for_real_run",
      label: "Fresh approval required for real-run",
      status: "fail",
      blocking: true,
      evidence:
        "No fresh operator approval for non-dry-run execution is present.",
      requiredBefore: "execution",
    }),
  ];

  const rollbackPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "rollback_path_defined",
      label: "Rollback path defined",
      status: rollbackSequenceListed ? "warning" : "fail",
      blocking: true,
      evidence: rollbackSequenceListed
        ? "Rollback sequence is listed in V5.34 but not operationally validated."
        : "Rollback sequence is missing.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "original_command_preserved",
      label: "Original Command preserved",
      status: originalCommandPreserved ? "pass" : "fail",
      blocking: !originalCommandPreserved,
      evidence:
        "Current route is read-only, so original Command is preserved.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "run_draft_evidence_preserved",
      label: "Run Draft evidence preserved",
      status: runDraftEvidencePreserved ? "pass" : "fail",
      blocking: !runDraftEvidencePreserved,
      evidence:
        "Current route reads Run Draft only and does not mutate it.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "worker_run_evidence_preserved",
      label: "Worker run evidence preserved",
      status: workerRunEvidencePreserved ? "pass" : "fail",
      blocking: !workerRunEvidencePreserved,
      evidence:
        "Worker run evidence is read from persisted System_Runs record only.",
      requiredBefore: "mutation",
    }),
    buildPreflightCheckItem({
      id: "revert_tool_mapping_strategy_defined",
      label: "Revert Tool_Key / Tool_Mode strategy defined",
      status: rollbackValidated ? "pass" : "warning",
      blocking: true,
      evidence:
        "Rollback strategy is described but not validated by an executable rollback procedure.",
      requiredBefore: "mutation",
    }),
  ];

  const executionPreflight: PreflightCheckItem[] = [
    buildPreflightCheckItem({
      id: "worker_dry_run_evidence_exists",
      label: "Worker dry-run evidence exists",
      status: workerDryRunEvidenceExists ? "pass" : "fail",
      blocking: !workerDryRunEvidenceExists,
      evidence: `worker_response_exists=${args.reviewCheck.worker_response_exists}, worker_ok=${args.workerDryRunResult.ok}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "worker_scanned_command",
      label: "Worker scanned command",
      status: workerScannedCommand ? "pass" : "fail",
      blocking: !workerScannedCommand,
      evidence: `scanned=${args.workerDryRunResult.scanned}, command_seen=${args.reviewCheck.worker_command_record_seen}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "worker_returned_unsupported",
      label: "Worker returned unsupported",
      status: workerReturnedUnsupported ? "fail" : "pass",
      blocking: workerReturnedUnsupported,
      evidence: `unsupported=${args.workerDryRunResult.unsupported}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "command_status_select_unsupported",
      label: "Command Status_select is Unsupported",
      status: commandIsUnsupported ? "fail" : "pass",
      blocking: commandIsUnsupported,
      evidence: `Status_select=${commandStatusSelect || "unknown"}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping ready for real-run",
      status: routerMappingReady ? "pass" : "fail",
      blocking: true,
      evidence: `router_mapping_ready_for_real_run=${routerMappingReady}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "target_capability_selected",
      label: "Target capability selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: true,
      evidence: `selected_target_capability=${
        args.targetCapabilityDecisionMatrix.selected_target_capability || "null"
      }.`,
      requiredBefore: "command_creation",
    }),
    buildPreflightCheckItem({
      id: "real_run_allowed",
      label: "Real-run allowed",
      status: realRunAllowed ? "pass" : "fail",
      blocking: true,
      evidence: `real_run_allowed=${realRunAllowed}.`,
      requiredBefore: "execution",
    }),
    buildPreflightCheckItem({
      id: "execution_forbidden_from_this_route",
      label: "Execution is forbidden from this route",
      status: "pass",
      blocking: false,
      evidence:
        "This route is GET/read-only and cannot execute worker runs or create commands.",
      requiredBefore: "execution",
    }),
  ];

  const checklistSummary = summarizePreflightChecks([
    mappingMutationPreflight,
    registryPreflight,
    payloadSchemaPreflight,
    promotionPolicyPreflight,
    operatorApprovalPreflight,
    rollbackPreflight,
    executionPreflight,
  ]);

  const blockers = Array.from(
    new Set(
      [
        ...mappingMutationPreflight,
        ...registryPreflight,
        ...payloadSchemaPreflight,
        ...promotionPolicyPreflight,
        ...operatorApprovalPreflight,
        ...rollbackPreflight,
        ...executionPreflight,
      ]
        .filter((check) => check.blocking && check.status === "fail")
        .map((check) => `${check.label}: ${check.evidence}`)
    )
  );

  const warnings = Array.from(
    new Set(
      [
        ...mappingMutationPreflight,
        ...registryPreflight,
        ...payloadSchemaPreflight,
        ...promotionPolicyPreflight,
        ...operatorApprovalPreflight,
        ...rollbackPreflight,
        ...executionPreflight,
      ]
        .filter((check) => check.status === "warning")
        .map((check) => `${check.label}: ${check.evidence}`)
    )
  );

  let preflightStatus:
    | "PREFLIGHT_DRAFT_ONLY"
    | "PREFLIGHT_BLOCKED_LOW_CONFIDENCE_MAPPING"
    | "PREFLIGHT_BLOCKED_TOOL_MAPPING"
    | "PREFLIGHT_BLOCKED_REGISTRY"
    | "PREFLIGHT_BLOCKED_PAYLOAD_SCHEMA"
    | "PREFLIGHT_BLOCKED_PROMOTION_POLICY"
    | "PREFLIGHT_BLOCKED_OPERATOR_APPROVAL"
    | "PREFLIGHT_BLOCKED_ROLLBACK"
    | "PREFLIGHT_READY_FOR_HUMAN_REVIEW_ONLY"
    | "UNKNOWN_PREFLIGHT_STATUS" = "UNKNOWN_PREFLIGHT_STATUS";

  if (proposalConfidence === "low" || proposalConfidence === "unknown") {
    preflightStatus = "PREFLIGHT_BLOCKED_LOW_CONFIDENCE_MAPPING";
  } else if (!currentToolKey || !currentToolMode) {
    preflightStatus = "PREFLIGHT_BLOCKED_TOOL_MAPPING";
  } else if (!registryReady) {
    preflightStatus = "PREFLIGHT_BLOCKED_REGISTRY";
  } else if (!payloadSchemaValidated) {
    preflightStatus = "PREFLIGHT_BLOCKED_PAYLOAD_SCHEMA";
  } else if (!promotionAllowedNow) {
    preflightStatus = "PREFLIGHT_BLOCKED_PROMOTION_POLICY";
  } else if (!args.approvalFound) {
    preflightStatus = "PREFLIGHT_BLOCKED_OPERATOR_APPROVAL";
  } else if (!rollbackValidated) {
    preflightStatus = "PREFLIGHT_BLOCKED_ROLLBACK";
  } else {
    preflightStatus = "PREFLIGHT_READY_FOR_HUMAN_REVIEW_ONLY";
  }

  return {
    available: true,
    checklist_version: "V5.35_MAPPING_PREFLIGHT_CHECKLIST",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,

    preflight_status: preflightStatus,
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

    blockers,
    warnings,
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
  toolMappingProposalDraft: {
    available?: boolean;
    proposal?: {
      proposed_tool_key?: string | null;
      proposed_tool_mode?: "review_only" | "dry_run_only" | "router_only" | null;
      proposed_target_capability?: string | null;
      proposal_confidence?: "high" | "medium" | "low" | "unknown";
      proposal_ready_to_apply?: boolean;
      proposal_apply_allowed?: boolean;
    };
  };
  controlledMappingPlan: {
    available?: boolean;
    plan_status?: string;
    plan_ready_for_mutation?: boolean;
    plan_ready_for_execution?: boolean;
    proposed_mapping?: {
      source_capability?: string;
      proposed_tool_key?: string | null;
      proposed_tool_mode?: "review_only" | "dry_run_only" | "router_only" | null;
      proposed_target_capability?: string | null;
      proposal_confidence?: "high" | "medium" | "low" | "unknown";
      apply_allowed_now?: boolean;
    };
  };
  mappingPreflightChecklist: {
    available?: boolean;
    preflight_status?: string;
    preflight_ready_for_mapping_mutation?: boolean;
    preflight_ready_for_registry_mutation?: boolean;
    preflight_ready_for_command_creation?: boolean;
    preflight_ready_for_execution?: boolean;
    real_run_allowed?: boolean;
    checklist_summary?: {
      blocking_checks?: number;
    };
    blockers?: string[];
  };
  toolcatalogRegistryReadiness: {
    registry_ready_for_real_run?: boolean;
  };
  executionMappingContractDraft: {
    payload_contract?: {
      payload_schema_validated?: boolean;
    };
    promotion_contract?: {
      promotion_ready?: boolean;
      real_run_allowed?: boolean;
    };
  };
}) {
  const checklistAvailable = args.mappingPreflightChecklist.available === true;
  const planAvailable = args.controlledMappingPlan.available === true;

  const preflightStatus =
    args.mappingPreflightChecklist.preflight_status ||
    "UNKNOWN_PREFLIGHT_STATUS";

  const proposalConfidence = normalizeProposalConfidence(
    args.controlledMappingPlan.proposed_mapping?.proposal_confidence ||
      args.toolMappingProposalDraft.proposal?.proposal_confidence ||
      "unknown"
  );

  const sourceCapability =
    args.controlledMappingPlan.proposed_mapping?.source_capability ||
    "command_orchestrator";

  const proposedTargetCapability =
    args.controlledMappingPlan.proposed_mapping?.proposed_target_capability ||
    args.toolMappingProposalDraft.proposal?.proposed_target_capability ||
    null;

  const mappingCandidate = proposedTargetCapability
    ? `${sourceCapability} -> ${proposedTargetCapability}`
    : null;

  const blockingChecks =
    args.mappingPreflightChecklist.checklist_summary?.blocking_checks ?? 0;

  const registryReady =
    args.toolcatalogRegistryReadiness.registry_ready_for_real_run === true;

  const payloadSchemaValidated =
    args.executionMappingContractDraft.payload_contract
      ?.payload_schema_validated === true;

  const promotionReady =
    args.executionMappingContractDraft.promotion_contract?.promotion_ready ===
    true;

  const rollbackValidated = false;
  const realRunAllowed = false;

  const canReviewMapping = checklistAvailable;
  const canApproveReviewOnly = checklistAvailable && planAvailable;
  const canApproveMappingMutation = false;
  const canApproveRegistryMutation = false;
  const canApproveCommandCreation = false;
  const canApproveRealRun = false;

  let gateStatus:
    | "HUMAN_REVIEW_REQUIRED"
    | "HUMAN_REVIEW_ALLOWED_FOR_REVIEW_ONLY"
    | "HUMAN_REVIEW_BLOCKED_BY_LOW_CONFIDENCE"
    | "HUMAN_REVIEW_BLOCKED_BY_PREFLIGHT_FAILURES"
    | "HUMAN_REVIEW_BLOCKED_BY_REGISTRY"
    | "HUMAN_REVIEW_BLOCKED_BY_PAYLOAD_SCHEMA"
    | "HUMAN_REVIEW_BLOCKED_BY_PROMOTION_POLICY"
    | "HUMAN_REVIEW_BLOCKED_BY_ROLLBACK"
    | "HUMAN_REVIEW_READY_FOR_MUTATION_APPROVAL"
    | "UNKNOWN_HUMAN_REVIEW_GATE" = "UNKNOWN_HUMAN_REVIEW_GATE";

  if (proposalConfidence === "low" || proposalConfidence === "unknown") {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_LOW_CONFIDENCE";
  } else if (blockingChecks > 0) {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_PREFLIGHT_FAILURES";
  } else if (!registryReady) {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_REGISTRY";
  } else if (!payloadSchemaValidated) {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_PAYLOAD_SCHEMA";
  } else if (!promotionReady) {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_PROMOTION_POLICY";
  } else if (!rollbackValidated) {
    gateStatus = "HUMAN_REVIEW_BLOCKED_BY_ROLLBACK";
  } else if (canApproveMappingMutation) {
    gateStatus = "HUMAN_REVIEW_READY_FOR_MUTATION_APPROVAL";
  } else if (canApproveReviewOnly) {
    gateStatus = "HUMAN_REVIEW_ALLOWED_FOR_REVIEW_ONLY";
  } else if (canReviewMapping) {
    gateStatus = "HUMAN_REVIEW_REQUIRED";
  }

  const blockers = Array.from(
    new Set([
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
    ])
  );

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

    gate_status: gateStatus,

    review_scope: {
      can_review_mapping: canReviewMapping,
      can_approve_review_only: canApproveReviewOnly,
      can_approve_mapping_mutation: canApproveMappingMutation,
      can_approve_registry_mutation: canApproveRegistryMutation,
      can_approve_command_creation: canApproveCommandCreation,
      can_approve_real_run: canApproveRealRun,
    },

    proposed_review_decision: {
      mapping_candidate: mappingCandidate,
      recommendation:
        "Human review should evaluate the low-confidence mapping candidate, but must not approve mutation or execution yet.",
      confidence: proposalConfidence,
      human_review_required: true,
      approval_allowed_now: false,
      approval_scope_allowed_now: canApproveReviewOnly ? "review_only" : "none",
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
      preflight_status: preflightStatus,
      proposal_confidence: proposalConfidence,
      blockers_count: blockers.length,
      blocking_checks: blockingChecks,
      registry_ready: registryReady,
      payload_schema_validated: payloadSchemaValidated,
      promotion_ready: promotionReady,
      rollback_validated: rollbackValidated,
      real_run_allowed: realRunAllowed,
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

function buildOperatorDecisionDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  commandFields: JsonRecord;
  commandStatus: string;
  commandStatusSelect: string;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
}) {
  const humanGateStatus = pickString(args.humanReviewGate, ["gate_status"]);

  const mappingCandidate =
    pickString(args.humanReviewGate, [
      "proposed_review_decision.mapping_candidate",
    ]) ||
    `${pickString(args.toolMappingProposalDraft, [
      "source.capability",
    ], "command_orchestrator")} -> ${pickString(args.toolMappingProposalDraft, [
      "proposal.proposed_target_capability",
    ], "incident_router")}`;

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.humanReviewGate, [
      "proposed_review_decision.confidence",
    ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ]) ||
      pickString(args.controlledMappingPlan, [
        "proposed_mapping.proposal_confidence",
      ])
  );

  const preflightStatus = pickString(args.mappingPreflightChecklist, [
    "preflight_status",
  ]);

  const currentTargetMode = stringField(args.commandFields, [
    "Target_Mode",
    "target_mode",
    "targetMode",
  ]);

  const preflightReadyForMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const registryReady = pickBoolean(args.toolcatalogRegistryReadiness, [
    "registry_ready_for_real_run",
  ]);

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"]);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]);

  const rollbackValidated = false;

  let draftStatus:
    | "OPERATOR_DECISION_DRAFT_READY_REVIEW_ONLY"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_LOW_CONFIDENCE"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_PREFLIGHT"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_REGISTRY"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_PAYLOAD_SCHEMA"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_PROMOTION_POLICY"
    | "OPERATOR_DECISION_DRAFT_BLOCKED_ROLLBACK"
    | "OPERATOR_DECISION_DRAFT_UNKNOWN" = "OPERATOR_DECISION_DRAFT_UNKNOWN";

  if (proposalConfidence === "low" || proposalConfidence === "unknown") {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_LOW_CONFIDENCE";
  } else if (!preflightReadyForMutation) {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_PREFLIGHT";
  } else if (!registryReady) {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_REGISTRY";
  } else if (!payloadSchemaValidated) {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_PAYLOAD_SCHEMA";
  } else if (!promotionReady) {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_PROMOTION_POLICY";
  } else if (!rollbackValidated) {
    draftStatus = "OPERATOR_DECISION_DRAFT_BLOCKED_ROLLBACK";
  } else {
    draftStatus = "OPERATOR_DECISION_DRAFT_READY_REVIEW_ONLY";
  }

  const blockers = [
    "Mapping proposal confidence is low.",
    "Mapping preflight is not ready for mutation.",
    "Registry readiness is false.",
    "Payload schema is not validated.",
    "Promotion policy is not ready.",
    "Rollback is not operationally validated.",
    "Unsupported classification remains active.",
    "Current approval is draft/dry-run only.",
    "Fresh approval is required before any mutation.",
    "Fresh approval is required before real-run.",
  ];

  const warnings = [
    "Operator decision draft is review-only and does not create an Operator_Approval record.",
    "Allowed options can guide human review, but cannot authorize mutation or execution from this route.",
  ];

  const allowedDecisionOptions = [
    {
      option_id: "REVIEW_MAPPING_ONLY",
      label: "Review mapping only",
      description:
        "Operator can discuss and analyze the mapping candidate without approving mutation.",
      allowed_now: true,
      scope: "review_only",
      requires_fresh_approval: false,
      blocked_by: [],
    },
    {
      option_id: "REJECT_MAPPING_CANDIDATE",
      label: "Reject mapping candidate",
      description:
        "Operator can reject the incident_router candidate without mutating Airtable.",
      allowed_now: true,
      scope: "review_only",
      requires_fresh_approval: false,
      blocked_by: [],
    },
    {
      option_id: "REQUEST_MAPPING_REFINEMENT",
      label: "Request mapping refinement",
      description:
        "Operator can request more evidence or a better mapping candidate before mutation.",
      allowed_now: true,
      scope: "review_only",
      requires_fresh_approval: false,
      blocked_by: [],
    },
  ];

  const rejectedDecisionOptions = [
    {
      option_id: "APPROVE_TOOL_MAPPING_MUTATION",
      label: "Approve Tool_Key / Tool_Mode mutation",
      reason:
        "Proposal confidence is low and preflight mutation is not ready.",
      blocked_by: [
        "proposal_confidence_low",
        "preflight_ready_for_mapping_mutation_false",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      option_id: "APPROVE_REGISTRY_MUTATION",
      label: "Approve registry mutation",
      reason:
        "Registry is not ready and no fresh mutation approval exists.",
      blocked_by: [
        "registry_ready_false",
        "toolcatalog_entry_missing",
        "workspace_capability_entry_missing",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      option_id: "APPROVE_COMMAND_CREATION",
      label: "Approve command creation",
      reason:
        "Target capability is not selected with enough confidence.",
      blocked_by: [
        "target_capability_not_selected",
        "proposal_confidence_low",
        "command_creation_preflight_false",
      ],
    },
    {
      option_id: "APPROVE_REAL_RUN",
      label: "Approve real-run",
      reason:
        "Real-run is forbidden, unsupported remains active, payload schema and rollback are not validated.",
      blocked_by: [
        "real_run_forbidden",
        "unsupported_active",
        "payload_schema_not_validated",
        "rollback_not_validated",
        "fresh_real_run_approval_missing",
      ],
    },
  ];

  return {
    available: true,
    draft_version: "V5.37_OPERATOR_DECISION_DRAFT",
    command_record_id: args.commandRecordId,
    command_id: args.commandId,
    workspace_id: args.workspaceId,

    draft_status: draftStatus,

    decision_context: {
      human_gate_status: humanGateStatus || null,
      mapping_candidate: mappingCandidate || null,
      proposal_confidence: proposalConfidence,
      preflight_status: preflightStatus || null,
      current_command_status: args.commandStatus || null,
      current_command_status_select: args.commandStatusSelect || null,
      current_target_mode: currentTargetMode || null,
      unsupported_active: unsupportedActive,
      real_run_allowed: realRunAllowed,
    },

    proposed_operator_decision: {
      decision_type: "REQUEST_MAPPING_REVIEW",
      decision_label: "Review mapping candidate only",
      decision_summary:
        "Operator should review the low-confidence command_orchestrator -> incident_router mapping candidate, but must not approve mutation or real-run yet.",
      recommended: true,
      confidence: proposalConfidence,
      applies_to_mapping: true,
      applies_to_mutation: false,
      applies_to_real_run: false,
    },

    allowed_decision_options: allowedDecisionOptions,

    rejected_decision_options: rejectedDecisionOptions,

    decision_boundaries: {
      creates_approval: false,
      mutates_command: false,
      mutates_registry: false,
      creates_command: false,
      calls_worker: false,
      allows_real_run: false,
      approval_scope_allowed_now: "review_only",
    },

    required_before_final_operator_decision: [
      "confirm whether incident_router is the correct target capability",
      "confirm whether command_orchestrator should route instead of execute directly",
      "decide whether to accept, reject, or refine the mapping candidate",
      "decide what evidence is required to upgrade confidence",
      "confirm no mutation is requested now",
      "confirm real-run remains forbidden",
    ],

    required_before_mapping_mutation: [
      "improve mapping confidence to medium or high",
      "define Tool_Key",
      "define Tool_Mode",
      "define target capability explicitly",
      "define ToolCatalog entry",
      "define Workspace_Capabilities entry",
      "validate payload schema",
      "validate rollback strategy",
      "create fresh operator approval for mutation",
      "use a separate gated mutation endpoint or manual controlled update",
    ],

    required_before_real_run: [
      "mapping mutation completed and rechecked",
      "registry ready",
      "router mapping ready",
      "target capability selected",
      "payload schema validated",
      "dry-run repeated successfully after mapping",
      "unsupported resolved",
      "promotion policy approved",
      "rollback/cancel path validated",
      "fresh real-run approval",
      "real-run feature gate explicitly opened in separate server-side route",
    ],

    blockers,
    warnings,

    next_safe_action:
      "Use this draft to guide review-only operator decision: accept review discussion, reject the mapping candidate, or request refinement. Do not approve mutation, registry changes, command creation, or real-run from this route.",

    guardrail_interpretation:
      "V5.37 is an operator decision draft only. It does not create approvals, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

function buildOperatorDecisionReviewSummary(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: {
    http_status: number | null;
    ok: boolean;
    scanned: number;
    executed: number;
    unsupported: number;
    errors_count: number;
    commands_record_ids: string[];
  };
}) {
  const draftStatus = pickString(args.operatorDecisionDraft, ["draft_status"]);

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.operatorDecisionDraft, [
      "decision_context.proposal_confidence",
    ]) ||
      pickString(args.humanReviewGate, [
        "proposed_review_decision.confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ]) ||
      pickString(args.controlledMappingPlan, [
        "proposed_mapping.proposal_confidence",
      ])
  );

  const mappingCandidate =
    pickString(args.operatorDecisionDraft, [
      "decision_context.mapping_candidate",
    ]) ||
    pickString(args.humanReviewGate, [
      "proposed_review_decision.mapping_candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const recommendedDecisionType =
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) || "REQUEST_MAPPING_REVIEW";

  const recommendedDecisionLabel =
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_label",
    ]) || "Review mapping candidate only";

  const preflightReadyForMappingMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const unsupportedActive =
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]);

  const targetCapabilitySelected =
    pickBoolean(args.targetCapabilityDecisionMatrix, ["decision_ready"]) &&
    Boolean(
      pickString(args.targetCapabilityDecisionMatrix, [
        "selected_target_capability",
      ])
    );

  const proposedToolKey =
    pickString(args.toolMappingProposalDraft, [
      "proposal.proposed_tool_key",
    ]) ||
    pickString(args.controlledMappingPlan, [
      "proposed_mapping.proposed_tool_key",
    ]) ||
    null;

  const proposedToolMode =
    pickString(args.toolMappingProposalDraft, [
      "proposal.proposed_tool_mode",
    ]) ||
    pickString(args.controlledMappingPlan, [
      "proposed_mapping.proposed_tool_mode",
    ]) ||
    null;

  const allowedDecisionOptions = pickArray<JsonRecord>(
    args.operatorDecisionDraft,
    ["allowed_decision_options"]
  );

  const rejectedDecisionOptions = pickArray<JsonRecord>(
    args.operatorDecisionDraft,
    ["rejected_decision_options"]
  );

  const hasAllowedOption = (optionId: string): boolean =>
    allowedDecisionOptions.some((option) => {
      return (
        pickString(option, ["option_id"]) === optionId &&
        pickBoolean(option, ["allowed_now"], false)
      );
    });

  const allowedNow =
    allowedDecisionOptions.length > 0
      ? allowedDecisionOptions
          .filter((option) => pickBoolean(option, ["allowed_now"], false))
          .map((option) => {
            const optionId = pickString(option, ["option_id"], "UNKNOWN_OPTION");
            const label = pickString(option, ["label"], optionId);
            return `${optionId}: ${label}`;
          })
      : [
          "REVIEW_MAPPING_ONLY: Review mapping only",
          "REJECT_MAPPING_CANDIDATE: Reject mapping candidate",
          "REQUEST_MAPPING_REFINEMENT: Request mapping refinement",
        ];

  const forbiddenNow =
    rejectedDecisionOptions.length > 0
      ? rejectedDecisionOptions.map((option) => {
          const optionId = pickString(option, ["option_id"], "UNKNOWN_OPTION");
          const label = pickString(option, ["label"], optionId);
          const reason = pickString(option, ["reason"], "Blocked by current guardrails.");
          return `${optionId}: ${label} — ${reason}`;
        })
      : [
          "APPROVE_TOOL_MAPPING_MUTATION: forbidden until mapping confidence and preflight are ready.",
          "APPROVE_REGISTRY_MUTATION: forbidden until registry design and fresh approval exist.",
          "APPROVE_COMMAND_CREATION: forbidden until target capability is explicitly selected.",
          "APPROVE_REAL_RUN: forbidden while unsupported, schema, promotion, rollback, and approval remain unresolved.",
        ];

  const requiredBeforeMutation =
    pickArray<string>(args.operatorDecisionDraft, [
      "required_before_mapping_mutation",
    ]).length > 0
      ? pickArray<string>(args.operatorDecisionDraft, [
          "required_before_mapping_mutation",
        ])
      : [
          "improve mapping confidence to medium or high",
          "define Tool_Key",
          "define Tool_Mode",
          "define target capability explicitly",
          "define ToolCatalog entry",
          "define Workspace_Capabilities entry",
          "validate payload schema",
          "validate rollback strategy",
          "create fresh operator approval for mutation",
          "use a separate gated mutation endpoint or manual controlled update",
        ];

  const requiredBeforeRealRun =
    pickArray<string>(args.operatorDecisionDraft, [
      "required_before_real_run",
    ]).length > 0
      ? pickArray<string>(args.operatorDecisionDraft, [
          "required_before_real_run",
        ])
      : [
          "mapping mutation completed and rechecked",
          "registry ready",
          "router mapping ready",
          "target capability selected",
          "payload schema validated",
          "dry-run repeated successfully after mapping",
          "unsupported resolved",
          "promotion policy approved",
          "rollback/cancel path validated",
          "fresh real-run approval",
          "real-run feature gate explicitly opened in separate server-side route",
        ];

  const operatorReviewQuestions =
    pickArray<string>(args.humanReviewGate, [
      "human_questions_to_answer",
    ]).length > 0
      ? pickArray<string>(args.humanReviewGate, [
          "human_questions_to_answer",
        ])
      : [
          "Is incident_router the correct target capability for command_orchestrator?",
          "Should command_orchestrator route instead of execute directly?",
          "What evidence is required to upgrade mapping confidence?",
          "What exact Tool_Key and Tool_Mode should be used later?",
          "What rollback path is acceptable before mutation or real-run?",
        ];

  const totalBlockingChecks = pickNumber(args.mappingPreflightChecklist, [
    "checklist_summary.blocking_checks",
  ]);

  const preflightBlockers = pickArray<string>(args.mappingPreflightChecklist, [
    "blockers",
  ]);

  const draftBlockers = pickArray<string>(args.operatorDecisionDraft, [
    "blockers",
  ]);

  const topBlockers =
    preflightBlockers.length > 0
      ? preflightBlockers.slice(0, 8)
      : draftBlockers.slice(0, 8);

  const mutationBlocked =
    !preflightReadyForMappingMutation ||
    proposalConfidence === "low" ||
    proposalConfidence === "unknown";

  const registryBlocked = !registryReadyForRealRun;

  const commandCreationBlocked =
    !pickBoolean(args.mappingPreflightChecklist, [
      "preflight_ready_for_command_creation",
    ]) || !targetCapabilitySelected;

  const executionBlocked =
    !pickBoolean(args.mappingPreflightChecklist, [
      "preflight_ready_for_execution",
    ]) ||
    !realRunAllowed ||
    unsupportedActive;

  const dryRunTransportValidated = args.workerDryRunResult.http_status === 200;
  const workerResponseValidated =
    args.workerDryRunResult.http_status === 200 &&
    args.workerDryRunResult.ok === true;
  const commandRecordSeen = args.commandRecordId
    ? args.workerDryRunResult.commands_record_ids.includes(args.commandRecordId)
    : false;
  const unsupportedConfirmed =
    args.workerDryRunResult.unsupported >= 1 &&
    args.workerDryRunResult.executed === 0 &&
    args.workerDryRunResult.errors_count === 0;
  const noExecutionPerformed = args.workerDryRunResult.executed === 0;
  const noMutationPerformed = true;

  let reviewStatus:
    | "OPERATOR_REVIEW_SUMMARY_BLOCKED_LOW_CONFIDENCE"
    | "OPERATOR_REVIEW_SUMMARY_BLOCKED_PREFLIGHT"
    | "OPERATOR_REVIEW_SUMMARY_BLOCKED_REGISTRY"
    | "OPERATOR_REVIEW_SUMMARY_BLOCKED_REAL_RUN"
    | "OPERATOR_REVIEW_SUMMARY_READY_REVIEW_ONLY"
    | "OPERATOR_REVIEW_SUMMARY_UNKNOWN" = "OPERATOR_REVIEW_SUMMARY_UNKNOWN";

  if (
    draftStatus === "OPERATOR_DECISION_DRAFT_BLOCKED_LOW_CONFIDENCE" ||
    proposalConfidence === "low" ||
    proposalConfidence === "unknown"
  ) {
    reviewStatus = "OPERATOR_REVIEW_SUMMARY_BLOCKED_LOW_CONFIDENCE";
  } else if (!preflightReadyForMappingMutation) {
    reviewStatus = "OPERATOR_REVIEW_SUMMARY_BLOCKED_PREFLIGHT";
  } else if (!registryReadyForRealRun) {
    reviewStatus = "OPERATOR_REVIEW_SUMMARY_BLOCKED_REGISTRY";
  } else if (!realRunAllowed || unsupportedActive) {
    reviewStatus = "OPERATOR_REVIEW_SUMMARY_BLOCKED_REAL_RUN";
  } else {
    reviewStatus = "OPERATOR_REVIEW_SUMMARY_READY_REVIEW_ONLY";
  }

  return {
    available: true,
    summary_version: "V5.38_OPERATOR_DECISION_REVIEW_SUMMARY",
    review_status: reviewStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    executive_summary: {
      title: "Operator review summary",
      short_summary:
        "Dry-run evidence is valid, the Worker saw the Command, and no execution was performed. The system proposes review-only discussion of the command_orchestrator -> incident_router mapping candidate.",
      system_position:
        "The system is ready for operator review only. It is not ready for Tool_Key / Tool_Mode mutation, registry mutation, command creation, or real execution.",
      real_run_position:
        "Real-run remains forbidden because unsupported is still active, registry readiness is false, payload schema is not validated, promotion policy is missing, rollback is not validated, and no fresh real-run approval exists.",
      confidence_position:
        proposalConfidence === "low" || proposalConfidence === "unknown"
          ? "Mapping confidence is too low for mutation. Human review may accept discussion, reject the candidate, or request refinement only."
          : "Mapping confidence is not sufficient to bypass the remaining preflight, registry, payload, promotion, approval, and rollback blockers.",
    },

    proven_evidence: {
      dry_run_transport_validated: dryRunTransportValidated,
      worker_response_validated: workerResponseValidated,
      command_record_seen: commandRecordSeen,
      unsupported_confirmed: unsupportedConfirmed,
      no_execution_performed: noExecutionPerformed,
      no_mutation_performed: noMutationPerformed,
    },

    operator_decision_now: {
      recommended_decision_type: recommendedDecisionType,
      recommended_decision_label: recommendedDecisionLabel,
      recommended_scope: "review_only",
      recommended: true,
      can_accept_review_discussion: hasAllowedOption("REVIEW_MAPPING_ONLY"),
      can_reject_candidate: hasAllowedOption("REJECT_MAPPING_CANDIDATE"),
      can_request_refinement: hasAllowedOption("REQUEST_MAPPING_REFINEMENT"),
      can_approve_mutation: false,
      can_approve_real_run: false,
    },

    mapping_summary: {
      candidate: mappingCandidate,
      confidence: proposalConfidence,
      confidence_is_sufficient_for_mutation: false,
      target_capability_selected: targetCapabilitySelected,
      proposed_tool_key: proposedToolKey,
      proposed_tool_mode: proposedToolMode,
    },

    blockers_summary: {
      total_blocking_checks: totalBlockingChecks,
      top_blockers: topBlockers,
      mutation_blocked: mutationBlocked,
      registry_blocked: registryBlocked,
      command_creation_blocked: commandCreationBlocked,
      execution_blocked: executionBlocked,
    },

    allowed_now: allowedNow,

    forbidden_now: forbiddenNow,

    required_before_mutation: requiredBeforeMutation,

    required_before_real_run: requiredBeforeRealRun,

    operator_review_questions: operatorReviewQuestions,

    next_safe_action:
      "Run review-only human decision on the mapping candidate: accept discussion, reject command_orchestrator -> incident_router, or request refinement. Do not approve mutation, registry changes, command creation, or real-run from this route.",

    guardrail_interpretation:
      "V5.38 is an operator decision review summary only. It does not create approvals, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}
function buildReviewDecisionPersistenceDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  const reviewStatus = pickString(args.operatorDecisionReviewSummary, [
    "review_status",
  ]);

  const draftStatusFromDecision = pickString(args.operatorDecisionDraft, [
    "draft_status",
  ]);

  const mappingCandidate =
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "decision_context.mapping_candidate",
    ]) ||
    pickString(args.humanReviewGate, [
      "proposed_review_decision.mapping_candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.confidence",
    ]) ||
      pickString(args.operatorDecisionDraft, [
        "decision_context.proposal_confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ]) ||
      pickString(args.controlledMappingPlan, [
        "proposed_mapping.proposal_confidence",
      ])
  );

  const recommendedDecisionType =
    pickString(args.operatorDecisionReviewSummary, [
      "operator_decision_now.recommended_decision_type",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) ||
    "REQUEST_MAPPING_REVIEW";

  const preflightReadyForMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false) ||
    pickBoolean(args.operatorDecisionReviewSummary, [
      "operator_decision_now.can_approve_real_run",
    ]);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]);

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    reviewStatus === "OPERATOR_REVIEW_SUMMARY_BLOCKED_LOW_CONFIDENCE" ||
    draftStatusFromDecision === "OPERATOR_DECISION_DRAFT_BLOCKED_LOW_CONFIDENCE";

  let draftStatus:
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_LOW_CONFIDENCE"
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_PREFLIGHT"
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_REGISTRY"
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_REAL_RUN"
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_READY_REVIEW_ONLY"
    | "REVIEW_DECISION_PERSISTENCE_DRAFT_UNKNOWN" =
    "REVIEW_DECISION_PERSISTENCE_DRAFT_UNKNOWN";

  if (lowConfidence) {
    draftStatus = "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_LOW_CONFIDENCE";
  } else if (!preflightReadyForMutation) {
    draftStatus = "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_PREFLIGHT";
  } else if (!registryReadyForRealRun) {
    draftStatus = "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_REGISTRY";
  } else if (!realRunAllowed || unsupportedActive) {
    draftStatus = "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_REAL_RUN";
  } else {
    draftStatus = "REVIEW_DECISION_PERSISTENCE_DRAFT_READY_REVIEW_ONLY";
  }

  const approvalId = `review-decision-draft:v5.39:${args.workspaceId}:${args.incidentId}`;
  const idempotencyKey = `dashboard:v5.39:review-decision-persistence-draft:${args.workspaceId}:${args.incidentId}`;

  const requiredBeforePersistence = [
    "complete review-only human decision",
    "confirm mapping candidate scope",
    "confirm decision remains review_only",
    "confirm no mutation is requested",
    "confirm Operator_Approval creation is still disabled from this route",
    "confirm real-run remains forbidden",
  ];

  const requiredBeforeAnyMutationApproval = pickArray<string>(
    args.operatorDecisionDraft,
    ["required_before_mapping_mutation"]
  );

  const requiredBeforeRealRunApproval = pickArray<string>(
    args.operatorDecisionDraft,
    ["required_before_real_run"]
  );

  return {
    available: true,
    draft_version: "V5.39_REVIEW_DECISION_PERSISTENCE_DRAFT",
    draft_status: draftStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    persistence_intent: {
      target_table: "Operator_Approvals",
      target_action: "create_later",
      persistence_allowed_now: false,
      operator_approval_creation_allowed: false,
      mutation_allowed_now: false,
      read_only: true,
    },

    proposed_review_decision_record: {
      approval_id: approvalId,
      idempotency_key: idempotencyKey,
      workspace_id: args.workspaceId,
      incident_id: args.incidentId,
      command_id: args.commandId,
      command_record_id: args.commandRecordId,
      decision_type: recommendedDecisionType,
      decision_scope: "review_only",
      decision_status: "Draft",
      mapping_candidate: mappingCandidate,
      proposal_confidence: proposalConfidence,
      can_mutate: false,
      can_create_command: false,
      can_real_run: false,
      source_layer: "Incident Detail V5.39",
    },

    proposed_fields_for_future_persistence: {
      Workspace_ID: args.workspaceId,
      Incident_ID: args.incidentId,
      Command_ID: args.commandId,
      Command_Record_ID: args.commandRecordId,
      Decision_Type: recommendedDecisionType,
      Decision_Scope: "review_only",
      Decision_Status: "Draft",
      Mapping_Candidate: mappingCandidate,
      Proposal_Confidence: proposalConfidence,
      Review_Status: reviewStatus || null,
      Real_Run_Allowed: false,
      Mutation_Allowed: false,
      Source_Layer: "Incident Detail V5.39",
    },

    persistence_blockers: {
      low_confidence: lowConfidence,
      preflight_not_ready: !preflightReadyForMutation,
      registry_not_ready: !registryReadyForRealRun,
      payload_schema_not_validated: !payloadSchemaValidated,
      promotion_policy_missing: !promotionReady,
      rollback_not_validated: !rollbackValidated,
      unsupported_active: unsupportedActive,
      fresh_approval_missing: freshApprovalMissing,
    },

    allowed_to_persist_now: false,

    allowed_future_persistence_scope: ["review_only_decision_draft"],

    forbidden_persistence_scope: [
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
    ],

    required_before_persistence: requiredBeforePersistence,

    required_before_any_mutation_approval:
      requiredBeforeAnyMutationApproval.length > 0
        ? requiredBeforeAnyMutationApproval
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run_approval:
      requiredBeforeRealRunApproval.length > 0
        ? requiredBeforeRealRunApproval
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_operator_approval_created: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Keep this as a read-only persistence draft. Run human review of the mapping candidate before any future Operator_Approval creation path.",

    guardrail_interpretation:
      "V5.39 is a review decision persistence draft only. It does not create Operator_Approval records, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}
function buildReviewDecisionPersistencePreflight(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  type ReviewDecisionPersistencePreflightStatus =
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_LOW_CONFIDENCE"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_DRAFT_INVALID"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_SYSTEM_PREFLIGHT"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REGISTRY"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REAL_RUN"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_READY_REVIEW_ONLY"
    | "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_UNKNOWN";

  type ReviewDecisionPersistencePreflightCheck = {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    blocking: boolean;
    evidence: string;
  };

  const draftAvailable = pickBoolean(
    args.reviewDecisionPersistenceDraft,
    ["available"],
    false
  );

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const targetTable = pickString(args.reviewDecisionPersistenceDraft, [
    "persistence_intent.target_table",
  ]);

  const targetAction = pickString(args.reviewDecisionPersistenceDraft, [
    "persistence_intent.target_action",
  ]);

  const proposedRecord =
    pickRecord(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record",
    ]) ?? {};

  const proposedFields =
    pickRecord(args.reviewDecisionPersistenceDraft, [
      "proposed_fields_for_future_persistence",
    ]) ?? {};

  const approvalId = pickString(proposedRecord, ["approval_id"]);
  const idempotencyKey = pickString(proposedRecord, ["idempotency_key"]);

  const decisionType = pickString(proposedRecord, ["decision_type"]);
  const decisionScope = pickString(proposedRecord, ["decision_scope"]);
  const decisionStatus = pickString(proposedRecord, ["decision_status"]);

  const mappingCandidate =
    pickString(proposedRecord, ["mapping_candidate"]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposalConfidence = normalizeProposalConfidence(
    pickString(proposedRecord, ["proposal_confidence"]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.operatorDecisionDraft, [
        "decision_context.proposal_confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const sourceLayer =
    pickString(proposedRecord, ["source_layer"]) ||
    pickString(proposedFields, ["Source_Layer"]);

  const decisionTypeValid = decisionType === "REQUEST_MAPPING_REVIEW";
  const decisionScopeValid = decisionScope === "review_only";
  const decisionStatusValid = decisionStatus === "Draft";
  const mappingCandidatePresent = Boolean(mappingCandidate);
  const sourceLayerValid = sourceLayer === "Incident Detail V5.39";

  const proposalConfidenceSufficientForPersistence =
    proposalConfidence === "medium" || proposalConfidence === "high";

  const requiredFieldNames = [
    "Workspace_ID",
    "Incident_ID",
    "Command_ID",
    "Command_Record_ID",
    "Decision_Type",
    "Decision_Scope",
    "Decision_Status",
    "Mapping_Candidate",
    "Proposal_Confidence",
    "Review_Status",
    "Real_Run_Allowed",
    "Mutation_Allowed",
    "Source_Layer",
  ];

  const fieldIsPresent = (fieldName: string): boolean => {
    const value = proposedFields[fieldName];
    return value !== undefined && value !== null && value !== "";
  };

  const missingRequiredFields = requiredFieldNames.filter(
    (fieldName) => !fieldIsPresent(fieldName)
  );

  const requiredFieldsPresent = missingRequiredFields.length === 0;

  const mutationFieldsPresent = pickBoolean(
    proposedFields,
    ["Mutation_Allowed"],
    false
  );

  const realRunFieldsPresent = pickBoolean(
    proposedFields,
    ["Real_Run_Allowed"],
    false
  );

  const fieldsSafeForFutureReviewOnlyPersistence =
    requiredFieldsPresent &&
    decisionTypeValid &&
    decisionScopeValid &&
    decisionStatusValid &&
    !mutationFieldsPresent &&
    !realRunFieldsPresent;

  const reviewSummaryAvailable = pickBoolean(
    args.operatorDecisionReviewSummary,
    ["available"],
    false
  );

  const operatorDecisionDraftAvailable = pickBoolean(
    args.operatorDecisionDraft,
    ["available"],
    false
  );

  const humanReviewGateAvailable = pickBoolean(
    args.humanReviewGate,
    ["available"],
    false
  );

  const mappingPreflightAvailable = pickBoolean(
    args.mappingPreflightChecklist,
    ["available"],
    false
  );

  const dryRunEvidenceValidated =
    pickNumber(args.workerDryRunResult, ["http_status"], 0) === 200 &&
    pickBoolean(args.workerDryRunResult, ["ok"], false) === true;

  const workerCommandSeen = args.commandRecordId
    ? pickArray<string>(args.workerDryRunResult, [
        "commands_record_ids",
        "commandsrecordids",
        "commandsRecordIds",
      ]).includes(args.commandRecordId)
    : false;

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickNumber(args.workerDryRunResult, ["unsupported"], 0) >= 1 ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]);

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const targetCapabilitySelected = Boolean(
    pickString(args.targetCapabilityDecisionMatrix, [
      "selected_target_capability",
    ])
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionPolicyReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const preflightReadyForMappingMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    draftStatus === "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_LOW_CONFIDENCE";

  const draftInvalid =
    !draftAvailable ||
    targetTable !== "Operator_Approvals" ||
    targetAction !== "create_later" ||
    !approvalId ||
    !idempotencyKey ||
    !decisionTypeValid ||
    !decisionScopeValid ||
    !decisionStatusValid ||
    !mappingCandidatePresent ||
    !sourceLayerValid;

  const requiredFieldsMissing = !requiredFieldsPresent;

  let preflightStatus: ReviewDecisionPersistencePreflightStatus =
    "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_UNKNOWN";

  if (lowConfidence) {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_LOW_CONFIDENCE";
  } else if (draftInvalid || requiredFieldsMissing) {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_DRAFT_INVALID";
  } else if (!preflightReadyForMappingMutation) {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_SYSTEM_PREFLIGHT";
  } else if (!registryReadyForRealRun) {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REGISTRY";
  } else if (!realRunAllowed || unsupportedActive) {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REAL_RUN";
  } else {
    preflightStatus =
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_READY_REVIEW_ONLY";
  }

  const buildCheck = (
    id: string,
    label: string,
    status: "pass" | "warning" | "fail",
    blocking: boolean,
    evidence: string
  ): ReviewDecisionPersistencePreflightCheck => ({
    id,
    label,
    status,
    blocking,
    evidence,
  });

  const preflightChecks: ReviewDecisionPersistencePreflightCheck[] = [
    buildCheck(
      "persistence_draft_available",
      "Persistence draft is available",
      draftAvailable ? "pass" : "fail",
      !draftAvailable,
      `draft_available=${draftAvailable}.`
    ),
    buildCheck(
      "target_table_is_operator_approvals",
      "Target table is Operator_Approvals",
      targetTable === "Operator_Approvals" ? "pass" : "fail",
      targetTable !== "Operator_Approvals",
      `target_table=${targetTable || "null"}.`
    ),
    buildCheck(
      "target_action_is_create_later",
      "Target action is create_later",
      targetAction === "create_later" ? "pass" : "fail",
      targetAction !== "create_later",
      `target_action=${targetAction || "null"}.`
    ),
    buildCheck(
      "approval_id_present",
      "Approval ID is present",
      approvalId ? "pass" : "fail",
      !approvalId,
      approvalId ? `approval_id=${approvalId}.` : "approval_id is missing."
    ),
    buildCheck(
      "idempotency_key_present",
      "Idempotency key is present",
      idempotencyKey ? "pass" : "fail",
      !idempotencyKey,
      idempotencyKey
        ? `idempotency_key=${idempotencyKey}.`
        : "idempotency_key is missing."
    ),
    buildCheck(
      "decision_type_valid",
      "Decision type is valid",
      decisionTypeValid ? "pass" : "fail",
      !decisionTypeValid,
      `decision_type=${decisionType || "null"}. Expected REQUEST_MAPPING_REVIEW.`
    ),
    buildCheck(
      "decision_scope_valid",
      "Decision scope is review_only",
      decisionScopeValid ? "pass" : "fail",
      !decisionScopeValid,
      `decision_scope=${decisionScope || "null"}. Expected review_only.`
    ),
    buildCheck(
      "decision_status_valid",
      "Decision status is Draft",
      decisionStatusValid ? "pass" : "fail",
      !decisionStatusValid,
      `decision_status=${decisionStatus || "null"}. Expected Draft.`
    ),
    buildCheck(
      "mapping_candidate_present",
      "Mapping candidate is present",
      mappingCandidatePresent ? "pass" : "fail",
      !mappingCandidatePresent,
      mappingCandidatePresent
        ? `mapping_candidate=${mappingCandidate}.`
        : "mapping_candidate is missing."
    ),
    buildCheck(
      "proposal_confidence_sufficient_for_persistence",
      "Proposal confidence is sufficient for persistence",
      proposalConfidenceSufficientForPersistence ? "pass" : "fail",
      true,
      `proposal_confidence=${proposalConfidence}. Medium or high is required before future persistence.`
    ),
    buildCheck(
      "source_layer_valid",
      "Source layer is valid",
      sourceLayerValid ? "pass" : "fail",
      !sourceLayerValid,
      `source_layer=${sourceLayer || "null"}. Expected Incident Detail V5.39.`
    ),
    buildCheck(
      "required_fields_present",
      "Required fields are present",
      requiredFieldsPresent ? "pass" : "fail",
      !requiredFieldsPresent,
      requiredFieldsPresent
        ? "All required future persistence fields are present."
        : `Missing required fields: ${missingRequiredFields.join(", ")}.`
    ),
    buildCheck(
      "fields_safe_for_future_review_only_persistence",
      "Fields are safe for future review-only persistence",
      fieldsSafeForFutureReviewOnlyPersistence ? "pass" : "fail",
      !fieldsSafeForFutureReviewOnlyPersistence,
      `fields_safe_for_future_review_only_persistence=${fieldsSafeForFutureReviewOnlyPersistence}.`
    ),
    buildCheck(
      "allowed_to_persist_now_false",
      "Persistence is forbidden now",
      !pickBoolean(args.reviewDecisionPersistenceDraft, [
        "allowed_to_persist_now",
      ])
        ? "pass"
        : "fail",
      pickBoolean(args.reviewDecisionPersistenceDraft, [
        "allowed_to_persist_now",
      ]),
      `allowed_to_persist_now=${pickBoolean(
        args.reviewDecisionPersistenceDraft,
        ["allowed_to_persist_now"],
        false
      )}.`
    ),
    buildCheck(
      "operator_approval_creation_forbidden",
      "Operator approval creation is forbidden now",
      !pickBoolean(args.reviewDecisionPersistenceDraft, [
        "persistence_intent.operator_approval_creation_allowed",
      ])
        ? "pass"
        : "fail",
      pickBoolean(args.reviewDecisionPersistenceDraft, [
        "persistence_intent.operator_approval_creation_allowed",
      ]),
      `operator_approval_creation_allowed=${pickBoolean(
        args.reviewDecisionPersistenceDraft,
        ["persistence_intent.operator_approval_creation_allowed"],
        false
      )}.`
    ),
    buildCheck(
      "dry_run_evidence_validated",
      "Dry-run evidence is validated",
      dryRunEvidenceValidated ? "pass" : "fail",
      !dryRunEvidenceValidated,
      `http_status=${pickNumber(
        args.workerDryRunResult,
        ["http_status"],
        0
      )}, ok=${pickBoolean(args.workerDryRunResult, ["ok"], false)}.`
    ),
    buildCheck(
      "worker_command_seen",
      "Worker saw the Command record",
      workerCommandSeen ? "pass" : "fail",
      !workerCommandSeen,
      `worker_command_seen=${workerCommandSeen}.`
    ),
    buildCheck(
      "unsupported_active",
      "Unsupported classification remains active",
      unsupportedActive ? "fail" : "pass",
      unsupportedActive,
      `unsupported_active=${unsupportedActive}.`
    ),
    buildCheck(
      "registry_ready_for_real_run",
      "Registry ready for real-run",
      registryReadyForRealRun ? "pass" : "fail",
      true,
      `registry_ready_for_real_run=${registryReadyForRealRun}.`
    ),
    buildCheck(
      "router_mapping_ready_for_real_run",
      "Router mapping ready for real-run",
      routerMappingReadyForRealRun ? "pass" : "fail",
      true,
      `router_mapping_ready_for_real_run=${routerMappingReadyForRealRun}.`
    ),
    buildCheck(
      "target_capability_selected",
      "Target capability selected",
      targetCapabilitySelected ? "pass" : "fail",
      true,
      `target_capability_selected=${targetCapabilitySelected}.`
    ),
    buildCheck(
      "payload_schema_validated",
      "Payload schema validated",
      payloadSchemaValidated ? "pass" : "fail",
      true,
      `payload_schema_validated=${payloadSchemaValidated}.`
    ),
    buildCheck(
      "promotion_policy_ready",
      "Promotion policy ready",
      promotionPolicyReady ? "pass" : "fail",
      true,
      `promotion_policy_ready=${promotionPolicyReady}.`
    ),
    buildCheck(
      "rollback_validated",
      "Rollback validated",
      rollbackValidated ? "pass" : "fail",
      true,
      `rollback_validated=${rollbackValidated}.`
    ),
    buildCheck(
      "fresh_approval_available",
      "Fresh approval available",
      freshApprovalMissing ? "fail" : "pass",
      freshApprovalMissing,
      `fresh_approval_missing=${freshApprovalMissing}.`
    ),
  ];

  const preflightSummary = {
    total_checks: preflightChecks.length,
    passed_checks: preflightChecks.filter((check) => check.status === "pass")
      .length,
    warning_checks: preflightChecks.filter(
      (check) => check.status === "warning"
    ).length,
    failed_checks: preflightChecks.filter((check) => check.status === "fail")
      .length,
    blocking_checks: preflightChecks.filter(
      (check) => check.blocking && check.status === "fail"
    ).length,
  };

  const requiredBeforeOperatorApprovalCreation = pickArray<string>(
    args.reviewDecisionPersistenceDraft,
    ["required_before_persistence"]
  );

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionPersistenceDraft,
    ["required_before_any_mutation_approval"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionPersistenceDraft,
    ["required_before_real_run_approval"]
  );

  return {
    available: true,
    preflight_version: "V5.40_REVIEW_DECISION_PERSISTENCE_PREFLIGHT",
    preflight_status: preflightStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    target: {
      target_table: "Operator_Approvals",
      target_action: "create_later",
      target_action_allowed_now: false,
      read_only: true,
    },

    draft_validation: {
      draft_available: draftAvailable,
      draft_status: draftStatus || null,
      approval_id_present: Boolean(approvalId),
      idempotency_key_present: Boolean(idempotencyKey),
      decision_type: decisionType || null,
      decision_type_valid: decisionTypeValid,
      decision_scope: decisionScope || null,
      decision_scope_valid: decisionScopeValid,
      decision_status: decisionStatus || null,
      decision_status_valid: decisionStatusValid,
      mapping_candidate_present: mappingCandidatePresent,
      proposal_confidence: proposalConfidence,
      proposal_confidence_sufficient_for_persistence:
        proposalConfidenceSufficientForPersistence,
      source_layer_valid: sourceLayerValid,
    },

    proposed_field_validation: {
      required_fields_present: requiredFieldsPresent,
      missing_required_fields: missingRequiredFields,
      fields_safe_for_future_review_only_persistence:
        fieldsSafeForFutureReviewOnlyPersistence,
      mutation_fields_present: mutationFieldsPresent,
      real_run_fields_present: realRunFieldsPresent,
    },

    safety_preflight: {
      allowed_to_persist_now: false,
      operator_approval_creation_allowed: false,
      mutation_allowed_now: false,
      command_creation_allowed_now: false,
      real_run_allowed_now: false,
      worker_call_allowed_now: false,
      airtable_mutation_allowed_now: false,
    },

    dependency_preflight: {
      review_summary_available: reviewSummaryAvailable,
      operator_decision_draft_available: operatorDecisionDraftAvailable,
      human_review_gate_available: humanReviewGateAvailable,
      mapping_preflight_available: mappingPreflightAvailable,
      persistence_draft_available: draftAvailable,
      dry_run_evidence_validated: dryRunEvidenceValidated,
      worker_command_seen: workerCommandSeen,
      unsupported_active: unsupportedActive,
      registry_ready_for_real_run: registryReadyForRealRun,
      router_mapping_ready_for_real_run: routerMappingReadyForRealRun,
      target_capability_selected: targetCapabilitySelected,
      payload_schema_validated: payloadSchemaValidated,
      promotion_policy_ready: promotionPolicyReady,
    },

    blocker_flags: {
      low_confidence: lowConfidence,
      draft_invalid: draftInvalid,
      required_fields_missing: requiredFieldsMissing,
      preflight_not_ready: !preflightReadyForMappingMutation,
      registry_not_ready: !registryReadyForRealRun,
      router_mapping_not_ready: !routerMappingReadyForRealRun,
      target_capability_not_selected: !targetCapabilitySelected,
      payload_schema_not_validated: !payloadSchemaValidated,
      promotion_policy_missing: !promotionPolicyReady,
      rollback_not_validated: !rollbackValidated,
      unsupported_active: unsupportedActive,
      fresh_approval_missing: freshApprovalMissing,
    },

    preflight_checks: preflightChecks,

    preflight_summary: preflightSummary,

    allowed_now: ["review_only_preflight"],

    forbidden_now: [
      "operator_approval_creation",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
    ],

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : [
            "complete review-only human decision",
            "confirm mapping candidate scope",
            "confirm decision remains review_only",
            "confirm no mutation is requested",
            "confirm Operator_Approval creation is still disabled from this route",
            "confirm real-run remains forbidden",
          ],

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_operator_approval_created: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Keep this as a read-only preflight. Run human review of the mapping candidate before any future Operator_Approval creation path.",

    guardrail_interpretation:
      "V5.40 is a review decision persistence preflight only. It does not create Operator_Approval records, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}
function buildReviewDecisionPersistenceSchemaPreview(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  const draftRecord =
    pickRecord(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record",
    ]) ?? {};

  const proposedFields =
    pickRecord(args.reviewDecisionPersistenceDraft, [
      "proposed_fields_for_future_persistence",
    ]) ?? {};

  const preflightStatus = pickString(args.reviewDecisionPersistencePreflight, [
    "preflight_status",
  ]);

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const approvalId =
    pickString(draftRecord, ["approval_id"]) ||
    `review-decision-draft:v5.39:${args.workspaceId}:${args.incidentId}`;

  const idempotencyKey =
    pickString(draftRecord, ["idempotency_key"]) ||
    `dashboard:v5.39:review-decision-persistence-draft:${args.workspaceId}:${args.incidentId}`;

  const decisionType =
    pickString(draftRecord, ["decision_type"]) ||
    pickString(proposedFields, ["Decision_Type"]) ||
    "REQUEST_MAPPING_REVIEW";

  const decisionScope =
    pickString(draftRecord, ["decision_scope"]) ||
    pickString(proposedFields, ["Decision_Scope"]) ||
    "review_only";

  const decisionStatus =
    pickString(draftRecord, ["decision_status"]) ||
    pickString(proposedFields, ["Decision_Status"]) ||
    "Draft";

  const mappingCandidate =
    pickString(draftRecord, ["mapping_candidate"]) ||
    pickString(proposedFields, ["Mapping_Candidate"]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposalConfidence = normalizeProposalConfidence(
    pickString(draftRecord, ["proposal_confidence"]) ||
      pickString(proposedFields, ["Proposal_Confidence"]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.operatorDecisionDraft, [
        "decision_context.proposal_confidence",
      ])
  );

  const reviewStatus =
    pickString(proposedFields, ["Review_Status"]) ||
    pickString(args.operatorDecisionReviewSummary, ["review_status"]) ||
    null;

  const sourceLayer =
    pickString(draftRecord, ["source_layer"]) ||
    pickString(proposedFields, ["Source_Layer"]) ||
    "Incident Detail V5.39";

  const draftAvailable =
    args.reviewDecisionPersistenceDraft.available === true;

  const preflightAvailable =
    args.reviewDecisionPersistencePreflight.available === true;

  const targetTable =
    pickString(args.reviewDecisionPersistenceDraft, [
      "persistence_intent.target_table",
    ]) || "Operator_Approvals";

  const targetAction =
    pickString(args.reviewDecisionPersistenceDraft, [
      "persistence_intent.target_action",
    ]) || "create_later";

  const preflightReadyForMappingMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const operatorApprovalCreationAllowed = pickBoolean(
    args.reviewDecisionPersistencePreflight,
    ["safety_preflight.operator_approval_creation_allowed"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const mutationAllowed =
    pickBoolean(draftRecord, ["can_mutate"], false) ||
    pickBoolean(proposedFields, ["Mutation_Allowed"], false);

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const targetCapabilitySelected = pickBoolean(
    args.targetCapabilityDecisionMatrix,
    ["decision_ready"],
    false
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionPolicyReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]);

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_LOW_CONFIDENCE";

  function hasRequiredValue(value: unknown): boolean {
    if (value === undefined || value === null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    return true;
  }

  const requiredOperatorApprovalFields = [
    {
      field_name: "Approval_ID",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: approvalId,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.approval_id",
      safe_for_review_only: true,
    },
    {
      field_name: "Idempotency_Key",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: idempotencyKey,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.idempotency_key",
      safe_for_review_only: true,
    },
    {
      field_name: "Workspace_ID",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: args.workspaceId,
      source_path: "workspace_id",
      safe_for_review_only: true,
    },
    {
      field_name: "Incident_ID",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: args.incidentId,
      source_path: "incident_id",
      safe_for_review_only: true,
    },
    {
      field_name: "Command_ID",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: args.commandId,
      source_path: "command_id",
      safe_for_review_only: true,
    },
    {
      field_name: "Command_Record_ID",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: args.commandRecordId,
      source_path: "command_record_id",
      safe_for_review_only: true,
    },
    {
      field_name: "Decision_Type",
      field_type_hint: "single_select_or_text",
      required: true,
      proposed_value: decisionType,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.decision_type",
      safe_for_review_only: decisionType === "REQUEST_MAPPING_REVIEW",
    },
    {
      field_name: "Decision_Scope",
      field_type_hint: "single_select_or_text",
      required: true,
      proposed_value: decisionScope,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.decision_scope",
      safe_for_review_only: decisionScope === "review_only",
    },
    {
      field_name: "Decision_Status",
      field_type_hint: "single_select_or_text",
      required: true,
      proposed_value: decisionStatus,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.decision_status",
      safe_for_review_only: decisionStatus === "Draft",
    },
    {
      field_name: "Mapping_Candidate",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: mappingCandidate,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.mapping_candidate",
      safe_for_review_only: true,
    },
    {
      field_name: "Proposal_Confidence",
      field_type_hint: "single_select_or_text",
      required: true,
      proposed_value: proposalConfidence,
      source_path: "review_decision_persistence_draft.proposed_review_decision_record.proposal_confidence",
      safe_for_review_only: true,
    },
    {
      field_name: "Review_Status",
      field_type_hint: "single_select_or_text",
      required: true,
      proposed_value: reviewStatus,
      source_path: "operator_decision_review_summary.review_status",
      safe_for_review_only: true,
    },
    {
      field_name: "Real_Run_Allowed",
      field_type_hint: "checkbox",
      required: true,
      proposed_value: false,
      source_path: "review_decision_persistence_draft.proposed_fields_for_future_persistence.Real_Run_Allowed",
      safe_for_review_only: true,
    },
    {
      field_name: "Mutation_Allowed",
      field_type_hint: "checkbox",
      required: true,
      proposed_value: false,
      source_path: "review_decision_persistence_draft.proposed_fields_for_future_persistence.Mutation_Allowed",
      safe_for_review_only: true,
    },
    {
      field_name: "Source_Layer",
      field_type_hint: "single_line_text",
      required: true,
      proposed_value: "Incident Detail V5.41",
      source_path: "current_layer",
      safe_for_review_only: true,
    },
  ];

  const optionalOperatorApprovalFields = [
    {
      field_name: "Operator_Identity",
      field_type_hint: "single_line_text",
      required: false,
      proposed_value: "Arthur",
      source_path: "persisted_approval_snapshot.operator_identity",
      safe_for_review_only: true,
    },
    {
      field_name: "Approval_Status",
      field_type_hint: "single_select_or_text",
      required: false,
      proposed_value: "Draft",
      source_path: "schema_preview",
      safe_for_review_only: true,
    },
    {
      field_name: "Operator_Decision",
      field_type_hint: "long_text",
      required: false,
      proposed_value: "REQUEST_MAPPING_REVIEW",
      source_path: "operator_decision_draft.proposed_operator_decision.decision_type",
      safe_for_review_only: true,
    },
    {
      field_name: "Review_Notes",
      field_type_hint: "long_text",
      required: false,
      proposed_value:
        "Review-only draft. Human review must decide whether to accept discussion, reject the candidate, or request refinement.",
      source_path: "schema_preview",
      safe_for_review_only: true,
    },
    {
      field_name: "Human_Review_Required",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: true,
      source_path: "human_review_gate.proposed_review_decision.human_review_required",
      safe_for_review_only: true,
    },
    {
      field_name: "Fresh_Approval_Required_For_Mutation",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: true,
      source_path: "human_review_gate.approval_boundaries.fresh_approval_required_for_mutation",
      safe_for_review_only: true,
    },
    {
      field_name: "Fresh_Approval_Required_For_Real_Run",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: true,
      source_path: "human_review_gate.approval_boundaries.fresh_approval_required_for_real_run",
      safe_for_review_only: true,
    },
    {
      field_name: "Unsupported_Active",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: unsupportedActive,
      source_path: "unsupported_command_diagnosis.unsupported_confirmed",
      safe_for_review_only: true,
    },
    {
      field_name: "Registry_Ready",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: registryReadyForRealRun,
      source_path: "toolcatalog_registry_readiness.registry_ready_for_real_run",
      safe_for_review_only: true,
    },
    {
      field_name: "Payload_Schema_Validated",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: payloadSchemaValidated,
      source_path: "execution_mapping_contract_draft.payload_contract.payload_schema_validated",
      safe_for_review_only: true,
    },
    {
      field_name: "Promotion_Ready",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: promotionPolicyReady,
      source_path: "execution_mapping_contract_draft.promotion_contract.promotion_ready",
      safe_for_review_only: true,
    },
    {
      field_name: "Rollback_Validated",
      field_type_hint: "checkbox",
      required: false,
      proposed_value: rollbackValidated,
      source_path: "schema_preview",
      safe_for_review_only: true,
    },
    {
      field_name: "Created_From_Incident_Detail_Version",
      field_type_hint: "single_line_text",
      required: false,
      proposed_value: "Incident Detail V5.41",
      source_path: "current_layer",
      safe_for_review_only: true,
    },
  ];

  const forbiddenOperatorApprovalFieldsNow = [
    {
      field_name: "Approved_For_Mutation",
      reason:
        "Mutation approval is forbidden because proposal confidence is low and mapping preflight is not ready.",
    },
    {
      field_name: "Approved_For_Registry_Mutation",
      reason:
        "Registry mutation approval is forbidden because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
    },
    {
      field_name: "Approved_For_Command_Creation",
      reason:
        "Command creation approval is forbidden because target capability is not selected with sufficient confidence.",
    },
    {
      field_name: "Approved_For_Real_Run",
      reason:
        "Real-run approval is forbidden because unsupported remains active and real-run is not allowed.",
    },
    {
      field_name: "Real_Run_Approved",
      reason:
        "Real-run approval must remain false until registry, router, payload schema, promotion policy, rollback, and fresh approval are validated.",
    },
    {
      field_name: "Execute_Now",
      reason:
        "Execution from this route is forbidden. V5.41 is GET/read-only only.",
    },
    {
      field_name: "Worker_Call_Allowed",
      reason:
        "Worker calls are forbidden from this review surface.",
    },
    {
      field_name: "Command_Creation_Allowed",
      reason:
        "Command creation is forbidden until target capability, payload schema, registry, and fresh approval are validated.",
    },
  ];

  const missingRequiredFields = requiredOperatorApprovalFields
    .filter((field) => !hasRequiredValue(field.proposed_value))
    .map((field) => field.field_name);

  const requiredFieldsHaveValues = missingRequiredFields.length === 0;

  const forbiddenFieldNames = forbiddenOperatorApprovalFieldsNow.map(
    (field) => field.field_name
  );

  const forbiddenFieldsPresent = forbiddenFieldNames.some(
    (fieldName) => proposedFields[fieldName] !== undefined
  );

  const unsafeFieldsDetected =
    forbiddenFieldsPresent ||
    realRunAllowed === true ||
    mutationAllowed === true ||
    requiredOperatorApprovalFields.some(
      (field) => field.safe_for_review_only !== true
    );

  const schemaSafeForReviewOnlyPreview =
    requiredFieldsHaveValues &&
    !unsafeFieldsDetected &&
    decisionType === "REQUEST_MAPPING_REVIEW" &&
    decisionScope === "review_only" &&
    decisionStatus === "Draft";

  const proposedAirtableFields: JsonRecord = {};

  for (const field of requiredOperatorApprovalFields) {
    proposedAirtableFields[field.field_name] = field.proposed_value;
  }

  for (const field of optionalOperatorApprovalFields) {
    proposedAirtableFields[field.field_name] = field.proposed_value;
  }

  const reasonCreationBlocked = Array.from(
    new Set([
      lowConfidence
        ? "Proposal confidence is low or unknown."
        : "",
      !preflightReadyForMappingMutation
        ? "System mapping preflight is not ready."
        : "",
      !registryReadyForRealRun
        ? "Registry is not ready for real-run."
        : "",
      !routerMappingReadyForRealRun
        ? "Router mapping is not ready for real-run."
        : "",
      !targetCapabilitySelected
        ? "Target capability is not selected."
        : "",
      !payloadSchemaValidated
        ? "Payload schema is not validated."
        : "",
      !promotionPolicyReady
        ? "Promotion policy is not ready."
        : "",
      !rollbackValidated
        ? "Rollback is not operationally validated."
        : "",
      unsupportedActive
        ? "Unsupported classification remains active."
        : "",
      freshApprovalMissing
        ? "Fresh approval is missing."
        : "",
      "V5.41 is read-only and cannot create Operator_Approval records.",
    ].filter(Boolean))
  );

  const dependencyStatus = {
    low_confidence: lowConfidence,
    preflight_blocked: !preflightReadyForMappingMutation,
    registry_ready_for_real_run: registryReadyForRealRun,
    router_mapping_ready_for_real_run: routerMappingReadyForRealRun,
    target_capability_selected: targetCapabilitySelected,
    payload_schema_validated: payloadSchemaValidated,
    promotion_policy_ready: promotionPolicyReady,
    rollback_validated: rollbackValidated,
    unsupported_active: unsupportedActive,
    fresh_approval_missing: freshApprovalMissing,
  };

  const schemaPreviewChecks: Array<{
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    blocking: boolean;
    evidence: string;
  }> = [
    {
      id: "draft_available",
      label: "Persistence draft is available",
      status: draftAvailable ? "pass" : "fail",
      blocking: !draftAvailable,
      evidence: `draft_available=${draftAvailable}.`,
    },
    {
      id: "preflight_available",
      label: "Persistence preflight is available",
      status: preflightAvailable ? "pass" : "fail",
      blocking: !preflightAvailable,
      evidence: `preflight_available=${preflightAvailable}.`,
    },
    {
      id: "target_table_operator_approvals",
      label: "Target table is Operator_Approvals",
      status: targetTable === "Operator_Approvals" ? "pass" : "fail",
      blocking: targetTable !== "Operator_Approvals",
      evidence: `target_table=${targetTable}.`,
    },
    {
      id: "target_action_create_later",
      label: "Target action is create_later",
      status: targetAction === "create_later" ? "pass" : "fail",
      blocking: targetAction !== "create_later",
      evidence: `target_action=${targetAction}.`,
    },
    {
      id: "required_fields_have_values",
      label: "Required schema fields have values",
      status: requiredFieldsHaveValues ? "pass" : "fail",
      blocking: !requiredFieldsHaveValues,
      evidence: requiredFieldsHaveValues
        ? "All required schema preview fields have values."
        : `Missing required fields: ${missingRequiredFields.join(", ")}.`,
    },
    {
      id: "decision_type_valid",
      label: "Decision type is review mapping",
      status: decisionType === "REQUEST_MAPPING_REVIEW" ? "pass" : "fail",
      blocking: decisionType !== "REQUEST_MAPPING_REVIEW",
      evidence: `decision_type=${decisionType}.`,
    },
    {
      id: "decision_scope_review_only",
      label: "Decision scope is review_only",
      status: decisionScope === "review_only" ? "pass" : "fail",
      blocking: decisionScope !== "review_only",
      evidence: `decision_scope=${decisionScope}.`,
    },
    {
      id: "decision_status_draft",
      label: "Decision status is Draft",
      status: decisionStatus === "Draft" ? "pass" : "fail",
      blocking: decisionStatus !== "Draft",
      evidence: `decision_status=${decisionStatus}.`,
    },
    {
      id: "proposal_confidence_sufficient",
      label: "Proposal confidence is sufficient for future creation",
      status:
        proposalConfidence === "medium" || proposalConfidence === "high"
          ? "pass"
          : "fail",
      blocking: true,
      evidence: `proposal_confidence=${proposalConfidence}. Medium or high is required before future Operator_Approval creation.`,
    },
    {
      id: "unsafe_fields_not_detected",
      label: "No unsafe approval fields detected",
      status: unsafeFieldsDetected ? "fail" : "pass",
      blocking: unsafeFieldsDetected,
      evidence: `unsafe_fields_detected=${unsafeFieldsDetected}.`,
    },
    {
      id: "schema_safe_for_review_only_preview",
      label: "Schema is safe for review-only preview",
      status: schemaSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !schemaSafeForReviewOnlyPreview,
      evidence: `schema_safe_for_review_only_preview=${schemaSafeForReviewOnlyPreview}.`,
    },
    {
      id: "operator_approval_creation_forbidden",
      label: "Operator approval creation remains forbidden",
      status: !operatorApprovalCreationAllowed ? "pass" : "fail",
      blocking: operatorApprovalCreationAllowed,
      evidence: `operator_approval_creation_allowed=${operatorApprovalCreationAllowed}.`,
    },
    {
      id: "real_run_allowed_false",
      label: "Real-run remains forbidden",
      status: !realRunAllowed ? "pass" : "fail",
      blocking: realRunAllowed,
      evidence: `real_run_allowed=${realRunAllowed}.`,
    },
    {
      id: "mutation_allowed_false",
      label: "Mutation remains forbidden",
      status: !mutationAllowed ? "pass" : "fail",
      blocking: mutationAllowed,
      evidence: `mutation_allowed=${mutationAllowed}.`,
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification remains active",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${unsupportedActive}.`,
    },
    {
      id: "registry_ready_for_real_run",
      label: "Registry ready for real-run",
      status: registryReadyForRealRun ? "pass" : "fail",
      blocking: true,
      evidence: `registry_ready_for_real_run=${registryReadyForRealRun}.`,
    },
    {
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping ready for real-run",
      status: routerMappingReadyForRealRun ? "pass" : "fail",
      blocking: true,
      evidence: `router_mapping_ready_for_real_run=${routerMappingReadyForRealRun}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: true,
      evidence: `target_capability_selected=${targetCapabilitySelected}.`,
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: true,
      evidence: `payload_schema_validated=${payloadSchemaValidated}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy ready",
      status: promotionPolicyReady ? "pass" : "fail",
      blocking: true,
      evidence: `promotion_policy_ready=${promotionPolicyReady}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: true,
      evidence: `rollback_validated=${rollbackValidated}.`,
    },
    {
      id: "fresh_approval_missing",
      label: "Fresh approval is available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${freshApprovalMissing}.`,
    },
  ] satisfies Array<{
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    blocking: boolean;
    evidence: string;
  }>;

  const schemaPreviewSummary = {
    total_checks: schemaPreviewChecks.length,
    passed_checks: schemaPreviewChecks.filter((check) => check.status === "pass")
      .length,
    warning_checks: schemaPreviewChecks.filter(
      (check) => check.status === "warning"
    ).length,
    failed_checks: schemaPreviewChecks.filter((check) => check.status === "fail")
      .length,
    blocking_checks: schemaPreviewChecks.filter(
      (check) => check.blocking && check.status === "fail"
    ).length,
  };

  let schemaPreviewStatus:
    | "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_LOW_CONFIDENCE"
    | "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_PREFLIGHT"
    | "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_SCHEMA_INCOMPLETE"
    | "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_REAL_RUN"
    | "REVIEW_DECISION_SCHEMA_PREVIEW_READY_REVIEW_ONLY"
    | "REVIEW_DECISION_SCHEMA_PREVIEW_UNKNOWN" =
    "REVIEW_DECISION_SCHEMA_PREVIEW_UNKNOWN";

  if (lowConfidence) {
    schemaPreviewStatus =
      "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_LOW_CONFIDENCE";
  } else if (!requiredFieldsHaveValues || unsafeFieldsDetected) {
    schemaPreviewStatus =
      "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_SCHEMA_INCOMPLETE";
  } else if (!operatorApprovalCreationAllowed || !preflightReadyForMappingMutation) {
    schemaPreviewStatus = "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_PREFLIGHT";
  } else if (!realRunAllowed || unsupportedActive) {
    schemaPreviewStatus = "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_REAL_RUN";
  } else {
    schemaPreviewStatus = "REVIEW_DECISION_SCHEMA_PREVIEW_READY_REVIEW_ONLY";
  }

  return {
    available: true,
    schema_preview_version: "V5.41_REVIEW_DECISION_PERSISTENCE_SCHEMA_PREVIEW",
    schema_preview_status: schemaPreviewStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    target_schema: {
      target_table: "Operator_Approvals",
      target_action: "create_later",
      schema_for: "review_only_decision_draft",
      read_only: true,
      create_allowed_now: false,
      update_allowed_now: false,
    },

    source_draft: {
      draft_available: draftAvailable,
      preflight_available: preflightAvailable,
      draft_status: draftStatus || null,
      preflight_status: preflightStatus || null,
      decision_type: decisionType || null,
      decision_scope: decisionScope || null,
      decision_status: decisionStatus || null,
      mapping_candidate: mappingCandidate || null,
      proposal_confidence: proposalConfidence,
    },

    required_operator_approval_fields: requiredOperatorApprovalFields,
    optional_operator_approval_fields: optionalOperatorApprovalFields,
    forbidden_operator_approval_fields_now: forbiddenOperatorApprovalFieldsNow,

    schema_validation: {
      required_fields_count: requiredOperatorApprovalFields.length,
      optional_fields_count: optionalOperatorApprovalFields.length,
      forbidden_fields_count: forbiddenOperatorApprovalFieldsNow.length,
      required_fields_have_values: requiredFieldsHaveValues,
      missing_required_fields: missingRequiredFields,
      unsafe_fields_detected: unsafeFieldsDetected,
      schema_safe_for_review_only_preview: schemaSafeForReviewOnlyPreview,
      schema_safe_for_creation_now: false,
      schema_safe_for_mutation_now: false,
      schema_safe_for_real_run_now: false,
    },

    proposed_airtable_payload_preview: {
      fields: proposedAirtableFields,
      note: "Preview only. Do not send to Airtable from V5.41.",
    },

    creation_policy_preview: {
      creation_allowed_now: false,
      reason_creation_blocked: reasonCreationBlocked,
      allowed_future_scope: ["review_only_decision_draft"],
      forbidden_future_scope_now: [
        "mapping_mutation_approval",
        "registry_mutation_approval",
        "command_creation_approval",
        "real_run_approval",
      ],
    },

    dependency_status: dependencyStatus,

    schema_preview_checks: schemaPreviewChecks,
    schema_preview_summary: schemaPreviewSummary,

    allowed_now: ["review_only_schema_preview"],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
    ],

    required_before_operator_approval_creation: pickArray<string>(
      args.reviewDecisionPersistencePreflight,
      ["required_before_operator_approval_creation"]
    ),

    required_before_any_mutation: pickArray<string>(
      args.reviewDecisionPersistencePreflight,
      ["required_before_any_mutation"]
    ),

    required_before_real_run: pickArray<string>(
      args.reviewDecisionPersistencePreflight,
      ["required_before_real_run"]
    ),

    audit: {
      no_airtable_mutation: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Keep this as a read-only schema preview. Run human review of the mapping candidate before any future Operator_Approval creation path.",

    guardrail_interpretation:
      "V5.41 is a review decision persistence schema preview only. It does not create or update Operator_Approval records, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

function buildReviewDecisionPersistencePayloadPreview(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionPersistenceSchemaPreview: JsonRecord;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  type PayloadPreviewCheck = {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    blocking: boolean;
    evidence: string;
  };

  const schemaPreviewStatus = pickString(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_preview_status"]
  );

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const preflightStatus = pickString(args.reviewDecisionPersistencePreflight, [
    "preflight_status",
  ]);

  const approvalId =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "proposed_airtable_payload_preview.fields.Approval_ID",
    ]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record.approval_id",
    ]);

  const idempotencyKey =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "proposed_airtable_payload_preview.fields.Idempotency_Key",
    ]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record.idempotency_key",
    ]);

  const decisionType =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.decision_type",
    ]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record.decision_type",
    ]) ||
    "REQUEST_MAPPING_REVIEW";

  const decisionScope =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.decision_scope",
    ]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record.decision_scope",
    ]) ||
    "review_only";

  const decisionStatus =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.decision_status",
    ]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_review_decision_record.decision_status",
    ]) ||
    "Draft";

  const mappingCandidate =
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.mapping_candidate",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "decision_context.mapping_candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.proposal_confidence",
    ]) ||
      pickString(args.reviewDecisionPersistenceDraft, [
        "proposed_review_decision_record.proposal_confidence",
      ]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const reviewStatus =
    pickString(args.operatorDecisionReviewSummary, ["review_status"]) ||
    pickString(args.reviewDecisionPersistenceDraft, [
      "proposed_fields_for_future_persistence.Review_Status",
    ]);

  const operatorDecision =
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) || decisionType;

  const requiredFieldsCount = pickArray<JsonRecord>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["required_operator_approval_fields"]
  ).length;

  const optionalFieldsCount = pickArray<JsonRecord>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["optional_operator_approval_fields"]
  ).length;

  const forbiddenFieldsCount = pickArray<JsonRecord>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["forbidden_operator_approval_fields_now"]
  ).length;

  const schemaPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["available"],
    false
  );

  const schemaSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_review_only_preview"],
    false
  );

  const requiredFieldsHaveValues = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.required_fields_have_values"],
    false
  );

  const schemaMissingRequiredFields = pickArray<string>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.missing_required_fields"]
  );

  const operatorApprovalCreationAllowed = pickBoolean(
    args.reviewDecisionPersistencePreflight,
    ["safety_preflight.operator_approval_creation_allowed"],
    false
  );

  const preflightReadyForMappingMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const registryReady = pickBoolean(args.toolcatalogRegistryReadiness, [
    "registry_ready_for_real_run",
  ]);

  const routerMappingReady = pickBoolean(args.workerRouterMappingInspection, [
    "router_mapping_ready_for_real_run",
  ]);

  const targetCapabilitySelected = Boolean(
    pickString(args.targetCapabilityDecisionMatrix, [
      "selected_target_capability",
    ])
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionReady = pickBoolean(args.executionMappingContractDraft, [
    "promotion_contract.promotion_ready",
  ]);

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]);

  const freshApprovalRequiredForMutation = pickBoolean(args.humanReviewGate, [
    "approval_boundaries.fresh_approval_required_for_mutation",
  ]);

  const freshApprovalRequiredForRealRun = pickBoolean(args.humanReviewGate, [
    "approval_boundaries.fresh_approval_required_for_real_run",
  ]);

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    schemaPreviewStatus === "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_LOW_CONFIDENCE";

  const bodyFields: Record<string, unknown> = {
    Approval_ID: approvalId || null,
    Idempotency_Key: idempotencyKey || null,
    Workspace_ID: args.workspaceId,
    Incident_ID: args.incidentId,
    Command_ID: args.commandId,
    Command_Record_ID: args.commandRecordId,
    Decision_Type: decisionType,
    Decision_Scope: decisionScope,
    Decision_Status: decisionStatus,
    Mapping_Candidate: mappingCandidate,
    Proposal_Confidence: proposalConfidence,
    Review_Status: reviewStatus || null,
    Real_Run_Allowed: false,
    Mutation_Allowed: false,
    Source_Layer: "Incident Detail V5.42",
    Operator_Identity: "Arthur",
    Approval_Status: "Draft",
    Operator_Decision: operatorDecision,
    Review_Notes:
      "Review-only payload preview. Human review must decide whether to accept discussion, reject the candidate, or request refinement.",
    Human_Review_Required: true,
    Fresh_Approval_Required_For_Mutation: freshApprovalRequiredForMutation,
    Fresh_Approval_Required_For_Real_Run: freshApprovalRequiredForRealRun,
    Unsupported_Active: unsupportedActive,
    Registry_Ready: registryReady,
    Payload_Schema_Validated: payloadSchemaValidated,
    Promotion_Ready: promotionReady,
    Rollback_Validated: rollbackValidated,
    Created_From_Incident_Detail_Version: "Incident Detail V5.42",
  };

  const requiredPayloadFieldNames = [
    "Approval_ID",
    "Idempotency_Key",
    "Workspace_ID",
    "Incident_ID",
    "Command_ID",
    "Command_Record_ID",
    "Decision_Type",
    "Decision_Scope",
    "Decision_Status",
    "Mapping_Candidate",
    "Proposal_Confidence",
    "Review_Status",
    "Real_Run_Allowed",
    "Mutation_Allowed",
    "Source_Layer",
  ];

  const missingRequiredFields = requiredPayloadFieldNames.filter((fieldName) => {
    const value = bodyFields[fieldName];
    return value === null || value === undefined || value === "";
  });

  const requiredFieldsPresent =
    requiredFieldsHaveValues &&
    schemaMissingRequiredFields.length === 0 &&
    missingRequiredFields.length === 0;

  const excludedDangerousFields = [
    {
      field_name: "Approved_For_Mutation",
      excluded: true,
      reason:
        "Mutation approval is excluded because proposal confidence is low and mapping preflight is not ready.",
    },
    {
      field_name: "Approved_For_Registry_Mutation",
      excluded: true,
      reason:
        "Registry mutation approval is excluded because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
    },
    {
      field_name: "Approved_For_Command_Creation",
      excluded: true,
      reason:
        "Command creation approval is excluded because target capability is not selected with sufficient confidence.",
    },
    {
      field_name: "Approved_For_Real_Run",
      excluded: true,
      reason:
        "Real-run approval is excluded because unsupported remains active and real-run is not allowed.",
    },
    {
      field_name: "Real_Run_Approved",
      excluded: true,
      reason:
        "Real-run approval must remain false until registry, router, payload schema, promotion policy, rollback, and fresh approval are validated.",
    },
    {
      field_name: "Execute_Now",
      excluded: true,
      reason: "Execution from this route is forbidden. V5.42 is GET/read-only only.",
    },
    {
      field_name: "Worker_Call_Allowed",
      excluded: true,
      reason: "Worker calls are forbidden from this review surface.",
    },
    {
      field_name: "Command_Creation_Allowed",
      excluded: true,
      reason:
        "Command creation is forbidden until target capability, payload schema, registry, and fresh approval are validated.",
    },
  ];

  const forbiddenFieldNames = excludedDangerousFields.map(
    (field) => field.field_name
  );

  const forbiddenFieldsExcluded = forbiddenFieldNames.every(
    (fieldName) => !(fieldName in bodyFields)
  );

  const unsafeTrueFlagsDetected =
    bodyFields.Real_Run_Allowed === true ||
    bodyFields.Mutation_Allowed === true ||
    operatorApprovalCreationAllowed === true ||
    realRunAllowed === true;

  const payloadSafeForReviewOnlyPreview =
    requiredFieldsPresent &&
    forbiddenFieldsExcluded &&
    !unsafeTrueFlagsDetected &&
    schemaSafeForReviewOnlyPreview;

  let payloadPreviewStatus:
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_LOW_CONFIDENCE"
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_SCHEMA"
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_PREFLIGHT"
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_REAL_RUN"
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_READY_REVIEW_ONLY"
    | "REVIEW_DECISION_PAYLOAD_PREVIEW_UNKNOWN" =
    "REVIEW_DECISION_PAYLOAD_PREVIEW_UNKNOWN";

  if (lowConfidence) {
    payloadPreviewStatus =
      "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_LOW_CONFIDENCE";
  } else if (!requiredFieldsPresent || missingRequiredFields.length > 0) {
    payloadPreviewStatus = "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_SCHEMA";
  } else if (
    !operatorApprovalCreationAllowed ||
    !preflightReadyForMappingMutation
  ) {
    payloadPreviewStatus = "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_PREFLIGHT";
  } else if (!realRunAllowed || unsupportedActive) {
    payloadPreviewStatus = "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_REAL_RUN";
  } else {
    payloadPreviewStatus = "REVIEW_DECISION_PAYLOAD_PREVIEW_READY_REVIEW_ONLY";
  }

  const creationBlockers = {
    low_confidence: lowConfidence,
    schema_preview_blocked:
      schemaPreviewStatus !==
      "REVIEW_DECISION_SCHEMA_PREVIEW_READY_REVIEW_ONLY",
    preflight_blocked:
      preflightStatus !==
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_READY_REVIEW_ONLY",
    registry_not_ready: !registryReady,
    router_mapping_not_ready: !routerMappingReady,
    target_capability_not_selected: !targetCapabilitySelected,
    payload_schema_not_validated: !payloadSchemaValidated,
    promotion_policy_missing: !promotionReady,
    rollback_not_validated: !rollbackValidated,
    unsupported_active: unsupportedActive,
    fresh_approval_missing: freshApprovalMissing,
  };

  const payloadPreviewChecks: PayloadPreviewCheck[] = [
    {
      id: "schema_preview_available",
      label: "Schema preview is available",
      status: schemaPreviewAvailable ? "pass" : "fail",
      blocking: !schemaPreviewAvailable,
      evidence: `schema_preview_available=${schemaPreviewAvailable}.`,
    },
    {
      id: "payload_target_operator_approvals",
      label: "Payload target is Operator_Approvals",
      status: "pass",
      blocking: false,
      evidence: "target_table=Operator_Approvals.",
    },
    {
      id: "payload_target_action_create_later",
      label: "Payload target action is create_later",
      status: "pass",
      blocking: false,
      evidence: "target_action=create_later.",
    },
    {
      id: "required_fields_present",
      label: "Required payload fields are present",
      status: requiredFieldsPresent ? "pass" : "fail",
      blocking: !requiredFieldsPresent,
      evidence:
        missingRequiredFields.length === 0
          ? "All required payload fields are present."
          : `Missing required fields: ${missingRequiredFields.join(", ")}.`,
    },
    {
      id: "forbidden_fields_excluded",
      label: "Forbidden fields are excluded",
      status: forbiddenFieldsExcluded ? "pass" : "fail",
      blocking: !forbiddenFieldsExcluded,
      evidence: `forbidden_fields_excluded=${forbiddenFieldsExcluded}.`,
    },
    {
      id: "unsafe_true_flags_detected",
      label: "No unsafe true flags detected",
      status: unsafeTrueFlagsDetected ? "fail" : "pass",
      blocking: unsafeTrueFlagsDetected,
      evidence: `unsafe_true_flags_detected=${unsafeTrueFlagsDetected}.`,
    },
    {
      id: "payload_safe_for_review_only_preview",
      label: "Payload is safe for review-only preview",
      status: payloadSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !payloadSafeForReviewOnlyPreview,
      evidence: `payload_safe_for_review_only_preview=${payloadSafeForReviewOnlyPreview}.`,
    },
    {
      id: "proposal_confidence_sufficient",
      label: "Proposal confidence is sufficient for future send",
      status: lowConfidence ? "fail" : "pass",
      blocking: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}. Medium or high is required before future payload send.`,
    },
    {
      id: "operator_approval_creation_forbidden",
      label: "Operator approval creation remains forbidden",
      status: !operatorApprovalCreationAllowed ? "pass" : "fail",
      blocking: operatorApprovalCreationAllowed,
      evidence: `operator_approval_creation_allowed=${operatorApprovalCreationAllowed}.`,
    },
    {
      id: "payload_send_forbidden",
      label: "Payload send to Airtable is forbidden",
      status: "pass",
      blocking: false,
      evidence: "body_send_allowed_now=false.",
    },
    {
      id: "real_run_allowed_false",
      label: "Real-run remains forbidden",
      status: !realRunAllowed ? "pass" : "fail",
      blocking: realRunAllowed,
      evidence: `real_run_allowed=${realRunAllowed}.`,
    },
    {
      id: "mutation_allowed_false",
      label: "Mutation remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "mutation_allowed=false.",
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification remains active",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${unsupportedActive}.`,
    },
    {
      id: "registry_ready",
      label: "Registry is ready",
      status: registryReady ? "pass" : "fail",
      blocking: !registryReady,
      evidence: `registry_ready=${registryReady}.`,
    },
    {
      id: "router_mapping_ready",
      label: "Router mapping is ready",
      status: routerMappingReady ? "pass" : "fail",
      blocking: !routerMappingReady,
      evidence: `router_mapping_ready=${routerMappingReady}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability is selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: !targetCapabilitySelected,
      evidence: `target_capability_selected=${targetCapabilitySelected}.`,
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema is validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${payloadSchemaValidated}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy is ready",
      status: promotionReady ? "pass" : "fail",
      blocking: !promotionReady,
      evidence: `promotion_policy_ready=${promotionReady}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback is validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: !rollbackValidated,
      evidence: `rollback_validated=${rollbackValidated}.`,
    },
    {
      id: "fresh_approval_available",
      label: "Fresh approval is available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${freshApprovalMissing}.`,
    },
  ];

  const requiredBeforePayloadSend = [
    "complete review-only human decision",
    "confirm mapping candidate scope",
    "confirm decision remains review_only",
    "increase proposal confidence to medium or high",
    "confirm no mutation is requested",
    "confirm Operator_Approval creation path is separate",
    "confirm payload send is not performed from this route",
    "confirm real-run remains forbidden",
  ];

  const requiredBeforeOperatorApprovalCreation = pickArray<string>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["required_before_operator_approval_creation"]
  );

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["required_before_any_mutation"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionPersistenceSchemaPreview,
    ["required_before_real_run"]
  );

  return {
    available: true,
    payload_preview_version: "V5.42_REVIEW_DECISION_PERSISTENCE_PAYLOAD_PREVIEW",
    payload_preview_status: payloadPreviewStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    target: {
      target_table: "Operator_Approvals",
      target_action: "create_later",
      payload_for: "review_only_decision_draft",
      read_only: true,
      send_allowed_now: false,
      create_allowed_now: false,
      update_allowed_now: false,
    },

    source_schema_preview: {
      schema_preview_available: schemaPreviewAvailable,
      schema_preview_status: schemaPreviewStatus || null,
      required_fields_count: requiredFieldsCount,
      optional_fields_count: optionalFieldsCount,
      forbidden_fields_count: forbiddenFieldsCount,
      schema_safe_for_review_only_preview: schemaSafeForReviewOnlyPreview,
      schema_safe_for_creation_now: false,
      schema_safe_for_mutation_now: false,
      schema_safe_for_real_run_now: false,
    },

    payload_identity: {
      approval_id: approvalId || null,
      idempotency_key: idempotencyKey || null,
      workspace_id: args.workspaceId,
      incident_id: args.incidentId,
      command_id: args.commandId,
      command_record_id: args.commandRecordId,
      source_layer: "Incident Detail V5.42",
    },

    payload_decision: {
      decision_type: decisionType,
      decision_scope: decisionScope,
      decision_status: decisionStatus,
      mapping_candidate: mappingCandidate,
      proposal_confidence: proposalConfidence,
      review_status: reviewStatus || null,
      operator_decision: operatorDecision || null,
    },

    payload_safety_flags: {
      real_run_allowed: false,
      mutation_allowed: false,
      operator_approval_creation_allowed: false,
      command_creation_allowed: false,
      worker_call_allowed: false,
      airtable_mutation_allowed: false,
      unsupported_active: unsupportedActive,
      registry_ready: registryReady,
      payload_schema_validated: payloadSchemaValidated,
      promotion_ready: promotionReady,
      rollback_validated: rollbackValidated,
      fresh_approval_required_for_mutation: freshApprovalRequiredForMutation,
      fresh_approval_required_for_real_run: freshApprovalRequiredForRealRun,
    },

    airtable_payload_preview: {
      method: "POST_LATER",
      endpoint_target: "Operator_Approvals",
      body_preview: {
        fields: bodyFields,
      },
      body_is_safe_for_preview: payloadSafeForReviewOnlyPreview,
      body_send_allowed_now: false,
      note: "Preview only. Do not send to Airtable from V5.42.",
    },

    payload_field_groups: {
      identity_fields: [
        "Approval_ID",
        "Idempotency_Key",
        "Workspace_ID",
        "Incident_ID",
        "Command_ID",
        "Command_Record_ID",
      ],
      decision_fields: [
        "Decision_Type",
        "Decision_Scope",
        "Decision_Status",
        "Mapping_Candidate",
        "Proposal_Confidence",
        "Review_Status",
        "Operator_Decision",
        "Review_Notes",
      ],
      safety_fields: [
        "Real_Run_Allowed",
        "Mutation_Allowed",
        "Human_Review_Required",
        "Fresh_Approval_Required_For_Mutation",
        "Fresh_Approval_Required_For_Real_Run",
        "Unsupported_Active",
        "Registry_Ready",
        "Payload_Schema_Validated",
        "Promotion_Ready",
        "Rollback_Validated",
      ],
      audit_fields: [
        "Source_Layer",
        "Created_From_Incident_Detail_Version",
        "Approval_Status",
        "Operator_Identity",
      ],
      forbidden_fields_excluded: forbiddenFieldNames,
    },

    excluded_dangerous_fields: excludedDangerousFields,

    payload_validation: {
      payload_available: true,
      required_fields_present: requiredFieldsPresent,
      missing_required_fields: missingRequiredFields,
      forbidden_fields_excluded: forbiddenFieldsExcluded,
      unsafe_true_flags_detected: unsafeTrueFlagsDetected,
      payload_safe_for_review_only_preview: payloadSafeForReviewOnlyPreview,
      payload_safe_for_send_now: false,
      payload_safe_for_operator_approval_creation_now: false,
      payload_safe_for_real_run_now: false,
    },

    creation_blockers: creationBlockers,

    payload_preview_checks: payloadPreviewChecks,

    payload_preview_summary: {
      total_checks: payloadPreviewChecks.length,
      passed_checks: payloadPreviewChecks.filter(
        (check) => check.status === "pass"
      ).length,
      warning_checks: payloadPreviewChecks.filter(
        (check) => check.status === "warning"
      ).length,
      failed_checks: payloadPreviewChecks.filter(
        (check) => check.status === "fail"
      ).length,
      blocking_checks: payloadPreviewChecks.filter((check) => check.blocking)
        .length,
    },

    allowed_now: ["review_only_payload_preview"],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "payload_send_to_airtable",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
    ],

    required_before_payload_send: requiredBeforePayloadSend,

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : requiredBeforePayloadSend,

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_payload_sent: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Keep this as a read-only payload preview. Run human review of the mapping candidate before any future Operator_Approval creation path.",

    guardrail_interpretation:
      "V5.42 is a review decision persistence payload preview only. It does not send payloads to Airtable, create or update Operator_Approval records, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

function buildReviewDecisionPersistenceHumanReviewReadiness(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionPersistencePayloadPreview: JsonRecord;
  reviewDecisionPersistenceSchemaPreview: JsonRecord;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  type ReadinessCheck = {
    id: string;
    label: string;
    status: "pass" | "warning" | "fail";
    blocking: boolean;
    evidence: string;
  };

  const payloadPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["available"],
    false
  );

  const payloadPreviewStatus = pickString(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_preview_status"]
  );

  const schemaPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["available"],
    false
  );

  const schemaPreviewStatus = pickString(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_preview_status"]
  );

  const preflightAvailable = pickBoolean(
    args.reviewDecisionPersistencePreflight,
    ["available"],
    false
  );

  const preflightStatus = pickString(args.reviewDecisionPersistencePreflight, [
    "preflight_status",
  ]);

  const draftAvailable = pickBoolean(
    args.reviewDecisionPersistenceDraft,
    ["available"],
    false
  );

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const operatorDecisionDraftAvailable = pickBoolean(
    args.operatorDecisionDraft,
    ["available"],
    false
  );

  const humanReviewGateAvailable = pickBoolean(args.humanReviewGate, [
    "available",
  ]);

  const mappingCandidate =
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.mapping_candidate",
    ]) ||
    pickString(args.reviewDecisionPersistenceSchemaPreview, [
      "source_draft.mapping_candidate",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "decision_context.mapping_candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.proposal_confidence",
    ]) ||
      pickString(args.reviewDecisionPersistenceSchemaPreview, [
        "source_draft.proposal_confidence",
      ]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.operatorDecisionDraft, [
        "decision_context.proposal_confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const recommendedDecisionType =
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.decision_type",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "operator_decision_now.recommended_decision_type",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) ||
    "REQUEST_MAPPING_REVIEW";

  const recommendedDecisionLabel =
    pickString(args.operatorDecisionReviewSummary, [
      "operator_decision_now.recommended_decision_label",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_label",
    ]) ||
    "Review mapping candidate only";

  const reviewStatus =
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.review_status",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, ["review_status"]);

  const payloadRequiredFieldsPresent = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.required_fields_present"],
    false
  );

  const payloadSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.payload_safe_for_review_only_preview"],
    false
  );

  const payloadSafeForSendNow = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.payload_safe_for_send_now"],
    false
  );

  const schemaSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_review_only_preview"],
    false
  );

  const schemaSafeForCreationNow = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_creation_now"],
    false
  );

  const operatorApprovalCreationAllowed =
    pickBoolean(args.reviewDecisionPersistencePreflight, [
      "safety_preflight.operator_approval_creation_allowed",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.operator_approval_creation_allowed",
    ]) ||
    schemaSafeForCreationNow;

  const mutationAllowed =
    pickBoolean(args.reviewDecisionPersistencePreflight, [
      "safety_preflight.mutation_allowed_now",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.mutation_allowed",
    ]);

  const commandCreationAllowed = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_safety_flags.command_creation_allowed"]
  );

  const workerCallAllowed = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_safety_flags.worker_call_allowed"]
  );

  const airtableMutationAllowed = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_safety_flags.airtable_mutation_allowed"]
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.real_run_allowed",
    ]);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.unsupported_active",
    ]);

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const targetCapabilitySelected = Boolean(
    pickString(args.targetCapabilityDecisionMatrix, [
      "selected_target_capability",
    ])
  );

  const payloadSchemaValidated =
    pickBoolean(args.executionMappingContractDraft, [
      "payload_contract.payload_schema_validated",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.payload_schema_validated",
    ]);

  const promotionPolicyReady =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.promotion_ready",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.promotion_ready",
    ]);

  const rollbackValidated = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_safety_flags.rollback_validated"],
    false
  );

  const freshApprovalMissing =
    pickBoolean(args.humanReviewGate, [
      "approval_boundaries.fresh_approval_required_for_mutation",
    ]) ||
    pickBoolean(args.humanReviewGate, [
      "approval_boundaries.fresh_approval_required_for_real_run",
    ]) ||
    true;

  const missingPayloadRequiredFields = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.missing_required_fields"]
  );

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    payloadPreviewStatus ===
      "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_LOW_CONFIDENCE";

  const payloadPreviewBlocked =
    !payloadPreviewAvailable ||
    !payloadRequiredFieldsPresent ||
    missingPayloadRequiredFields.length > 0 ||
    !payloadSafeForReviewOnlyPreview;

  const schemaPreviewBlocked =
    !schemaPreviewAvailable || !schemaSafeForReviewOnlyPreview;

  const preflightBlocked =
    !preflightAvailable ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_LOW_CONFIDENCE" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_DRAFT_INVALID" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_SYSTEM_PREFLIGHT" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REGISTRY" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_REAL_RUN" ||
    operatorApprovalCreationAllowed === false;

  let readinessStatus:
    | "HUMAN_REVIEW_READINESS_BLOCKED_LOW_CONFIDENCE"
    | "HUMAN_REVIEW_READINESS_BLOCKED_PAYLOAD"
    | "HUMAN_REVIEW_READINESS_BLOCKED_SCHEMA"
    | "HUMAN_REVIEW_READINESS_BLOCKED_PREFLIGHT"
    | "HUMAN_REVIEW_READINESS_BLOCKED_REAL_RUN"
    | "HUMAN_REVIEW_READINESS_READY_REVIEW_ONLY"
    | "HUMAN_REVIEW_READINESS_UNKNOWN" =
    "HUMAN_REVIEW_READINESS_UNKNOWN";

  if (lowConfidence) {
    readinessStatus = "HUMAN_REVIEW_READINESS_BLOCKED_LOW_CONFIDENCE";
  } else if (payloadPreviewBlocked) {
    readinessStatus = "HUMAN_REVIEW_READINESS_BLOCKED_PAYLOAD";
  } else if (schemaPreviewBlocked) {
    readinessStatus = "HUMAN_REVIEW_READINESS_BLOCKED_SCHEMA";
  } else if (preflightBlocked) {
    readinessStatus = "HUMAN_REVIEW_READINESS_BLOCKED_PREFLIGHT";
  } else if (!realRunAllowed || unsupportedActive) {
    readinessStatus = "HUMAN_REVIEW_READINESS_BLOCKED_REAL_RUN";
  } else {
    readinessStatus = "HUMAN_REVIEW_READINESS_READY_REVIEW_ONLY";
  }

  const allowedDecisionOptions = pickArray<JsonRecord>(
    args.operatorDecisionDraft,
    ["allowed_decision_options"]
  );

  const allowedHumanActionsNow =
    allowedDecisionOptions.length > 0
      ? allowedDecisionOptions.map((option) => ({
          action_id:
            pickString(option, ["option_id"]) || "REVIEW_MAPPING_ONLY",
          label: pickString(option, ["label"]) || "Review mapping only",
          allowed_now: true,
          scope: "review_only",
          creates_record: false,
          mutates_system: false,
          allows_real_run: false,
        }))
      : [
          {
            action_id: "REVIEW_MAPPING_ONLY",
            label: "Review mapping only",
            allowed_now: true,
            scope: "review_only",
            creates_record: false,
            mutates_system: false,
            allows_real_run: false,
          },
          {
            action_id: "REJECT_MAPPING_CANDIDATE",
            label: "Reject mapping candidate",
            allowed_now: true,
            scope: "review_only",
            creates_record: false,
            mutates_system: false,
            allows_real_run: false,
          },
          {
            action_id: "REQUEST_MAPPING_REFINEMENT",
            label: "Request mapping refinement",
            allowed_now: true,
            scope: "review_only",
            creates_record: false,
            mutates_system: false,
            allows_real_run: false,
          },
        ];

  const rejectedDecisionOptions = pickArray<JsonRecord>(
    args.operatorDecisionDraft,
    ["rejected_decision_options"]
  );

  const forbiddenHumanActionsNow =
    rejectedDecisionOptions.length > 0
      ? rejectedDecisionOptions.map((option) => ({
          action_id:
            pickString(option, ["option_id"]) || "FORBIDDEN_ACTION",
          label: pickString(option, ["label"]) || "Forbidden action",
          allowed_now: false,
          reason:
            pickString(option, ["reason"]) ||
            "This action is forbidden from the V5.43 read-only review readiness surface.",
          blocked_by: pickArray<string>(option, ["blocked_by"]),
        }))
      : [
          {
            action_id: "APPROVE_TOOL_MAPPING_MUTATION",
            label: "Approve Tool_Key / Tool_Mode mutation",
            allowed_now: false,
            reason:
              "Mutation approval is forbidden because proposal confidence is low and mapping preflight is not ready.",
            blocked_by: [
              "proposal_confidence_low",
              "preflight_not_ready",
              "fresh_mutation_approval_missing",
            ],
          },
          {
            action_id: "APPROVE_REGISTRY_MUTATION",
            label: "Approve registry mutation",
            allowed_now: false,
            reason:
              "Registry mutation approval is forbidden because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
            blocked_by: [
              "registry_not_ready",
              "toolcatalog_entry_missing",
              "workspace_capability_entry_missing",
            ],
          },
          {
            action_id: "APPROVE_COMMAND_CREATION",
            label: "Approve command creation",
            allowed_now: false,
            reason:
              "Command creation approval is forbidden because target capability is not selected.",
            blocked_by: [
              "target_capability_not_selected",
              "payload_schema_not_validated",
            ],
          },
          {
            action_id: "APPROVE_REAL_RUN",
            label: "Approve real-run",
            allowed_now: false,
            reason:
              "Real-run approval is forbidden because unsupported remains active and real-run is not allowed.",
            blocked_by: [
              "real_run_forbidden",
              "unsupported_active",
              "fresh_real_run_approval_missing",
            ],
          },
        ];

  const humanReviewQuestions = pickArray<string>(args.humanReviewGate, [
    "human_questions_to_answer",
  ]);

  const requiredBeforeHumanReviewCompletion = [
    "review the low-confidence mapping candidate",
    "decide whether incident_router is the correct target capability",
    "decide whether command_orchestrator should route instead of execute directly",
    "choose review-only outcome: review mapping, reject candidate, or request refinement",
    "confirm no Operator_Approval creation is requested now",
    "confirm no mutation is requested now",
    "confirm real-run remains forbidden",
  ];

  const requiredBeforeOperatorApprovalCreation =
    pickArray<string>(args.reviewDecisionPersistencePayloadPreview, [
      "required_before_operator_approval_creation",
    ]);

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_any_mutation"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_real_run"]
  );

  const packetReadyForHumanReview =
    payloadPreviewAvailable &&
    schemaPreviewAvailable &&
    preflightAvailable &&
    draftAvailable &&
    operatorDecisionDraftAvailable &&
    humanReviewGateAvailable &&
    payloadSafeForReviewOnlyPreview &&
    schemaSafeForReviewOnlyPreview;

  const readinessChecks: ReadinessCheck[] = [
    {
      id: "payload_preview_available",
      label: "Payload preview is available",
      status: payloadPreviewAvailable ? "pass" : "fail",
      blocking: !payloadPreviewAvailable,
      evidence: `payload_preview_available=${payloadPreviewAvailable}.`,
    },
    {
      id: "schema_preview_available",
      label: "Schema preview is available",
      status: schemaPreviewAvailable ? "pass" : "fail",
      blocking: !schemaPreviewAvailable,
      evidence: `schema_preview_available=${schemaPreviewAvailable}.`,
    },
    {
      id: "preflight_available",
      label: "Persistence preflight is available",
      status: preflightAvailable ? "pass" : "fail",
      blocking: !preflightAvailable,
      evidence: `preflight_available=${preflightAvailable}.`,
    },
    {
      id: "operator_decision_draft_available",
      label: "Operator decision draft is available",
      status: operatorDecisionDraftAvailable ? "pass" : "fail",
      blocking: !operatorDecisionDraftAvailable,
      evidence: `operator_decision_draft_available=${operatorDecisionDraftAvailable}.`,
    },
    {
      id: "human_review_gate_available",
      label: "Human review gate is available",
      status: humanReviewGateAvailable ? "pass" : "fail",
      blocking: !humanReviewGateAvailable,
      evidence: `human_review_gate_available=${humanReviewGateAvailable}.`,
    },
    {
      id: "payload_safe_for_review_only",
      label: "Payload is safe for review-only preview",
      status: payloadSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !payloadSafeForReviewOnlyPreview,
      evidence: `payload_safe_for_review_only_preview=${payloadSafeForReviewOnlyPreview}.`,
    },
    {
      id: "schema_safe_for_review_only",
      label: "Schema is safe for review-only preview",
      status: schemaSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !schemaSafeForReviewOnlyPreview,
      evidence: `schema_safe_for_review_only_preview=${schemaSafeForReviewOnlyPreview}.`,
    },
    {
      id: "proposal_confidence_sufficient",
      label: "Proposal confidence is sufficient",
      status: lowConfidence ? "fail" : "pass",
      blocking: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}.`,
    },
    {
      id: "review_scope_is_review_only",
      label: "Review scope is review_only",
      status: "pass",
      blocking: false,
      evidence: "review_scope=review_only.",
    },
    {
      id: "allowed_human_actions_present",
      label: "Allowed review-only human actions are present",
      status: allowedHumanActionsNow.length > 0 ? "pass" : "fail",
      blocking: allowedHumanActionsNow.length === 0,
      evidence: `allowed_human_actions_count=${allowedHumanActionsNow.length}.`,
    },
    {
      id: "operator_approval_creation_forbidden",
      label: "Operator_Approval creation remains forbidden",
      status: !operatorApprovalCreationAllowed ? "pass" : "fail",
      blocking: operatorApprovalCreationAllowed,
      evidence: `operator_approval_creation_allowed=${operatorApprovalCreationAllowed}.`,
    },
    {
      id: "payload_send_forbidden",
      label: "Payload send remains forbidden",
      status: !payloadSafeForSendNow ? "pass" : "fail",
      blocking: payloadSafeForSendNow,
      evidence: `payload_safe_for_send_now=${payloadSafeForSendNow}.`,
    },
    {
      id: "mutation_forbidden",
      label: "Mutation remains forbidden",
      status: !mutationAllowed ? "pass" : "fail",
      blocking: mutationAllowed,
      evidence: `mutation_allowed=${mutationAllowed}.`,
    },
    {
      id: "real_run_forbidden",
      label: "Real-run remains forbidden",
      status: !realRunAllowed ? "pass" : "fail",
      blocking: realRunAllowed,
      evidence: `real_run_allowed=${realRunAllowed}.`,
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification remains active",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${unsupportedActive}.`,
    },
    {
      id: "registry_ready_for_real_run",
      label: "Registry ready for real-run",
      status: registryReadyForRealRun ? "pass" : "fail",
      blocking: !registryReadyForRealRun,
      evidence: `registry_ready_for_real_run=${registryReadyForRealRun}.`,
    },
    {
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping ready for real-run",
      status: routerMappingReadyForRealRun ? "pass" : "fail",
      blocking: !routerMappingReadyForRealRun,
      evidence: `router_mapping_ready_for_real_run=${routerMappingReadyForRealRun}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: !targetCapabilitySelected,
      evidence: `target_capability_selected=${targetCapabilitySelected}.`,
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${payloadSchemaValidated}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy ready",
      status: promotionPolicyReady ? "pass" : "fail",
      blocking: !promotionPolicyReady,
      evidence: `promotion_policy_ready=${promotionPolicyReady}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: !rollbackValidated,
      evidence: `rollback_validated=${rollbackValidated}.`,
    },
    {
      id: "fresh_approval_available",
      label: "Fresh approval available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${freshApprovalMissing}.`,
    },
  ];

  return {
    available: true,
    readiness_version:
      "V5.43_REVIEW_DECISION_PERSISTENCE_HUMAN_REVIEW_READINESS",
    readiness_status: readinessStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    review_target: {
      target_table: "Operator_Approvals",
      future_action: "create_later",
      current_mode: "read_only_review_readiness",
      review_scope: "review_only",
      create_allowed_now: false,
      update_allowed_now: false,
      payload_send_allowed_now: false,
    },

    readiness_context: {
      payload_preview_available: payloadPreviewAvailable,
      payload_preview_status: payloadPreviewStatus || null,
      schema_preview_available: schemaPreviewAvailable,
      schema_preview_status: schemaPreviewStatus || null,
      preflight_available: preflightAvailable,
      preflight_status: preflightStatus || null,
      draft_available: draftAvailable,
      draft_status: draftStatus || null,
      operator_decision_draft_available: operatorDecisionDraftAvailable,
      human_review_gate_available: humanReviewGateAvailable,
    },

    operator_review_packet: {
      packet_ready_for_human_review: packetReadyForHumanReview,
      packet_scope: "review_only",
      recommended_decision_type: recommendedDecisionType,
      recommended_decision_label: recommendedDecisionLabel,
      mapping_candidate: mappingCandidate,
      proposal_confidence: proposalConfidence,
      review_status: reviewStatus || null,
      payload_preview_safe: payloadSafeForReviewOnlyPreview,
      schema_preview_safe: schemaSafeForReviewOnlyPreview,
      real_run_forbidden: true,
      mutation_forbidden: true,
      operator_approval_creation_forbidden: true,
    },

    allowed_human_actions_now: allowedHumanActionsNow,

    forbidden_human_actions_now: forbiddenHumanActionsNow,

    human_review_questions:
      humanReviewQuestions.length > 0
        ? humanReviewQuestions
        : [
            "Is incident_router the correct target capability for command_orchestrator?",
            "Should command_orchestrator route instead of execute directly?",
            "Should the mapping candidate be rejected?",
            "Should more evidence be requested before mutation?",
            "What exact Tool_Key should be written later?",
            "What exact Tool_Mode should be written later?",
            "What payload schema should incident_router require?",
            "What rollback path is acceptable?",
            "What fresh approval is required before mutation?",
            "What separate gate is required before real-run?",
          ],

    human_review_decision_options: {
      recommended_option: "REQUEST_MAPPING_REVIEW",
      safe_options: [
        "REVIEW_MAPPING_ONLY",
        "REJECT_MAPPING_CANDIDATE",
        "REQUEST_MAPPING_REFINEMENT",
      ],
      unsafe_options: [
        "APPROVE_TOOL_MAPPING_MUTATION",
        "APPROVE_REGISTRY_MUTATION",
        "APPROVE_COMMAND_CREATION",
        "APPROVE_REAL_RUN",
      ],
      mutation_options_blocked: true,
      real_run_options_blocked: true,
    },

    readiness_blockers: {
      low_confidence: lowConfidence,
      payload_preview_blocked: payloadPreviewBlocked,
      schema_preview_blocked: schemaPreviewBlocked,
      preflight_blocked: preflightBlocked,
      registry_not_ready: !registryReadyForRealRun,
      router_mapping_not_ready: !routerMappingReadyForRealRun,
      target_capability_not_selected: !targetCapabilitySelected,
      payload_schema_not_validated: !payloadSchemaValidated,
      promotion_policy_missing: !promotionPolicyReady,
      rollback_not_validated: !rollbackValidated,
      unsupported_active: unsupportedActive,
      fresh_approval_missing: freshApprovalMissing,
    },

    readiness_checks: readinessChecks,

    readiness_summary: {
      total_checks: readinessChecks.length,
      passed_checks: readinessChecks.filter((check) => check.status === "pass")
        .length,
      warning_checks: readinessChecks.filter(
        (check) => check.status === "warning"
      ).length,
      failed_checks: readinessChecks.filter((check) => check.status === "fail")
        .length,
      blocking_checks: readinessChecks.filter((check) => check.blocking)
        .length,
    },

    allowed_now: [
      "human_review_readiness",
      "review_mapping_only",
      "reject_mapping_candidate",
      "request_mapping_refinement",
    ],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "payload_send_to_airtable",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
      "worker_call",
    ],

    required_before_human_review_completion:
      requiredBeforeHumanReviewCompletion,

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : [
            "complete review-only human decision",
            "confirm mapping candidate scope",
            "confirm decision remains review_only",
            "confirm no mutation is requested",
            "confirm Operator_Approval creation is still disabled from this route",
            "confirm real-run remains forbidden",
          ],

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_payload_sent: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Present the review-only packet to a human operator. The operator may review the mapping, reject the candidate, or request refinement. Do not create Operator_Approval, send payload, mutate Airtable, call the worker, or allow real-run from this route.",

    guardrail_interpretation:
      "V5.43 is a review decision persistence human review readiness layer only. It does not create or update Operator_Approval records, send Airtable payloads, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

type ReviewDecisionHumanReviewPackageCheck = {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  blocking: boolean;
  evidence: string;
};

function buildReviewDecisionHumanReviewPackage(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionPersistenceHumanReviewReadiness: JsonRecord;
  reviewDecisionPersistencePayloadPreview: JsonRecord;
  reviewDecisionPersistenceSchemaPreview: JsonRecord;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  const readinessAvailable = pickBoolean(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["available"],
    false
  );

  const readinessStatus = pickString(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["readiness_status"]
  );

  const payloadPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["available"],
    false
  );

  const payloadPreviewStatus = pickString(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_preview_status"]
  );

  const schemaPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["available"],
    false
  );

  const schemaPreviewStatus = pickString(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_preview_status"]
  );

  const preflightAvailable = pickBoolean(
    args.reviewDecisionPersistencePreflight,
    ["available"],
    false
  );

  const preflightStatus = pickString(args.reviewDecisionPersistencePreflight, [
    "preflight_status",
  ]);

  const draftAvailable = pickBoolean(
    args.reviewDecisionPersistenceDraft,
    ["available"],
    false
  );

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const packetReadyForHumanReview = pickBoolean(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["operator_review_packet.packet_ready_for_human_review"],
    false
  );

  const payloadSafeForReviewOnlyPreview =
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_validation.payload_safe_for_review_only_preview",
    ]) ||
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "airtable_payload_preview.body_is_safe_for_preview",
    ]);

  const schemaSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_review_only_preview"],
    false
  );

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.reviewDecisionPersistenceHumanReviewReadiness, [
      "operator_review_packet.proposal_confidence",
    ]) ||
      pickString(args.reviewDecisionPersistencePayloadPreview, [
        "payload_decision.proposal_confidence",
      ]) ||
      pickString(args.reviewDecisionPersistenceSchemaPreview, [
        "source_draft.proposal_confidence",
      ]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const mappingCandidate =
    pickString(args.reviewDecisionPersistenceHumanReviewReadiness, [
      "operator_review_packet.mapping_candidate",
    ]) ||
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.mapping_candidate",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const recommendedDecisionType =
    pickString(args.reviewDecisionPersistenceHumanReviewReadiness, [
      "operator_review_packet.recommended_decision_type",
    ]) ||
    pickString(args.reviewDecisionPersistencePayloadPreview, [
      "payload_decision.decision_type",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) ||
    "REQUEST_MAPPING_REVIEW";

  const recommendedDecisionLabel =
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_label",
    ]) || "Review mapping candidate only";

  const proposedToolKey =
    pickString(args.toolMappingProposalDraft, ["proposal.proposed_tool_key"]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.proposed_tool_key",
    ]) ||
    null;

  const proposedToolMode =
    pickString(args.toolMappingProposalDraft, ["proposal.proposed_tool_mode"]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.proposed_tool_mode",
    ]) ||
    null;

  const realRunAllowed =
    pickBoolean(args.reviewDecisionPersistencePayloadPreview, [
      "payload_safety_flags.real_run_allowed",
    ]) ||
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, ["unsupported_confirmed"]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.reviewDecisionPersistenceHumanReviewReadiness, [
      "readiness_blockers.unsupported_active",
    ]);

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const targetCapabilitySelected =
    Boolean(
      pickString(args.targetCapabilityDecisionMatrix, [
        "selected_target_capability",
      ])
    ) ||
    pickBoolean(args.operatorDecisionReviewSummary, [
      "mapping_summary.target_capability_selected",
    ]);

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionPolicyReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    readinessStatus === "HUMAN_REVIEW_READINESS_BLOCKED_LOW_CONFIDENCE" ||
    payloadPreviewStatus ===
      "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_LOW_CONFIDENCE" ||
    schemaPreviewStatus ===
      "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_LOW_CONFIDENCE";

  const readinessBlocked =
    !readinessAvailable || !packetReadyForHumanReview;

  const payloadBlocked =
    !payloadPreviewAvailable || !payloadSafeForReviewOnlyPreview;

  const schemaBlocked =
    !schemaPreviewAvailable || !schemaSafeForReviewOnlyPreview;

  const realRunBlocked = !realRunAllowed || unsupportedActive;

  let packageStatus:
    | "HUMAN_REVIEW_PACKAGE_BLOCKED_LOW_CONFIDENCE"
    | "HUMAN_REVIEW_PACKAGE_BLOCKED_READINESS"
    | "HUMAN_REVIEW_PACKAGE_BLOCKED_PAYLOAD"
    | "HUMAN_REVIEW_PACKAGE_BLOCKED_SCHEMA"
    | "HUMAN_REVIEW_PACKAGE_BLOCKED_REAL_RUN"
    | "HUMAN_REVIEW_PACKAGE_READY_REVIEW_ONLY"
    | "HUMAN_REVIEW_PACKAGE_UNKNOWN" = "HUMAN_REVIEW_PACKAGE_UNKNOWN";

  if (lowConfidence) {
    packageStatus = "HUMAN_REVIEW_PACKAGE_BLOCKED_LOW_CONFIDENCE";
  } else if (readinessBlocked) {
    packageStatus = "HUMAN_REVIEW_PACKAGE_BLOCKED_READINESS";
  } else if (payloadBlocked) {
    packageStatus = "HUMAN_REVIEW_PACKAGE_BLOCKED_PAYLOAD";
  } else if (schemaBlocked) {
    packageStatus = "HUMAN_REVIEW_PACKAGE_BLOCKED_SCHEMA";
  } else if (realRunBlocked) {
    packageStatus = "HUMAN_REVIEW_PACKAGE_BLOCKED_REAL_RUN";
  } else {
    packageStatus = "HUMAN_REVIEW_PACKAGE_READY_REVIEW_ONLY";
  }

  const sourceCapability = mappingCandidate.split(" -> ")[0] || "command_orchestrator";
  const proposedTargetCapability =
    mappingCandidate.split(" -> ")[1] || "incident_router";

  const workerHttpStatus = Number(args.workerDryRunResult.http_status);
  const workerExecuted = Number(args.workerDryRunResult.executed);
  const workerUnsupported = Number(args.workerDryRunResult.unsupported);
  const workerErrorsCount = Number(args.workerDryRunResult.errors_count);

  const workerCommandRecordSeen =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "worker_command_record_seen",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "worker_result_scanned_count",
    ]) ||
    (Array.isArray(args.workerDryRunResult.commands_record_ids) &&
      args.commandRecordId !== null &&
      args.workerDryRunResult.commands_record_ids.includes(
        args.commandRecordId
      ));

  const allowedActionCards = [
    {
      action_id: "REVIEW_MAPPING_ONLY",
      label: "Review mapping only",
      description:
        "Operator can review the mapping candidate without approving mutation, persistence, payload send, worker call, or real-run.",
      allowed_now: true,
      scope: "review_only",
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
    },
    {
      action_id: "REJECT_MAPPING_CANDIDATE",
      label: "Reject mapping candidate",
      description:
        "Operator can reject the incident_router candidate without mutating Airtable or creating an approval record.",
      allowed_now: true,
      scope: "review_only",
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
    },
    {
      action_id: "REQUEST_MAPPING_REFINEMENT",
      label: "Request mapping refinement",
      description:
        "Operator can request more evidence or a better mapping candidate before any future mutation path.",
      allowed_now: true,
      scope: "review_only",
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
    },
  ];

  const blockedActionCards = [
    {
      action_id: "APPROVE_TOOL_MAPPING_MUTATION",
      label: "Approve Tool_Key / Tool_Mode mutation",
      allowed_now: false,
      reason:
        "Mutation approval is blocked because proposal confidence is low and mapping preflight is not ready.",
      blocked_by: [
        "proposal_confidence_low",
        "mapping_preflight_not_ready",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      action_id: "APPROVE_REGISTRY_MUTATION",
      label: "Approve registry mutation",
      allowed_now: false,
      reason:
        "Registry mutation is blocked because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
      blocked_by: [
        "registry_ready_false",
        "toolcatalog_entry_missing",
        "workspace_capability_entry_missing",
      ],
    },
    {
      action_id: "APPROVE_COMMAND_CREATION",
      label: "Approve command creation",
      allowed_now: false,
      reason:
        "Command creation is blocked because no target capability is selected with enough confidence.",
      blocked_by: [
        "target_capability_not_selected",
        "proposal_confidence_low",
        "command_creation_preflight_false",
      ],
    },
    {
      action_id: "APPROVE_REAL_RUN",
      label: "Approve real-run",
      allowed_now: false,
      reason:
        "Real-run is blocked because unsupported remains active and execution prerequisites are not validated.",
      blocked_by: [
        "real_run_forbidden",
        "unsupported_active",
        "payload_schema_not_validated",
        "rollback_not_validated",
        "fresh_real_run_approval_missing",
      ],
    },
    {
      action_id: "CALL_WORKER",
      label: "Call Worker",
      allowed_now: false,
      reason:
        "Worker call is forbidden from this GET/read-only review package surface.",
      blocked_by: ["worker_call_disabled_from_this_surface"],
    },
  ];

  const operatorReviewQuestions = [
    {
      question_id: "confirm_target_capability",
      question:
        "Is incident_router the correct target capability for command_orchestrator?",
      purpose:
        "Confirm whether the proposed routing target is semantically correct.",
      expected_answer_type: "confirm" as const,
      blocks_mutation_until_answered: true,
      blocks_real_run_until_answered: true,
    },
    {
      question_id: "confirm_orchestrator_role",
      question:
        "Should command_orchestrator route instead of execute directly?",
      purpose:
        "Confirm whether command_orchestrator is an orchestration capability rather than an executable capability.",
      expected_answer_type: "confirm" as const,
      blocks_mutation_until_answered: true,
      blocks_real_run_until_answered: true,
    },
    {
      question_id: "reject_or_refine_candidate",
      question:
        "Should the candidate be accepted for review discussion, rejected, or refined?",
      purpose:
        "Determine the safe next operator decision without mutation.",
      expected_answer_type: "refine" as const,
      blocks_mutation_until_answered: true,
      blocks_real_run_until_answered: true,
    },
    {
      question_id: "define_required_evidence",
      question:
        "What evidence is required to upgrade the mapping confidence from low to medium or high?",
      purpose:
        "Define what must be proven before any future persistence or mutation path.",
      expected_answer_type: "evidence" as const,
      blocks_mutation_until_answered: true,
      blocks_real_run_until_answered: true,
    },
    {
      question_id: "confirm_no_execution_now",
      question:
        "Can we confirm that no mutation, payload send, worker call, or real-run is requested now?",
      purpose:
        "Preserve read-only boundaries for V5.44.",
      expected_answer_type: "confirm" as const,
      blocks_mutation_until_answered: true,
      blocks_real_run_until_answered: true,
    },
  ];

  const riskRegister = [
    {
      risk_id: "low_confidence_mapping",
      label: "Mapping confidence is low",
      severity: "high" as const,
      active: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}.`,
      required_resolution:
        "Human review must accept, reject, or request refinement before any future persistence or mutation path.",
    },
    {
      risk_id: "unsupported_active",
      label: "Unsupported classification remains active",
      severity: "critical" as const,
      active: unsupportedActive,
      evidence: `unsupported_active=${String(unsupportedActive)}.`,
      required_resolution:
        "Resolve unsupported classification before any real-run approval.",
    },
    {
      risk_id: "registry_not_ready",
      label: "Registry is not ready",
      severity: "high" as const,
      active: !registryReadyForRealRun,
      evidence: `registry_ready_for_real_run=${String(
        registryReadyForRealRun
      )}.`,
      required_resolution:
        "Confirm ToolCatalog and Workspace_Capabilities entries before any execution path.",
    },
    {
      risk_id: "router_mapping_not_ready",
      label: "Router mapping is not ready",
      severity: "high" as const,
      active: !routerMappingReadyForRealRun,
      evidence: `router_mapping_ready_for_real_run=${String(
        routerMappingReadyForRealRun
      )}.`,
      required_resolution:
        "Validate router mapping before target command creation or execution.",
    },
    {
      risk_id: "payload_schema_not_validated",
      label: "Payload schema is not validated",
      severity: "high" as const,
      active: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${String(payloadSchemaValidated)}.`,
      required_resolution:
        "Validate payload schema before any future Operator_Approval creation or execution path.",
    },
    {
      risk_id: "rollback_not_validated",
      label: "Rollback is not validated",
      severity: "high" as const,
      active: !rollbackValidated,
      evidence: `rollback_validated=${String(rollbackValidated)}.`,
      required_resolution:
        "Define and validate rollback/cancel path before any mutation or real-run.",
    },
  ];

  const missingSections: string[] = [];

  if (!readinessAvailable) {
    missingSections.push("human_review_readiness");
  }

  if (!payloadPreviewAvailable) {
    missingSections.push("payload_preview");
  }

  if (!schemaPreviewAvailable) {
    missingSections.push("schema_preview");
  }

  if (!preflightAvailable) {
    missingSections.push("persistence_preflight");
  }

  if (!draftAvailable) {
    missingSections.push("persistence_draft");
  }

  const packageComplete = missingSections.length === 0;

  const packageChecks: ReviewDecisionHumanReviewPackageCheck[] = [
    {
      id: "human_review_readiness_available",
      label: "Human review readiness is available",
      status: readinessAvailable ? "pass" : "fail",
      blocking: !readinessAvailable,
      evidence: `readiness_available=${String(readinessAvailable)}.`,
    },
    {
      id: "packet_ready_for_human_review",
      label: "Packet is ready for human review display",
      status: packetReadyForHumanReview ? "pass" : "fail",
      blocking: !packetReadyForHumanReview,
      evidence: `packet_ready_for_human_review=${String(
        packetReadyForHumanReview
      )}.`,
    },
    {
      id: "payload_preview_available",
      label: "Payload preview is available",
      status: payloadPreviewAvailable ? "pass" : "fail",
      blocking: !payloadPreviewAvailable,
      evidence: `payload_preview_available=${String(payloadPreviewAvailable)}.`,
    },
    {
      id: "payload_safe_for_review_only_preview",
      label: "Payload is safe for review-only preview",
      status: payloadSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !payloadSafeForReviewOnlyPreview,
      evidence: `payload_safe_for_review_only_preview=${String(
        payloadSafeForReviewOnlyPreview
      )}.`,
    },
    {
      id: "schema_preview_available",
      label: "Schema preview is available",
      status: schemaPreviewAvailable ? "pass" : "fail",
      blocking: !schemaPreviewAvailable,
      evidence: `schema_preview_available=${String(schemaPreviewAvailable)}.`,
    },
    {
      id: "schema_safe_for_review_only_preview",
      label: "Schema is safe for review-only preview",
      status: schemaSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !schemaSafeForReviewOnlyPreview,
      evidence: `schema_safe_for_review_only_preview=${String(
        schemaSafeForReviewOnlyPreview
      )}.`,
    },
    {
      id: "allowed_review_actions_available",
      label: "Allowed review-only actions are available",
      status: allowedActionCards.length === 3 ? "pass" : "fail",
      blocking: allowedActionCards.length !== 3,
      evidence: `allowed_action_cards=${allowedActionCards.length}.`,
    },
    {
      id: "operator_approval_creation_forbidden",
      label: "Operator approval creation remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "create_allowed_now=false.",
    },
    {
      id: "payload_send_forbidden",
      label: "Payload send remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "payload_send_allowed_now=false.",
    },
    {
      id: "mutation_forbidden",
      label: "Mutation remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "mutation_allowed=false.",
    },
    {
      id: "worker_call_forbidden",
      label: "Worker call remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "worker_call_allowed_now=false.",
    },
    {
      id: "real_run_forbidden",
      label: "Real-run remains forbidden",
      status: "pass",
      blocking: false,
      evidence: "real_run_allowed_now=false.",
    },
    {
      id: "proposal_confidence_sufficient",
      label: "Proposal confidence is sufficient for future mutation",
      status: lowConfidence ? "fail" : "pass",
      blocking: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}.`,
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification remains active",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${String(unsupportedActive)}.`,
    },
    {
      id: "registry_ready_for_real_run",
      label: "Registry ready for real-run",
      status: registryReadyForRealRun ? "pass" : "fail",
      blocking: !registryReadyForRealRun,
      evidence: `registry_ready_for_real_run=${String(
        registryReadyForRealRun
      )}.`,
    },
    {
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping ready for real-run",
      status: routerMappingReadyForRealRun ? "pass" : "fail",
      blocking: !routerMappingReadyForRealRun,
      evidence: `router_mapping_ready_for_real_run=${String(
        routerMappingReadyForRealRun
      )}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: !targetCapabilitySelected,
      evidence: `target_capability_selected=${String(
        targetCapabilitySelected
      )}.`,
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${String(payloadSchemaValidated)}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy ready",
      status: promotionPolicyReady ? "pass" : "fail",
      blocking: !promotionPolicyReady,
      evidence: `promotion_policy_ready=${String(promotionPolicyReady)}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: !rollbackValidated,
      evidence: `rollback_validated=${String(rollbackValidated)}.`,
    },
    {
      id: "fresh_approval_available",
      label: "Fresh approval available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${String(freshApprovalMissing)}.`,
    },
  ];

  const requiredBeforeHumanReviewCompletion = [
    "review the mapping candidate command_orchestrator -> incident_router",
    "choose REVIEW_MAPPING_ONLY, REJECT_MAPPING_CANDIDATE, or REQUEST_MAPPING_REFINEMENT",
    "confirm no Operator_Approval creation is requested now",
    "confirm no payload send is requested now",
    "confirm no mutation is requested now",
    "confirm no worker call is requested now",
    "confirm real-run remains forbidden",
  ];

  const requiredBeforeOperatorApprovalCreation = pickArray<string>(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["required_before_operator_approval_creation"]
  );

  const requiredBeforePayloadSend = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_payload_send"]
  );

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["required_before_any_mutation"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionPersistenceHumanReviewReadiness,
    ["required_before_real_run"]
  );

  return {
    available: true,
    package_version: "V5.44_REVIEW_DECISION_HUMAN_REVIEW_PACKAGE",
    package_status: packageStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    package_target: {
      target_table: "Operator_Approvals",
      future_action: "create_later",
      current_mode: "read_only_human_review_package",
      review_scope: "review_only",
      create_allowed_now: false,
      update_allowed_now: false,
      payload_send_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_allowed_now: false,
    },

    operator_display_summary: {
      title: "Review mapping candidate",
      subtitle:
        "Review-only package for the low-confidence mapping candidate command_orchestrator -> incident_router.",
      decision_intent: "REQUEST_MAPPING_REVIEW",
      system_position:
        "The system can display a human review package, but cannot create approvals, mutate Airtable, send payloads, call the Worker, or run real execution.",
      safety_position:
        "Real-run remains forbidden because unsupported is active and execution prerequisites are not validated.",
      recommended_next_action:
        "Run human review of the mapping candidate and choose review only, reject candidate, or request refinement.",
    },

    case_evidence: {
      dry_run_transport_validated: workerHttpStatus === 200,
      worker_response_validated: pickBoolean(args.workerDryRunResult, [
        "ok",
      ]),
      worker_command_record_seen: workerCommandRecordSeen,
      worker_executed_zero: workerExecuted === 0,
      worker_unsupported_one: workerUnsupported === 1,
      worker_errors_zero: workerErrorsCount === 0,
      no_new_worker_call_from_this_surface: true,
      no_airtable_mutation_from_this_surface: true,
      no_real_run_from_this_surface: true,
    },

    decision_to_review: {
      recommended_decision_type: recommendedDecisionType,
      recommended_decision_label: recommendedDecisionLabel,
      decision_scope: "review_only",
      decision_status: "Draft",
      mapping_candidate: mappingCandidate,
      source_capability: sourceCapability,
      proposed_target_capability: proposedTargetCapability,
      proposed_tool_key: proposedToolKey,
      proposed_tool_mode: proposedToolMode,
      proposal_confidence: proposalConfidence,
      confidence_is_sufficient_for_mutation: false,
    },

    allowed_action_cards: allowedActionCards,

    blocked_action_cards: blockedActionCards,

    operator_review_questions: operatorReviewQuestions,

    review_notes_template: {
      summary_prompt:
        "Summarize the review-only decision for the mapping candidate without approving mutation or real-run.",
      acceptance_note_template:
        "Reviewed mapping candidate for discussion only. No mutation, no payload send, no Worker call, and no real-run approved.",
      rejection_note_template:
        "Rejected mapping candidate. No Airtable mutation, no Operator_Approval creation, no payload send, and no real-run approved.",
      refinement_note_template:
        "Requested mapping refinement. More evidence is required before any future persistence, mutation, or execution path.",
    },

    risk_register: riskRegister,

    readiness_snapshot: {
      human_review_readiness_available: readinessAvailable,
      readiness_status: readinessStatus || null,
      payload_preview_available: payloadPreviewAvailable,
      payload_preview_status: payloadPreviewStatus || null,
      schema_preview_available: schemaPreviewAvailable,
      schema_preview_status: schemaPreviewStatus || null,
      preflight_available: preflightAvailable,
      preflight_status: preflightStatus || null,
      draft_available: draftAvailable,
      draft_status: draftStatus || null,
    },

    package_validation: {
      package_complete: packageComplete,
      missing_sections: missingSections,
      safe_for_ui_display: packageComplete,
      safe_for_review_only:
        packageComplete &&
        packetReadyForHumanReview &&
        payloadSafeForReviewOnlyPreview &&
        schemaSafeForReviewOnlyPreview,
      safe_for_operator_approval_creation_now: false,
      safe_for_payload_send_now: false,
      safe_for_mutation_now: false,
      safe_for_real_run_now: false,
    },

    package_checks: packageChecks,

    package_summary: {
      total_checks: packageChecks.length,
      passed_checks: packageChecks.filter((check) => check.status === "pass")
        .length,
      warning_checks: packageChecks.filter(
        (check) => check.status === "warning"
      ).length,
      failed_checks: packageChecks.filter((check) => check.status === "fail")
        .length,
      blocking_checks: packageChecks.filter((check) => check.blocking).length,
    },

    allowed_now: [
      "human_review_package",
      "review_mapping_only",
      "reject_mapping_candidate",
      "request_mapping_refinement",
    ],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "payload_send_to_airtable",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
      "worker_call",
    ],

    required_before_human_review_completion:
      requiredBeforeHumanReviewCompletion,

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : [
            "complete review-only human decision",
            "confirm mapping candidate scope",
            "confirm decision remains review_only",
            "confirm no mutation is requested",
            "confirm Operator_Approval creation remains disabled from this route",
            "confirm real-run remains forbidden",
          ],

    required_before_payload_send:
      requiredBeforePayloadSend.length > 0
        ? requiredBeforePayloadSend
        : [
            "complete human review",
            "upgrade mapping confidence to medium or high",
            "validate Operator_Approvals schema",
            "create separate gated persistence endpoint",
            "keep payload send disabled from this route",
          ],

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_payload_sent: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Display this read-only human review package to guide operator review of the mapping candidate. Do not create Operator_Approval, send payload, mutate Airtable, call the Worker, or approve real-run from this route.",

    guardrail_interpretation:
      "V5.44 is a review decision human review package only. It does not create or update Operator_Approval records, send payloads to Airtable, mutate Airtable, create commands, create registry records, call the worker, or promote dry-run to real-run.",
  };
}

function buildReviewDecisionHumanDecisionCaptureDraft(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionHumanReviewPackage: JsonRecord;
  reviewDecisionPersistenceHumanReviewReadiness: JsonRecord;
  reviewDecisionPersistencePayloadPreview: JsonRecord;
  reviewDecisionPersistenceSchemaPreview: JsonRecord;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  type CaptureCheckStatus = "pass" | "warning" | "fail";

  type CaptureCheck = {
    id: string;
    label: string;
    status: CaptureCheckStatus;
    blocking: boolean;
    evidence: string;
  };

  const packageStatus = pickString(args.reviewDecisionHumanReviewPackage, [
    "package_status",
  ]);

  const payloadPreviewStatus = pickString(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_preview_status"]
  );

  const schemaPreviewStatus = pickString(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_preview_status"]
  );

  const preflightStatus = pickString(args.reviewDecisionPersistencePreflight, [
    "preflight_status",
  ]);

  const draftStatus = pickString(args.reviewDecisionPersistenceDraft, [
    "draft_status",
  ]);

  const mappingCandidate =
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.mapping_candidate",
    ]) ||
    pickString(args.operatorDecisionReviewSummary, [
      "mapping_summary.candidate",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "decision_context.mapping_candidate",
    ]) ||
    "command_orchestrator -> incident_router";

  const proposedToolKey =
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.proposed_tool_key",
    ]) ||
    pickString(args.toolMappingProposalDraft, ["proposal.proposed_tool_key"]) ||
    null;

  const proposedToolMode =
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.proposed_tool_mode",
    ]) ||
    pickString(args.toolMappingProposalDraft, ["proposal.proposed_tool_mode"]) ||
    null;

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.proposal_confidence",
    ]) ||
      pickString(args.reviewDecisionPersistencePayloadPreview, [
        "payload_decision.proposal_confidence",
      ]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.operatorDecisionDraft, [
        "decision_context.proposal_confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const recommendedDecisionType =
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.recommended_decision_type",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_type",
    ]) ||
    "REQUEST_MAPPING_REVIEW";

  const recommendedDecisionLabel =
    pickString(args.reviewDecisionHumanReviewPackage, [
      "decision_to_review.recommended_decision_label",
    ]) ||
    pickString(args.operatorDecisionDraft, [
      "proposed_operator_decision.decision_label",
    ]) ||
    "Review mapping candidate only";

  const packageAvailable = pickBoolean(args.reviewDecisionHumanReviewPackage, [
    "available",
  ]);

  const packageComplete = pickBoolean(args.reviewDecisionHumanReviewPackage, [
    "package_validation.package_complete",
  ]);

  const safeForUiDisplay = pickBoolean(args.reviewDecisionHumanReviewPackage, [
    "package_validation.safe_for_ui_display",
  ]);

  const safeForReviewOnly = pickBoolean(args.reviewDecisionHumanReviewPackage, [
    "package_validation.safe_for_review_only",
  ]);

  const payloadPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["available"]
  );

  const payloadSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.payload_safe_for_review_only_preview"]
  );

  const schemaPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["available"]
  );

  const schemaSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_review_only_preview"]
  );

  const preflightReadyForMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const operatorApprovalCreationAllowed = pickBoolean(
    args.reviewDecisionPersistencePreflight,
    ["safety_preflight.operator_approval_creation_allowed"],
    false
  );

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const targetCapabilitySelected = Boolean(
    pickString(args.targetCapabilityDecisionMatrix, [
      "selected_target_capability",
    ])
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionPolicyReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.operatorDecisionDraft, [
      "decision_context.unsupported_active",
    ]);

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    packageStatus === "HUMAN_REVIEW_PACKAGE_BLOCKED_LOW_CONFIDENCE" ||
    payloadPreviewStatus ===
      "REVIEW_DECISION_PAYLOAD_PREVIEW_BLOCKED_LOW_CONFIDENCE" ||
    schemaPreviewStatus ===
      "REVIEW_DECISION_SCHEMA_PREVIEW_BLOCKED_LOW_CONFIDENCE" ||
    preflightStatus ===
      "REVIEW_DECISION_PERSISTENCE_PREFLIGHT_BLOCKED_LOW_CONFIDENCE" ||
    draftStatus ===
      "REVIEW_DECISION_PERSISTENCE_DRAFT_BLOCKED_LOW_CONFIDENCE";

  let captureDraftStatus:
    | "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_LOW_CONFIDENCE"
    | "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PACKAGE"
    | "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PAYLOAD"
    | "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PREFLIGHT"
    | "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_REAL_RUN"
    | "HUMAN_DECISION_CAPTURE_DRAFT_READY_REVIEW_ONLY";

  if (lowConfidence) {
    captureDraftStatus =
      "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_LOW_CONFIDENCE";
  } else if (!packageAvailable || !packageComplete || !safeForUiDisplay) {
    captureDraftStatus = "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PACKAGE";
  } else if (!payloadPreviewAvailable || !payloadSafeForReviewOnlyPreview) {
    captureDraftStatus = "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PAYLOAD";
  } else if (!operatorApprovalCreationAllowed || !preflightReadyForMutation) {
    captureDraftStatus = "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_PREFLIGHT";
  } else if (!realRunAllowed || unsupportedActive) {
    captureDraftStatus = "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_REAL_RUN";
  } else {
    captureDraftStatus = "HUMAN_DECISION_CAPTURE_DRAFT_READY_REVIEW_ONLY";
  }

  const allowedDecisionCaptureOptions = [
    {
      option_id: "REVIEW_MAPPING_ONLY",
      label: "Review mapping only",
      decision_type: "REQUEST_MAPPING_REVIEW",
      decision_scope: "review_only",
      allowed_now: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      resulting_status_preview: "ReviewOnlyDraft",
    },
    {
      option_id: "REJECT_MAPPING_CANDIDATE",
      label: "Reject mapping candidate",
      decision_type: "REJECT_MAPPING_CANDIDATE",
      decision_scope: "review_only",
      allowed_now: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      resulting_status_preview: "RejectedDraft",
    },
    {
      option_id: "REQUEST_MAPPING_REFINEMENT",
      label: "Request mapping refinement",
      decision_type: "REQUEST_MAPPING_REFINEMENT",
      decision_scope: "review_only",
      allowed_now: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      resulting_status_preview: "RefinementRequestedDraft",
    },
  ];

  const blockedCaptureOptions = [
    {
      option_id: "APPROVE_TOOL_MAPPING_MUTATION",
      label: "Approve Tool_Key / Tool_Mode mutation",
      allowed_now: false,
      reason:
        "Tool mapping mutation is blocked because mapping confidence is low and mapping preflight is not ready.",
      blocked_by: [
        "proposal_confidence_low",
        "preflight_ready_for_mapping_mutation_false",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      option_id: "APPROVE_REGISTRY_MUTATION",
      label: "Approve registry mutation",
      allowed_now: false,
      reason:
        "Registry mutation is blocked because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
      blocked_by: [
        "registry_ready_false",
        "toolcatalog_entry_missing",
        "workspace_capability_entry_missing",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      option_id: "APPROVE_COMMAND_CREATION",
      label: "Approve command creation",
      allowed_now: false,
      reason:
        "Command creation is blocked because target capability is not selected with sufficient confidence.",
      blocked_by: [
        "target_capability_not_selected",
        "proposal_confidence_low",
        "command_creation_preflight_false",
      ],
    },
    {
      option_id: "APPROVE_REAL_RUN",
      label: "Approve real-run",
      allowed_now: false,
      reason:
        "Real-run is blocked because unsupported remains active, payload schema is not validated, rollback is not validated, and fresh real-run approval is missing.",
      blocked_by: [
        "real_run_forbidden",
        "unsupported_active",
        "payload_schema_not_validated",
        "rollback_not_validated",
        "fresh_real_run_approval_missing",
      ],
    },
  ];

  const requiredBeforeDecisionCapturePersistence = [
    "complete review-only human selection",
    "capture human review note",
    "confirm decision remains review_only",
    "confirm no mutation is requested",
    "confirm Operator_Approval creation remains disabled from this route",
    "confirm payload send to Airtable remains disabled",
    "confirm worker call remains disabled",
    "confirm real-run remains forbidden",
  ];

  const requiredBeforeOperatorApprovalCreation =
    pickArray<string>(args.reviewDecisionPersistencePayloadPreview, [
      "required_before_operator_approval_creation",
    ]);

  const requiredBeforePayloadSend = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_payload_send"]
  );

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_any_mutation"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionPersistencePayloadPreview,
    ["required_before_real_run"]
  );

  const captureChecks: CaptureCheck[] = [
    {
      id: "human_review_package_available",
      label: "Human review package is available",
      status: packageAvailable ? "pass" : "fail",
      blocking: !packageAvailable,
      evidence: `package_available=${String(packageAvailable)}.`,
    },
    {
      id: "human_review_package_complete",
      label: "Human review package is complete",
      status: packageComplete ? "pass" : "fail",
      blocking: !packageComplete,
      evidence: `package_complete=${String(packageComplete)}.`,
    },
    {
      id: "safe_for_ui_display",
      label: "Package is safe for UI display",
      status: safeForUiDisplay ? "pass" : "fail",
      blocking: !safeForUiDisplay,
      evidence: `safe_for_ui_display=${String(safeForUiDisplay)}.`,
    },
    {
      id: "safe_for_review_only",
      label: "Package is safe for review-only",
      status: safeForReviewOnly ? "pass" : "fail",
      blocking: !safeForReviewOnly,
      evidence: `safe_for_review_only=${String(safeForReviewOnly)}.`,
    },
    {
      id: "payload_preview_available",
      label: "Payload preview is available",
      status: payloadPreviewAvailable ? "pass" : "fail",
      blocking: !payloadPreviewAvailable,
      evidence: `payload_preview_available=${String(payloadPreviewAvailable)}.`,
    },
    {
      id: "payload_safe_for_review_only_preview",
      label: "Payload preview is safe for review-only",
      status: payloadSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !payloadSafeForReviewOnlyPreview,
      evidence: `payload_safe_for_review_only_preview=${String(
        payloadSafeForReviewOnlyPreview
      )}.`,
    },
    {
      id: "schema_preview_available",
      label: "Schema preview is available",
      status: schemaPreviewAvailable ? "pass" : "fail",
      blocking: !schemaPreviewAvailable,
      evidence: `schema_preview_available=${String(schemaPreviewAvailable)}.`,
    },
    {
      id: "schema_safe_for_review_only_preview",
      label: "Schema preview is safe for review-only",
      status: schemaSafeForReviewOnlyPreview ? "pass" : "fail",
      blocking: !schemaSafeForReviewOnlyPreview,
      evidence: `schema_safe_for_review_only_preview=${String(
        schemaSafeForReviewOnlyPreview
      )}.`,
    },
    {
      id: "proposal_confidence_sufficient",
      label: "Proposal confidence is sufficient for persistence",
      status: lowConfidence ? "fail" : "pass",
      blocking: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}. Medium or high is required before future persistence.`,
    },
    {
      id: "allowed_capture_options_present",
      label: "Allowed capture options are present",
      status: allowedDecisionCaptureOptions.length === 3 ? "pass" : "fail",
      blocking: allowedDecisionCaptureOptions.length !== 3,
      evidence: `allowed_options_count=${String(
        allowedDecisionCaptureOptions.length
      )}.`,
    },
    {
      id: "operator_approval_creation_forbidden",
      label: "Operator approval creation remains forbidden",
      status: !operatorApprovalCreationAllowed ? "pass" : "fail",
      blocking: operatorApprovalCreationAllowed,
      evidence: `operator_approval_creation_allowed=${String(
        operatorApprovalCreationAllowed
      )}.`,
    },
    {
      id: "preflight_ready_for_mapping_mutation",
      label: "Mapping mutation preflight is ready",
      status: preflightReadyForMutation ? "pass" : "fail",
      blocking: !preflightReadyForMutation,
      evidence: `preflight_ready_for_mapping_mutation=${String(
        preflightReadyForMutation
      )}.`,
    },
    {
      id: "registry_ready_for_real_run",
      label: "Registry ready for real-run",
      status: registryReadyForRealRun ? "pass" : "fail",
      blocking: !registryReadyForRealRun,
      evidence: `registry_ready_for_real_run=${String(
        registryReadyForRealRun
      )}.`,
    },
    {
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping ready for real-run",
      status: routerMappingReadyForRealRun ? "pass" : "fail",
      blocking: !routerMappingReadyForRealRun,
      evidence: `router_mapping_ready_for_real_run=${String(
        routerMappingReadyForRealRun
      )}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability selected",
      status: targetCapabilitySelected ? "pass" : "fail",
      blocking: !targetCapabilitySelected,
      evidence: `target_capability_selected=${String(
        targetCapabilitySelected
      )}.`,
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${String(payloadSchemaValidated)}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy ready",
      status: promotionPolicyReady ? "pass" : "fail",
      blocking: !promotionPolicyReady,
      evidence: `promotion_policy_ready=${String(promotionPolicyReady)}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: !rollbackValidated,
      evidence: `rollback_validated=${String(rollbackValidated)}.`,
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification remains active",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${String(unsupportedActive)}.`,
    },
    {
      id: "fresh_approval_missing",
      label: "Fresh approval is available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${String(freshApprovalMissing)}.`,
    },
  ];

  const captureSummary = {
    total_checks: captureChecks.length,
    passed_checks: captureChecks.filter((check) => check.status === "pass")
      .length,
    warning_checks: captureChecks.filter(
      (check) => check.status === "warning"
    ).length,
    failed_checks: captureChecks.filter((check) => check.status === "fail")
      .length,
    blocking_checks: captureChecks.filter((check) => check.blocking).length,
  };

  return {
    available: true,
    capture_draft_version:
      "V5.45_REVIEW_DECISION_HUMAN_DECISION_CAPTURE_DRAFT",
    capture_draft_status: captureDraftStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    capture_target: {
      target_table: "Operator_Approvals",
      future_action: "create_later",
      current_mode: "read_only_human_decision_capture_draft",
      review_scope: "review_only",
      capture_allowed_now: false,
      create_allowed_now: false,
      update_allowed_now: false,
      payload_send_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_allowed_now: false,
    },

    source_review_package: {
      package_available: packageAvailable,
      package_status: packageStatus || null,
      package_complete: packageComplete,
      safe_for_ui_display: safeForUiDisplay,
      safe_for_review_only: safeForReviewOnly,
      recommended_decision_type: recommendedDecisionType,
      mapping_candidate: mappingCandidate,
      proposal_confidence: proposalConfidence,
    },

    decision_capture_options: allowedDecisionCaptureOptions,

    proposed_capture_payloads: {
      review_mapping_only: {
        decision_type: "REQUEST_MAPPING_REVIEW",
        decision_scope: "review_only",
        decision_status: "Draft",
        mapping_candidate: mappingCandidate,
        proposal_confidence: proposalConfidence,
        review_note_required: true,
        safe_to_persist_now: false,
      },
      reject_mapping_candidate: {
        decision_type: "REJECT_MAPPING_CANDIDATE",
        decision_scope: "review_only",
        decision_status: "Draft",
        mapping_candidate: mappingCandidate,
        rejection_reason_required: true,
        safe_to_persist_now: false,
      },
      request_mapping_refinement: {
        decision_type: "REQUEST_MAPPING_REFINEMENT",
        decision_scope: "review_only",
        decision_status: "Draft",
        mapping_candidate: mappingCandidate,
        refinement_request_required: true,
        safe_to_persist_now: false,
      },
    },

    blocked_capture_options: blockedCaptureOptions,

    capture_form_preview: {
      form_ready_for_ui: true,
      form_scope: "review_only",
      required_inputs: [
        {
          input_id: "human_decision",
          label: "Human decision",
          input_type: "select",
          required: true,
          allowed_values: [
            "REVIEW_MAPPING_ONLY",
            "REJECT_MAPPING_CANDIDATE",
            "REQUEST_MAPPING_REFINEMENT",
          ],
          default_value: "REVIEW_MAPPING_ONLY",
          help_text:
            "Select a review-only decision. This does not create an Operator_Approval record.",
        },
        {
          input_id: "review_note",
          label: "Review note",
          input_type: "textarea",
          required: true,
          help_text:
            "Explain why the mapping candidate should be reviewed, rejected, or refined.",
        },
        {
          input_id: "confirm_no_mutation",
          label: "Confirm no mutation",
          input_type: "checkbox",
          required: true,
          default_value: false,
          help_text:
            "Confirm this decision does not mutate Airtable, create records, call the worker, or allow real-run.",
        },
      ],
      submit_allowed_now: false,
      submit_action_preview_only: true,
    },

    capture_validation: {
      capture_draft_available: true,
      allowed_options_count: allowedDecisionCaptureOptions.length,
      blocked_options_count: blockedCaptureOptions.length,
      review_note_required: true,
      human_selection_required: true,
      safe_for_ui_display: true,
      safe_for_review_only: true,
      safe_for_capture_now: false,
      safe_for_operator_approval_creation_now: false,
      safe_for_payload_send_now: false,
      safe_for_mutation_now: false,
      safe_for_real_run_now: false,
    },

    capture_blockers: {
      low_confidence: lowConfidence,
      package_blocked:
        !packageAvailable || !packageComplete || !safeForUiDisplay,
      payload_preview_blocked:
        !payloadPreviewAvailable || !payloadSafeForReviewOnlyPreview,
      schema_preview_blocked:
        !schemaPreviewAvailable || !schemaSafeForReviewOnlyPreview,
      preflight_blocked:
        !preflightReadyForMutation || !operatorApprovalCreationAllowed,
      registry_not_ready: !registryReadyForRealRun,
      router_mapping_not_ready: !routerMappingReadyForRealRun,
      target_capability_not_selected: !targetCapabilitySelected,
      payload_schema_not_validated: !payloadSchemaValidated,
      promotion_policy_missing: !promotionPolicyReady,
      rollback_not_validated: !rollbackValidated,
      unsupported_active: unsupportedActive,
      fresh_approval_missing: freshApprovalMissing,
    },

    capture_checks: captureChecks,

    capture_summary: captureSummary,

    allowed_now: [
      "human_decision_capture_draft",
      "review_mapping_only_draft",
      "reject_mapping_candidate_draft",
      "request_mapping_refinement_draft",
    ],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "payload_send_to_airtable",
      "decision_capture_persistence",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
      "worker_call",
    ],

    required_before_decision_capture_persistence:
      requiredBeforeDecisionCapturePersistence,

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : [
            "complete review-only human decision",
            "confirm mapping candidate scope",
            "confirm decision remains review_only",
            "confirm no mutation is requested",
            "confirm Operator_Approval creation is still disabled from this route",
            "confirm real-run remains forbidden",
          ],

    required_before_payload_send:
      requiredBeforePayloadSend.length > 0
        ? requiredBeforePayloadSend
        : [
            "complete review-only human decision",
            "confirm payload remains review_only",
            "confirm payload send is handled by a separate gated path",
            "confirm no real-run approval is included",
          ],

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_payload_sent: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_decision_captured: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Keep this as a read-only human decision capture draft. Display the draft in the UI or prepare the V5.46 UI Action Contract before any Operator_Approval creation path.",

    guardrail_interpretation:
      "V5.45 is a review decision human decision capture draft only. It does not capture a decision, create or update Operator_Approval records, mutate Airtable, send payloads, create commands, call the worker, or promote dry-run to real-run.",
  };
}

function buildReviewDecisionUIActionContract(args: {
  commandRecordId: string | null;
  commandId: string;
  workspaceId: string;
  incidentId: string;
  reviewDecisionHumanDecisionCaptureDraft: JsonRecord;
  reviewDecisionHumanReviewPackage: JsonRecord;
  reviewDecisionPersistenceHumanReviewReadiness: JsonRecord;
  reviewDecisionPersistencePayloadPreview: JsonRecord;
  reviewDecisionPersistenceSchemaPreview: JsonRecord;
  reviewDecisionPersistencePreflight: JsonRecord;
  reviewDecisionPersistenceDraft: JsonRecord;
  operatorDecisionReviewSummary: JsonRecord;
  operatorDecisionDraft: JsonRecord;
  humanReviewGate: JsonRecord;
  mappingPreflightChecklist: JsonRecord;
  toolMappingProposalDraft: JsonRecord;
  controlledMappingPlan: JsonRecord;
  toolcatalogRegistryReadiness: JsonRecord;
  workerRouterMappingInspection: JsonRecord;
  targetCapabilityDecisionMatrix: JsonRecord;
  executionMappingContractDraft: JsonRecord;
  unsupportedCommandDiagnosis: JsonRecord;
  workerDryRunResult: JsonRecord;
}) {
  type ContractCheckStatus = "pass" | "warning" | "fail";

  type ContractCheck = {
    id: string;
    label: string;
    status: ContractCheckStatus;
    blocking: boolean;
    evidence: string;
  };

  const captureDraftAvailable = pickBoolean(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["available"],
    false
  );

  const captureDraftStatus = pickString(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["capture_draft_status"]
  );

  const decisionCaptureOptions = pickArray<JsonRecord>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["decision_capture_options"]
  );

  const blockedCaptureOptions = pickArray<JsonRecord>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["blocked_capture_options"]
  );

  const safeForUiDisplay =
    pickBoolean(args.reviewDecisionHumanDecisionCaptureDraft, [
      "capture_validation.safe_for_ui_display",
    ]) ||
    pickBoolean(args.reviewDecisionHumanReviewPackage, [
      "package_validation.safe_for_ui_display",
    ]);

  const safeForReviewOnly =
    pickBoolean(args.reviewDecisionHumanDecisionCaptureDraft, [
      "capture_validation.safe_for_review_only",
    ]) ||
    pickBoolean(args.reviewDecisionHumanReviewPackage, [
      "package_validation.safe_for_review_only",
    ]);

  const packageAvailable = pickBoolean(
    args.reviewDecisionHumanReviewPackage,
    ["available"],
    false
  );

  const packageComplete = pickBoolean(
    args.reviewDecisionHumanReviewPackage,
    ["package_validation.package_complete"],
    false
  );

  const payloadPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["available"],
    false
  );

  const payloadSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistencePayloadPreview,
    ["payload_validation.payload_safe_for_review_only_preview"],
    false
  );

  const schemaPreviewAvailable = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["available"],
    false
  );

  const schemaSafeForReviewOnlyPreview = pickBoolean(
    args.reviewDecisionPersistenceSchemaPreview,
    ["schema_validation.schema_safe_for_review_only_preview"],
    false
  );

  const proposalConfidence = normalizeProposalConfidence(
    pickString(args.reviewDecisionHumanDecisionCaptureDraft, [
      "source_review_package.proposal_confidence",
    ]) ||
      pickString(args.reviewDecisionHumanReviewPackage, [
        "decision_to_review.proposal_confidence",
      ]) ||
      pickString(args.reviewDecisionPersistencePayloadPreview, [
        "payload_decision.proposal_confidence",
      ]) ||
      pickString(args.operatorDecisionReviewSummary, [
        "mapping_summary.confidence",
      ]) ||
      pickString(args.toolMappingProposalDraft, [
        "proposal.proposal_confidence",
      ])
  );

  const preflightReadyForMappingMutation = pickBoolean(
    args.mappingPreflightChecklist,
    ["preflight_ready_for_mapping_mutation"],
    false
  );

  const registryReadyForRealRun = pickBoolean(
    args.toolcatalogRegistryReadiness,
    ["registry_ready_for_real_run"],
    false
  );

  const routerMappingReadyForRealRun = pickBoolean(
    args.workerRouterMappingInspection,
    ["router_mapping_ready_for_real_run"],
    false
  );

  const selectedTargetCapability = pickString(
    args.targetCapabilityDecisionMatrix,
    ["selected_target_capability"]
  );

  const payloadSchemaValidated = pickBoolean(
    args.executionMappingContractDraft,
    ["payload_contract.payload_schema_validated"],
    false
  );

  const promotionPolicyReady = pickBoolean(
    args.executionMappingContractDraft,
    ["promotion_contract.promotion_ready"],
    false
  );

  const realRunAllowed =
    pickBoolean(args.executionMappingContractDraft, [
      "promotion_contract.real_run_allowed",
    ]) ||
    pickBoolean(args.mappingPreflightChecklist, ["real_run_allowed"], false);

  const unsupportedActive =
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "unsupported_confirmed",
    ]) ||
    pickBoolean(args.unsupportedCommandDiagnosis, [
      "real_execution_blocker",
    ]) ||
    pickBoolean(args.reviewDecisionHumanDecisionCaptureDraft, [
      "capture_blockers.unsupported_active",
    ]);

  const rollbackValidated = false;
  const freshApprovalMissing = true;

  const lowConfidence =
    proposalConfidence === "low" ||
    proposalConfidence === "unknown" ||
    captureDraftStatus ===
      "HUMAN_DECISION_CAPTURE_DRAFT_BLOCKED_LOW_CONFIDENCE";

  const captureDraftBlocked =
    !captureDraftAvailable || !safeForUiDisplay || !safeForReviewOnly;

  const packageBlocked = !packageAvailable || !packageComplete;

  const payloadPreviewBlocked =
    !payloadPreviewAvailable || !payloadSafeForReviewOnlyPreview;

  const schemaPreviewBlocked =
    !schemaPreviewAvailable || !schemaSafeForReviewOnlyPreview;

  const preflightBlocked = !preflightReadyForMappingMutation;

  const registryNotReady = !registryReadyForRealRun;
  const routerMappingNotReady = !routerMappingReadyForRealRun;
  const targetCapabilityNotSelected = !selectedTargetCapability;
  const payloadSchemaNotValidated = !payloadSchemaValidated;
  const promotionPolicyMissing = !promotionPolicyReady;

  let contractStatus:
    | "UI_ACTION_CONTRACT_BLOCKED_LOW_CONFIDENCE"
    | "UI_ACTION_CONTRACT_BLOCKED_CAPTURE_DRAFT"
    | "UI_ACTION_CONTRACT_BLOCKED_PACKAGE"
    | "UI_ACTION_CONTRACT_BLOCKED_PAYLOAD"
    | "UI_ACTION_CONTRACT_BLOCKED_REAL_RUN"
    | "UI_ACTION_CONTRACT_READY_REVIEW_ONLY"
    | "UI_ACTION_CONTRACT_UNKNOWN" = "UI_ACTION_CONTRACT_UNKNOWN";

  if (lowConfidence) {
    contractStatus = "UI_ACTION_CONTRACT_BLOCKED_LOW_CONFIDENCE";
  } else if (captureDraftBlocked) {
    contractStatus = "UI_ACTION_CONTRACT_BLOCKED_CAPTURE_DRAFT";
  } else if (packageBlocked) {
    contractStatus = "UI_ACTION_CONTRACT_BLOCKED_PACKAGE";
  } else if (payloadPreviewBlocked) {
    contractStatus = "UI_ACTION_CONTRACT_BLOCKED_PAYLOAD";
  } else if (!realRunAllowed || unsupportedActive) {
    contractStatus = "UI_ACTION_CONTRACT_BLOCKED_REAL_RUN";
  } else {
    contractStatus = "UI_ACTION_CONTRACT_READY_REVIEW_ONLY";
  }

  const actionContracts = [
    {
      action_id: "REVIEW_MAPPING_ONLY",
      ui_label: "Review mapping only",
      ui_variant: "secondary",
      ui_enabled: true,
      ui_visible: true,
      backend_action_allowed_now: false,
      method_allowed_now: "GET_ONLY",
      future_method_hint: "POST_LATER",
      future_endpoint_hint: null,
      requires_confirmation: false,
      requires_note: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      scope: "review_only",
      safe_now: true,
    },
    {
      action_id: "REJECT_MAPPING_CANDIDATE",
      ui_label: "Reject mapping candidate",
      ui_variant: "warning",
      ui_enabled: true,
      ui_visible: true,
      backend_action_allowed_now: false,
      method_allowed_now: "GET_ONLY",
      future_method_hint: "POST_LATER",
      future_endpoint_hint: null,
      requires_confirmation: true,
      requires_note: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      scope: "review_only",
      safe_now: true,
    },
    {
      action_id: "REQUEST_MAPPING_REFINEMENT",
      ui_label: "Request mapping refinement",
      ui_variant: "primary",
      ui_enabled: true,
      ui_visible: true,
      backend_action_allowed_now: false,
      method_allowed_now: "GET_ONLY",
      future_method_hint: "POST_LATER",
      future_endpoint_hint: null,
      requires_confirmation: false,
      requires_note: true,
      creates_record: false,
      mutates_system: false,
      sends_payload: false,
      calls_worker: false,
      allows_real_run: false,
      scope: "review_only",
      safe_now: true,
    },
  ];

  const disabledActionContracts = [
    {
      action_id: "APPROVE_TOOL_MAPPING_MUTATION",
      ui_label: "Approve Tool Mapping",
      ui_enabled: false,
      ui_visible: true,
      reason:
        "Tool mapping mutation is blocked because proposal confidence is low and mapping preflight is not ready.",
      blocked_by: [
        "proposal_confidence_low",
        "preflight_ready_for_mapping_mutation_false",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      action_id: "APPROVE_REGISTRY_MUTATION",
      ui_label: "Approve Registry Mutation",
      ui_enabled: false,
      ui_visible: true,
      reason:
        "Registry mutation is blocked because ToolCatalog and Workspace_Capabilities readiness are not confirmed.",
      blocked_by: [
        "registry_ready_false",
        "toolcatalog_entry_missing",
        "workspace_capability_entry_missing",
        "fresh_mutation_approval_missing",
      ],
    },
    {
      action_id: "APPROVE_COMMAND_CREATION",
      ui_label: "Approve Command Creation",
      ui_enabled: false,
      ui_visible: true,
      reason:
        "Command creation is blocked because no target capability is selected with sufficient confidence.",
      blocked_by: [
        "target_capability_not_selected",
        "proposal_confidence_low",
        "command_creation_preflight_false",
      ],
    },
    {
      action_id: "APPROVE_REAL_RUN",
      ui_label: "Approve Real Run",
      ui_enabled: false,
      ui_visible: true,
      reason:
        "Real-run is blocked because unsupported remains active and execution prerequisites are not validated.",
      blocked_by: [
        "real_run_forbidden",
        "unsupported_active",
        "payload_schema_not_validated",
        "rollback_not_validated",
        "fresh_real_run_approval_missing",
      ],
    },
  ];

  const allAllowedActionsAreReviewOnly = actionContracts.every(
    (action) => action.scope === "review_only"
  );

  const allAllowedActionsAreNonMutating = actionContracts.every(
    (action) => action.mutates_system === false && action.creates_record === false
  );

  const allAllowedActionsDoNotCallWorker = actionContracts.every(
    (action) => action.calls_worker === false
  );

  const allAllowedActionsDoNotSendPayload = actionContracts.every(
    (action) => action.sends_payload === false
  );

  const allBlockedActionsDisabled = disabledActionContracts.every(
    (action) => action.ui_enabled === false
  );

  const safeForUiRendering =
    captureDraftAvailable &&
    safeForUiDisplay &&
    safeForReviewOnly &&
    allAllowedActionsAreReviewOnly &&
    allAllowedActionsAreNonMutating &&
    allAllowedActionsDoNotCallWorker &&
    allAllowedActionsDoNotSendPayload &&
    allBlockedActionsDisabled;

  const contractChecks: ContractCheck[] = [
    {
      id: "capture_draft_available",
      label: "Human decision capture draft is available",
      status: captureDraftAvailable ? "pass" : "fail",
      blocking: !captureDraftAvailable,
      evidence: `capture_draft_available=${String(captureDraftAvailable)}.`,
    },
    {
      id: "capture_draft_safe_for_ui_display",
      label: "Capture draft is safe for UI display",
      status: safeForUiDisplay ? "pass" : "fail",
      blocking: !safeForUiDisplay,
      evidence: `safe_for_ui_display=${String(safeForUiDisplay)}.`,
    },
    {
      id: "capture_draft_safe_for_review_only",
      label: "Capture draft is safe for review-only mode",
      status: safeForReviewOnly ? "pass" : "fail",
      blocking: !safeForReviewOnly,
      evidence: `safe_for_review_only=${String(safeForReviewOnly)}.`,
    },
    {
      id: "allowed_actions_are_review_only",
      label: "Allowed UI actions are review-only",
      status: allAllowedActionsAreReviewOnly ? "pass" : "fail",
      blocking: !allAllowedActionsAreReviewOnly,
      evidence: `all_allowed_actions_are_review_only=${String(
        allAllowedActionsAreReviewOnly
      )}.`,
    },
    {
      id: "allowed_actions_are_non_mutating",
      label: "Allowed UI actions are non-mutating",
      status: allAllowedActionsAreNonMutating ? "pass" : "fail",
      blocking: !allAllowedActionsAreNonMutating,
      evidence: `all_allowed_actions_are_non_mutating=${String(
        allAllowedActionsAreNonMutating
      )}.`,
    },
    {
      id: "allowed_actions_do_not_call_worker",
      label: "Allowed UI actions do not call the Worker",
      status: allAllowedActionsDoNotCallWorker ? "pass" : "fail",
      blocking: !allAllowedActionsDoNotCallWorker,
      evidence: `all_allowed_actions_do_not_call_worker=${String(
        allAllowedActionsDoNotCallWorker
      )}.`,
    },
    {
      id: "allowed_actions_do_not_send_payload",
      label: "Allowed UI actions do not send payloads",
      status: allAllowedActionsDoNotSendPayload ? "pass" : "fail",
      blocking: !allAllowedActionsDoNotSendPayload,
      evidence: `all_allowed_actions_do_not_send_payload=${String(
        allAllowedActionsDoNotSendPayload
      )}.`,
    },
    {
      id: "blocked_actions_disabled",
      label: "Blocked actions are disabled",
      status: allBlockedActionsDisabled ? "pass" : "fail",
      blocking: !allBlockedActionsDisabled,
      evidence: `all_blocked_actions_disabled=${String(
        allBlockedActionsDisabled
      )}.`,
    },
    {
      id: "backend_actions_disabled_now",
      label: "Backend UI actions are disabled now",
      status: "pass",
      blocking: false,
      evidence: "backend_action_allowed_now=false for all review actions.",
    },
    {
      id: "operator_approval_creation_disabled",
      label: "Operator approval creation is disabled",
      status: "pass",
      blocking: false,
      evidence: "create_allowed_now=false.",
    },
    {
      id: "payload_send_disabled",
      label: "Payload send is disabled",
      status: "pass",
      blocking: false,
      evidence: "payload_send_allowed_now=false.",
    },
    {
      id: "low_confidence",
      label: "Proposal confidence is sufficient",
      status: lowConfidence ? "fail" : "pass",
      blocking: lowConfidence,
      evidence: `proposal_confidence=${proposalConfidence}.`,
    },
    {
      id: "unsupported_active",
      label: "Unsupported classification is resolved",
      status: unsupportedActive ? "fail" : "pass",
      blocking: unsupportedActive,
      evidence: `unsupported_active=${String(unsupportedActive)}.`,
    },
    {
      id: "registry_ready_for_real_run",
      label: "Registry is ready for real-run",
      status: registryReadyForRealRun ? "pass" : "fail",
      blocking: !registryReadyForRealRun,
      evidence: `registry_ready_for_real_run=${String(
        registryReadyForRealRun
      )}.`,
    },
    {
      id: "router_mapping_ready_for_real_run",
      label: "Router mapping is ready for real-run",
      status: routerMappingReadyForRealRun ? "pass" : "fail",
      blocking: !routerMappingReadyForRealRun,
      evidence: `router_mapping_ready_for_real_run=${String(
        routerMappingReadyForRealRun
      )}.`,
    },
    {
      id: "target_capability_selected",
      label: "Target capability is selected",
      status: selectedTargetCapability ? "pass" : "fail",
      blocking: !selectedTargetCapability,
      evidence: selectedTargetCapability
        ? `selected_target_capability=${selectedTargetCapability}.`
        : "selected_target_capability=null.",
    },
    {
      id: "payload_schema_validated",
      label: "Payload schema is validated",
      status: payloadSchemaValidated ? "pass" : "fail",
      blocking: !payloadSchemaValidated,
      evidence: `payload_schema_validated=${String(payloadSchemaValidated)}.`,
    },
    {
      id: "promotion_policy_ready",
      label: "Promotion policy is ready",
      status: promotionPolicyReady ? "pass" : "fail",
      blocking: !promotionPolicyReady,
      evidence: `promotion_policy_ready=${String(promotionPolicyReady)}.`,
    },
    {
      id: "rollback_validated",
      label: "Rollback is validated",
      status: rollbackValidated ? "pass" : "fail",
      blocking: !rollbackValidated,
      evidence: `rollback_validated=${String(rollbackValidated)}.`,
    },
    {
      id: "fresh_approval_available",
      label: "Fresh approval is available",
      status: freshApprovalMissing ? "fail" : "pass",
      blocking: freshApprovalMissing,
      evidence: `fresh_approval_missing=${String(freshApprovalMissing)}.`,
    },
  ];

  const requiredBeforeUiBackendAction = [
    "create a separate POST endpoint for review-only decision capture",
    "keep Operator_Approval creation disabled until explicit persistence gate",
    "validate CSRF/session/workspace authorization before any POST endpoint",
    "confirm action remains review_only",
    "confirm no Worker call is attached to UI action",
    "confirm no real-run can be triggered by UI action",
  ];

  const requiredBeforeOperatorApprovalCreation = pickArray<string>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["required_before_operator_approval_creation"]
  );

  const requiredBeforePayloadSend = pickArray<string>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["required_before_payload_send"]
  );

  const requiredBeforeAnyMutation = pickArray<string>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["required_before_any_mutation"]
  );

  const requiredBeforeRealRun = pickArray<string>(
    args.reviewDecisionHumanDecisionCaptureDraft,
    ["required_before_real_run"]
  );

  return {
    available: true,
    contract_version: "V5.46_REVIEW_DECISION_UI_ACTION_CONTRACT",
    contract_status: contractStatus,
    workspace_id: args.workspaceId,
    incident_id: args.incidentId,
    command_id: args.commandId,
    command_record_id: args.commandRecordId,

    ui_contract_target: {
      surface: "incident_detail",
      target_component_hint: "review_decision_actions",
      current_mode: "read_only_ui_action_contract",
      review_scope: "review_only",
      actions_renderable_now: true,
      actions_executable_now: false,
      create_allowed_now: false,
      update_allowed_now: false,
      payload_send_allowed_now: false,
      worker_call_allowed_now: false,
      real_run_allowed_now: false,
    },

    source_capture_draft: {
      capture_draft_available: captureDraftAvailable,
      capture_draft_status: captureDraftStatus || null,
      allowed_options_count:
        decisionCaptureOptions.length > 0 ? decisionCaptureOptions.length : 3,
      blocked_options_count:
        blockedCaptureOptions.length > 0 ? blockedCaptureOptions.length : 4,
      safe_for_ui_display: safeForUiDisplay,
      safe_for_review_only: safeForReviewOnly,
      safe_for_capture_now: false,
      safe_for_operator_approval_creation_now: false,
      safe_for_payload_send_now: false,
      safe_for_mutation_now: false,
      safe_for_real_run_now: false,
    },

    action_contracts: actionContracts,

    disabled_action_contracts: disabledActionContracts,

    ui_copy_contract: {
      title: "Review decision",
      subtitle: "Review-only mapping decision. No execution is allowed.",
      helper_text:
        "The operator can review, reject, or request refinement for the mapping candidate. No Operator_Approval is created from this surface.",
      safety_notice:
        "Real-run, mutation, Worker call, payload send, and Operator_Approval creation are disabled.",
      confidence_notice:
        "Mapping confidence remains low. Human review is required before any future mutation path.",
      unsupported_notice:
        "Unsupported classification remains active and blocks real execution.",
    },

    action_state_matrix: {
      review_mapping_only: {
        visible: true,
        enabled: true,
        executable_backend_now: false,
        persistence_now: false,
      },
      reject_mapping_candidate: {
        visible: true,
        enabled: true,
        executable_backend_now: false,
        persistence_now: false,
      },
      request_mapping_refinement: {
        visible: true,
        enabled: true,
        executable_backend_now: false,
        persistence_now: false,
      },
      approve_tool_mapping_mutation: {
        visible: true,
        enabled: false,
        executable_backend_now: false,
        persistence_now: false,
      },
      approve_registry_mutation: {
        visible: true,
        enabled: false,
        executable_backend_now: false,
        persistence_now: false,
      },
      approve_command_creation: {
        visible: true,
        enabled: false,
        executable_backend_now: false,
        persistence_now: false,
      },
      approve_real_run: {
        visible: true,
        enabled: false,
        executable_backend_now: false,
        persistence_now: false,
      },
    },

    contract_validation: {
      contract_available: true,
      action_contracts_count: actionContracts.length,
      disabled_action_contracts_count: disabledActionContracts.length,
      all_allowed_actions_are_review_only: allAllowedActionsAreReviewOnly,
      all_allowed_actions_are_non_mutating: allAllowedActionsAreNonMutating,
      all_allowed_actions_do_not_call_worker: allAllowedActionsDoNotCallWorker,
      all_allowed_actions_do_not_send_payload: allAllowedActionsDoNotSendPayload,
      all_blocked_actions_disabled: allBlockedActionsDisabled,
      safe_for_ui_rendering: safeForUiRendering,
      safe_for_backend_execution_now: false,
      safe_for_operator_approval_creation_now: false,
      safe_for_payload_send_now: false,
      safe_for_mutation_now: false,
      safe_for_real_run_now: false,
    },

    contract_blockers: {
      low_confidence: lowConfidence,
      capture_draft_blocked: captureDraftBlocked,
      package_blocked: packageBlocked,
      payload_preview_blocked: payloadPreviewBlocked,
      schema_preview_blocked: schemaPreviewBlocked,
      preflight_blocked: preflightBlocked,
      registry_not_ready: registryNotReady,
      router_mapping_not_ready: routerMappingNotReady,
      target_capability_not_selected: targetCapabilityNotSelected,
      payload_schema_not_validated: payloadSchemaNotValidated,
      promotion_policy_missing: promotionPolicyMissing,
      rollback_not_validated: !rollbackValidated,
      unsupported_active: unsupportedActive,
      fresh_approval_missing: freshApprovalMissing,
    },

    contract_checks: contractChecks,

    contract_summary: {
      total_checks: contractChecks.length,
      passed_checks: contractChecks.filter((check) => check.status === "pass")
        .length,
      warning_checks: contractChecks.filter(
        (check) => check.status === "warning"
      ).length,
      failed_checks: contractChecks.filter((check) => check.status === "fail")
        .length,
      blocking_checks: contractChecks.filter((check) => check.blocking).length,
    },

    allowed_now: [
      "ui_action_contract",
      "render_review_mapping_only",
      "render_reject_mapping_candidate",
      "render_request_mapping_refinement",
    ],

    forbidden_now: [
      "operator_approval_creation",
      "operator_approval_update",
      "payload_send_to_airtable",
      "decision_capture_persistence",
      "ui_backend_mutation",
      "mapping_mutation_approval",
      "registry_mutation_approval",
      "command_creation_approval",
      "real_run_approval",
      "worker_call",
    ],

    required_before_ui_backend_action: requiredBeforeUiBackendAction,

    required_before_operator_approval_creation:
      requiredBeforeOperatorApprovalCreation.length > 0
        ? requiredBeforeOperatorApprovalCreation
        : [
            "complete review-only human decision",
            "confirm mapping candidate scope",
            "confirm decision remains review_only",
            "confirm no mutation is requested",
            "confirm Operator_Approval creation is still disabled from this route",
            "confirm real-run remains forbidden",
          ],

    required_before_payload_send:
      requiredBeforePayloadSend.length > 0
        ? requiredBeforePayloadSend
        : [
            "complete review-only human decision",
            "validate Operator_Approvals schema",
            "validate payload fields",
            "create a separate gated persistence endpoint",
            "keep payload send disabled from this GET route",
          ],

    required_before_any_mutation:
      requiredBeforeAnyMutation.length > 0
        ? requiredBeforeAnyMutation
        : [
            "improve mapping confidence to medium or high",
            "define Tool_Key",
            "define Tool_Mode",
            "define target capability explicitly",
            "define ToolCatalog entry",
            "define Workspace_Capabilities entry",
            "validate payload schema",
            "validate rollback strategy",
            "create fresh operator approval for mutation",
            "use a separate gated mutation endpoint or manual controlled update",
          ],

    required_before_real_run:
      requiredBeforeRealRun.length > 0
        ? requiredBeforeRealRun
        : [
            "mapping mutation completed and rechecked",
            "registry ready",
            "router mapping ready",
            "target capability selected",
            "payload schema validated",
            "dry-run repeated successfully after mapping",
            "unsupported resolved",
            "promotion policy approved",
            "rollback/cancel path validated",
            "fresh real-run approval",
            "real-run feature gate explicitly opened in separate server-side route",
          ],

    audit: {
      no_airtable_mutation: true,
      no_payload_sent: true,
      no_operator_approval_created: true,
      no_operator_approval_updated: true,
      no_decision_captured: true,
      no_ui_backend_action_created: true,
      no_command_created: true,
      no_worker_call: true,
      no_real_run: true,
    },

    next_safe_action:
      "Use this contract to prepare a read-only UI render contract. Do not attach mutation, payload send, Worker call, Operator_Approval creation, or real-run to these actions.",

    guardrail_interpretation:
      "V5.46 is a review decision UI action contract only. It does not create UI backend actions, mutate Airtable, create or update Operator_Approval records, send payloads, create commands, call the worker, or promote dry-run to real-run.",
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

  if (
    Object.keys(workerResponseSanitized).length === 0 &&
    workerRunRecordId &&
    !configMissing &&
    airtable.baseId &&
    airtable.token
  ) {
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
      const fallback = buildWorkerResponseFallbackFromRecord({
        record: workerRunRead.record,
        workspaceId,
      });

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
          capability:
            stringField(commandFields, ["Capability", "capability"]) ||
            workerDryRunResult.capability ||
            "command_orchestrator",
        })
      : null;

  const toolcatalogRegistryReadiness = buildToolCatalogRegistryReadiness({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    capabilityRequested:
      stringField(commandFields, ["Capability", "capability"]) ||
      workerDryRunResult.capability ||
      "command_orchestrator",
    routerAllowlistReadiness,
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
    incidentId,
    commandFields,
    runInputJson,
    commandStatus,
    commandStatusSelect,
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
    routerAllowlistReadiness,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
  });

  const controlledMappingPlan = buildControlledMappingPlan({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    toolMappingProposalDraft,
    executionMappingContractDraft,
    targetCapabilityDecisionMatrix,
    workerRouterMappingInspection,
    toolcatalogRegistryReadiness,
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

  const mappingPreflightChecklist = buildMappingPreflightChecklist({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    approvalFound: Boolean(approvalRead.record),
    commandFields,
    workerDryRunResult,
    reviewCheck,
    routerAllowlistReadiness,
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
  });

  const operatorDecisionDraft = buildOperatorDecisionDraft({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    commandFields,
    commandStatus,
    commandStatusSelect,
    humanReviewGate,
    mappingPreflightChecklist,
    toolMappingProposalDraft,
    controlledMappingPlan,
    toolcatalogRegistryReadiness,
    executionMappingContractDraft,
    unsupportedCommandDiagnosis,
  });

  const operatorDecisionReviewSummary = buildOperatorDecisionReviewSummary({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    incidentId,
    operatorDecisionDraft,
    humanReviewGate,
    mappingPreflightChecklist,
    toolMappingProposalDraft,
    controlledMappingPlan,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
    unsupportedCommandDiagnosis,
    workerDryRunResult,
  });

  const reviewDecisionPersistenceDraft = buildReviewDecisionPersistenceDraft({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    incidentId,
    operatorDecisionReviewSummary,
    operatorDecisionDraft,
    humanReviewGate,
    mappingPreflightChecklist,
    toolMappingProposalDraft,
    controlledMappingPlan,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
    unsupportedCommandDiagnosis,
    workerDryRunResult,
  });

  const reviewDecisionPersistencePreflight =
    buildReviewDecisionPersistencePreflight({
      commandRecordId,
      commandId: ids.commandDraftId,
      workspaceId,
      incidentId,
      reviewDecisionPersistenceDraft,
      operatorDecisionReviewSummary,
      operatorDecisionDraft,
      humanReviewGate,
      mappingPreflightChecklist,
      toolMappingProposalDraft,
      controlledMappingPlan,
      toolcatalogRegistryReadiness,
      workerRouterMappingInspection,
      targetCapabilityDecisionMatrix,
      executionMappingContractDraft,
      unsupportedCommandDiagnosis,
      workerDryRunResult,
    });

  const reviewDecisionPersistenceSchemaPreview =
  buildReviewDecisionPersistenceSchemaPreview({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    incidentId,
    reviewDecisionPersistencePreflight,
    reviewDecisionPersistenceDraft,
    operatorDecisionReviewSummary,
    operatorDecisionDraft,
    humanReviewGate,
    mappingPreflightChecklist,
    toolMappingProposalDraft,
    controlledMappingPlan,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
    unsupportedCommandDiagnosis,
    workerDryRunResult,
  });

  const reviewDecisionPersistencePayloadPreview =
  buildReviewDecisionPersistencePayloadPreview({
    commandRecordId,
    commandId: ids.commandDraftId,
    workspaceId,
    incidentId,
    reviewDecisionPersistenceSchemaPreview,
    reviewDecisionPersistencePreflight,
    reviewDecisionPersistenceDraft,
    operatorDecisionReviewSummary,
    operatorDecisionDraft,
    humanReviewGate,
    mappingPreflightChecklist,
    toolMappingProposalDraft,
    controlledMappingPlan,
    toolcatalogRegistryReadiness,
    workerRouterMappingInspection,
    targetCapabilityDecisionMatrix,
    executionMappingContractDraft,
    unsupportedCommandDiagnosis,
    workerDryRunResult,
  });

    const reviewDecisionPersistenceHumanReviewReadiness =
    buildReviewDecisionPersistenceHumanReviewReadiness({
      commandRecordId,
      commandId: ids.commandDraftId,
      workspaceId,
      incidentId,
      reviewDecisionPersistencePayloadPreview,
      reviewDecisionPersistenceSchemaPreview,
      reviewDecisionPersistencePreflight,
      reviewDecisionPersistenceDraft,
      operatorDecisionReviewSummary,
      operatorDecisionDraft,
      humanReviewGate,
      mappingPreflightChecklist,
      toolMappingProposalDraft,
      controlledMappingPlan,
      toolcatalogRegistryReadiness,
      workerRouterMappingInspection,
      targetCapabilityDecisionMatrix,
      executionMappingContractDraft,
      unsupportedCommandDiagnosis,
      workerDryRunResult,
    });

    const reviewDecisionHumanReviewPackage =
    buildReviewDecisionHumanReviewPackage({
      commandRecordId,
      commandId: ids.commandDraftId,
      workspaceId,
      incidentId,
      reviewDecisionPersistenceHumanReviewReadiness,
      reviewDecisionPersistencePayloadPreview,
      reviewDecisionPersistenceSchemaPreview,
      reviewDecisionPersistencePreflight,
      reviewDecisionPersistenceDraft,
      operatorDecisionReviewSummary,
      operatorDecisionDraft,
      humanReviewGate,
      mappingPreflightChecklist,
      toolMappingProposalDraft,
      controlledMappingPlan,
      toolcatalogRegistryReadiness,
      workerRouterMappingInspection,
      targetCapabilityDecisionMatrix,
      executionMappingContractDraft,
      unsupportedCommandDiagnosis,
      workerDryRunResult,
    });

    const reviewDecisionHumanDecisionCaptureDraft =
      buildReviewDecisionHumanDecisionCaptureDraft({
      commandRecordId,
      commandId: ids.commandDraftId,
      workspaceId,
      incidentId,
      reviewDecisionHumanReviewPackage,
      reviewDecisionPersistenceHumanReviewReadiness,
      reviewDecisionPersistencePayloadPreview,
      reviewDecisionPersistenceSchemaPreview,
      reviewDecisionPersistencePreflight,
      reviewDecisionPersistenceDraft,
      operatorDecisionReviewSummary,
      operatorDecisionDraft,
      humanReviewGate,
      mappingPreflightChecklist,
      toolMappingProposalDraft,
      controlledMappingPlan,
      toolcatalogRegistryReadiness,
      workerRouterMappingInspection,
      targetCapabilityDecisionMatrix,
      executionMappingContractDraft,
      unsupportedCommandDiagnosis,
      workerDryRunResult,
    });

    const reviewDecisionUIActionContract =
      buildReviewDecisionUIActionContract({
      commandRecordId,
      commandId: ids.commandDraftId,
      workspaceId,
      incidentId,
      reviewDecisionHumanDecisionCaptureDraft,
      reviewDecisionHumanReviewPackage,
      reviewDecisionPersistenceHumanReviewReadiness,
      reviewDecisionPersistencePayloadPreview,
      reviewDecisionPersistenceSchemaPreview,  
      reviewDecisionPersistencePreflight,
      reviewDecisionPersistenceDraft,
      operatorDecisionReviewSummary,
      operatorDecisionDraft,
      humanReviewGate,
      mappingPreflightChecklist,
      toolMappingProposalDraft,
      controlledMappingPlan,
      toolcatalogRegistryReadiness,
      workerRouterMappingInspection,
      targetCapabilityDecisionMatrix,
      executionMappingContractDraft,
      unsupportedCommandDiagnosis,
      workerDryRunResult,
    });

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

    operator_decision_draft: operatorDecisionDraft,

    operator_decision_review_summary: operatorDecisionReviewSummary,

    review_decision_persistence_draft: reviewDecisionPersistenceDraft,

    review_decision_persistence_preflight: reviewDecisionPersistencePreflight,

    review_decision_persistence_schema_preview:
      reviewDecisionPersistenceSchemaPreview,

    review_decision_persistence_payload_preview:
      reviewDecisionPersistencePayloadPreview,

    review_decision_persistence_human_review_readiness:
      reviewDecisionPersistenceHumanReviewReadiness,

    review_decision_human_review_package: reviewDecisionHumanReviewPackage,

    review_decision_human_decision_capture_draft:
      reviewDecisionHumanDecisionCaptureDraft,

    review_decision_ui_action_contract: reviewDecisionUIActionContract,

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
        "This surface reviews the persisted V5.25.1 dry-run evidence only. V5.27 explains unsupported classification. V5.28 adds router / allowlist readiness. V5.29 adds registry readiness. V5.30 adds Worker router mapping. V5.31 adds target capability decision matrix. V5.32 adds execution mapping contract draft. V5.33 adds a read-only tool mapping proposal draft. V5.34 adds a controlled mapping plan. V5.35 adds a read-only mapping preflight checklist. V5.36 adds a human review gate. V5.37 adds a read-only operator decision draft. V5.38 adds an operator decision review summary. V5.39 adds a review decision persistence draft. V5.40 adds a review decision persistence preflight. V5.41 adds a review decision persistence schema preview. V5.42 adds a review decision persistence payload preview. V5.43 adds a review decision persistence human review readiness. V5.44 adds a review decision human review package. V5.45 adds a review decision human decision capture draft. V5.45 adds a review decision human decision capture draft. V5.46 adds a review decision UI action contract.",
      result_meaning:
        "Dry-run transport, auth, strict body, workspace routing, persisted worker evidence, unsupported classification, router readiness, registry readiness, router mapping, target capability decision constraints, execution mapping contract requirements, tool mapping proposal constraints, controlled mapping plan requirements, mapping preflight blockers, human review boundaries, operator decision draft options, operator decision review summary, review decision persistence draft, review decision persistence preflight, review decision persistence schema preview, review decision persistence payload preview, review decision persistence human review readiness, review decision human review package, and review decision human decision capture draft are now reviewed without executing a new run, review decision UI action contract.",
      router_allowlist_readiness_is_blocking_for_real_execution:
        !routerAllowlistReadiness.real_run_allowed_by_readiness,
      registry_readiness_is_blocking_for_real_execution:
        !toolcatalogRegistryReadiness.registry_ready_for_real_run,
      worker_router_mapping_is_blocking_for_real_execution:
        !workerRouterMappingInspection.router_mapping_ready_for_real_run,
      target_capability_decision_is_blocking_for_real_execution:
        !targetCapabilityDecisionMatrix.decision_ready,
      execution_mapping_contract_is_blocking_for_real_execution:
        !executionMappingContractDraft.contract_ready_for_execution,
      tool_mapping_proposal_is_blocking_for_real_execution:
        !toolMappingProposalDraft.proposal.proposal_apply_allowed,
      controlled_mapping_plan_is_blocking_for_real_execution:
        !controlledMappingPlan.plan_ready_for_execution,
      controlled_mapping_plan_is_blocking_for_mutation:
        !controlledMappingPlan.plan_ready_for_mutation,
      mapping_preflight_is_blocking_for_mapping_mutation:
        !mappingPreflightChecklist.preflight_ready_for_mapping_mutation,
      mapping_preflight_is_blocking_for_registry_mutation:
        !mappingPreflightChecklist.preflight_ready_for_registry_mutation,
      mapping_preflight_is_blocking_for_command_creation:
        !mappingPreflightChecklist.preflight_ready_for_command_creation,
      mapping_preflight_is_blocking_for_execution:
        !mappingPreflightChecklist.preflight_ready_for_execution,
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
        "This surface reviews previously persisted records only. It does not call the worker and does not inspect external scheduler activity.",
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
      "Complete operator decision review summary before any persistence draft",
      "Define dry_run_only to executable promotion policy",
      "Define rollback/cancel path before real execution",
      "Keep real execution behind a separate feature gate",
      "Keep POST /run server-side only",
      "Keep worker secret server-side only",
      "Require explicit operator confirmation before any non-dry-run execution",
      "Do not enable real run while unsupported remains unresolved",
      "Complete review decision persistence draft before any Operator_Approval creation",
      "Complete review decision persistence preflight before any Operator_Approval creation",
      "Complete review decision persistence schema preview before any Operator_Approval creation",
      "Complete review decision persistence payload preview before any Operator_Approval creation",
      "Complete review decision persistence human review readiness before any Operator_Approval creation",
      "Complete review decision human review package before any Operator_Approval creation",
      "Complete review decision human decision capture draft before any Operator_Approval creation",
      "Complete review decision UI action contract before any Operator_Approval creation",
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
      operator_decision_review_mutation: "DISABLED",
      toolcatalog_creation: "DISABLED",
      workspace_capabilities_creation: "DISABLED",
      registry_mutation: "DISABLED",
      secret_exposure: "DISABLED",
      review_only: true,
      review_decision_persistence_mutation: "DISABLED",
      operator_approval_creation: "DISABLED",
      review_decision_persistence_preflight_mutation: "DISABLED",
      review_decision_persistence_schema_preview_mutation: "DISABLED",
      operator_approval_update: "DISABLED",
      review_decision_persistence_payload_preview_mutation: "DISABLED",
      operator_approval_payload_send: "DISABLED",
      payload_send_to_airtable: "DISABLED",
      review_decision_persistence_human_review_readiness_mutation: "DISABLED",
      human_review_completion_mutation: "DISABLED",
      review_decision_human_review_package_mutation: "DISABLED",
      human_review_package_persistence: "DISABLED",
      human_review_package_execution: "DISABLED",
      review_decision_human_decision_capture_draft_mutation: "DISABLED",
      human_decision_capture_persistence: "DISABLED",
      human_decision_capture_execution: "DISABLED",
      review_decision_ui_action_contract_mutation: "DISABLED",
      ui_backend_action_mutation: "DISABLED",
      ui_action_execution: "DISABLED",
    },

    error:
      status === "POST_RUN_DRY_RUN_RESULT_REVIEW_READY"
        ? null
        : "Dry-run result review is not ready. Check status, audit_json_compatibility, worker_run_record_fallback, unsupported_command_diagnosis, router_allowlist_readiness, toolcatalog_registry_readiness, worker_router_mapping_inspection, target_capability_decision_matrix, execution_mapping_contract_draft, tool_mapping_proposal_draft, controlled_mapping_plan, mapping_preflight_checklist, human_review_gate, operator_decision_draft, operator_decision_review_summary, and read sections.",
    next_step:
      "Next safe step: V5.47 Review Decision UI Render Contract, still read-only / no mutation, before any Operator_Approval creation.",
  });
}
