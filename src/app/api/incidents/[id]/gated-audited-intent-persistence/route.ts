import { NextRequest, NextResponse } from "next/server";

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

const VERSION = "Incident Detail V5.8";

const SOURCE =

  "dashboard_incident_detail_v5_8_gated_audited_intent_persistence";

const FEATURE_GATE_ENV = "BOSAI_AUDITED_INTENT_PERSISTENCE_ENABLED";

const CONFIRMATION_TOKEN = "PERSIST_DRAFT_INTENT";

function normalizeText(value: string | null | undefined): string {

  return typeof value === "string" ? value.trim() : "";

}

function normalizeIncidentId(value: string | null | undefined): string {

  const trimmed = normalizeText(value);

  return trimmed.length > 0 ? trimmed : "unknown";

}

function normalizeWorkspaceId(value: string | null | undefined): string {

  const trimmed = normalizeText(value);

  return trimmed.length > 0 ? trimmed : "production";

}

function isFeatureGateEnabled(): boolean {

  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string") {

    return false;

  }

  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());

}

function getAirtableToken(): string | null {

  return (

    process.env.AIRTABLE_API_KEY ||

    process.env.AIRTABLE_TOKEN ||

    process.env.AIRTABLE_PAT ||

    null

  );

}

function getAirtableBaseId(): string | null {

  return process.env.AIRTABLE_BASE_ID || process.env.BOSAI_AIRTABLE_BASE_ID || null;

}

function getOperatorIntentsTable(): string {

  return (

    process.env.AIRTABLE_OPERATOR_INTENTS_TABLE ||

    process.env.BOSAI_OPERATOR_INTENTS_TABLE ||

    "Operator_Intents"

  );

}

function buildIntentId(workspaceId: string, incidentId: string): string {

  return `operator-intent:v5.4:${workspaceId}:${incidentId}`;

}

function buildPersistenceId(workspaceId: string, incidentId: string): string {

  return `intent-persistence:v5.8:${workspaceId}:${incidentId}`;

}

function buildIdempotencyKey(workspaceId: string, incidentId: string): string {

  return `dashboard:v5.8:gated-audited-intent-persistence:${workspaceId}:${incidentId}`;

}

function escapeAirtableFormulaValue(value: string): string {

  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

}

function buildFields(input: {

  workspaceId: string;

  incidentId: string;

  intentId: string;

  persistenceId: string;

  idempotencyKey: string;

}) {

  return {

    Idempotency_Key: input.idempotencyKey,

    Intent_ID: input.intentId,

    Persistence_ID: input.persistenceId,

    Workspace_ID: input.workspaceId,

    Incident_ID: input.incidentId,

    Target_Capability: "command_orchestrator",

    Target_Mode: "dry_run_only",

    Proposed_Action: "prepare_controlled_worker_dry_run_followup",

    Status: "Draft",

    Operator_Confirmation: "Required",

    Execution_Allowed: false,

    Submission_Allowed: false,

    Persistence_Allowed: true,

    Real_Run: "Forbidden",

    Secret_Exposure: "Disabled",

    Source_Layer: VERSION,

  };

}

function buildBasePayload(input: {

  incidentId: string;

  workspaceId: string;

  actionStatus:

    | "PERSISTENCE_BLOCKED_BY_FEATURE_GATE"

    | "PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"

    | "OPERATOR_CONFIRMATION_REQUIRED"

    | "REAL_RUN_FORBIDDEN"

    | "PERSISTENCE_CONFIG_MISSING"

    | "INTENT_ALREADY_PERSISTED"

    | "INTENT_PERSISTED_AS_DRAFT"

    | "INTENT_PERSISTENCE_FAILED";

  featureGateEnabled: boolean;

  method: "GET" | "POST";

  airtableRecordId?: string | null;

  airtableHttpStatus?: number | null;

  error?: string | null;

}) {

  const intentId = buildIntentId(input.workspaceId, input.incidentId);

  const persistenceId = buildPersistenceId(input.workspaceId, input.incidentId);

  const idempotencyKey = buildIdempotencyKey(input.workspaceId, input.incidentId);

  const fields = buildFields({

    workspaceId: input.workspaceId,

    incidentId: input.incidentId,

    intentId,

    persistenceId,

    idempotencyKey,

  });

  const airtableToken = getAirtableToken();

  const airtableBaseId = getAirtableBaseId();

  const airtableTable = getOperatorIntentsTable();

  const persistenceExecuted =

    input.actionStatus === "INTENT_ALREADY_PERSISTED" ||

    input.actionStatus === "INTENT_PERSISTED_AS_DRAFT";

  return {

    ok:

      input.actionStatus !== "REAL_RUN_FORBIDDEN" &&

      input.actionStatus !== "PERSISTENCE_CONFIG_MISSING" &&

      input.actionStatus !== "INTENT_PERSISTENCE_FAILED",

    version: VERSION,

    source: SOURCE,

    status: input.actionStatus,

    mode: "GATED_AUDITED_INTENT_PERSISTENCE",

    method: input.method,

    incident_id: input.incidentId,

    workspace_id: input.workspaceId,

    dry_run: true,

    feature_gate_env: FEATURE_GATE_ENV,

    feature_gate_enabled: input.featureGateEnabled,

    intent_id: intentId,

    persistence_id: persistenceId,

    persistence_status: persistenceExecuted

      ? "PERSISTED_AS_DRAFT"

      : "NOT_PERSISTED",

    intent_submission: "DISABLED",

    intent_persistence: persistenceExecuted ? "PERSISTED_AS_DRAFT" : "DISABLED",

    operator_confirmation:

      input.method === "POST" ? "CAPTURED_FOR_DRAFT_PERSISTENCE" : "REQUIRED",

    real_run: "FORBIDDEN",

    worker_call: "DISABLED_FROM_THIS_SURFACE",

    post_run: "DISABLED_FROM_THIS_SURFACE",

    secret_exposure: "DISABLED",

    dashboard_airtable_mutation: persistenceExecuted

      ? "AUDITED_INTENT_DRAFT_CREATED"

      : "DISABLED",

    previous_layer: {

      version: "Incident Detail V5.7",

      status: "SERVER_SIDE_DRY_RUN_WRITE_PREVIEW_READY",

      dry_run_write_preview: "VALIDATED",

      execution_policy: "READ_ONLY_WRITE_PREVIEW",

    },

    persistence_gate: {

      feature_gate_env: FEATURE_GATE_ENV,

      feature_gate_enabled: input.featureGateEnabled,

      required_confirmation_token: CONFIRMATION_TOKEN,

      write_allowed_now: input.featureGateEnabled && input.method === "POST",

      write_executed: persistenceExecuted,

      target_status: "Draft",

    },

    airtable_config: {

      base_id: airtableBaseId ? "CONFIGURED" : "MISSING",

      table: airtableTable,

      token: airtableToken ? "CONFIGURED" : "MISSING",

      token_value: "SERVER_SIDE_ONLY_NOT_EXPOSED",

    },

    idempotency: {

      key: idempotencyKey,

      deterministic: true,

      secret: false,

      scope: "workspace_and_incident",

    },

    airtable_request_preview: {

      method: "POST",

      target_table: airtableTable,

      mutation:

        input.method === "POST" && input.featureGateEnabled

          ? "CONTROLLED_DRAFT_PERSISTENCE"

          : "DISABLED",

      write_sent: persistenceExecuted,

      headers: {

        authorization: "SERVER_SIDE_ONLY_NOT_EXPOSED",

        content_type: "application/json",

      },

      body: {

        fields,

      },

    },

    airtable_response: {

      record_id: input.airtableRecordId ?? null,

      http_status: input.airtableHttpStatus ?? null,

      error: input.error ?? null,

    },

    guardrails: {

      client_fetch: "DISABLED",

      worker_call: "DISABLED_FROM_THIS_SURFACE",

      post_run: "DISABLED_FROM_THIS_SURFACE",

      real_run: "FORBIDDEN",

      dry_run_only: true,

      incident_mutation: "DISABLED",

      command_mutation: "DISABLED",

      run_mutation: "DISABLED",

      secret_exposure: "DISABLED",

      idempotency_required: true,

      status_forced_to_draft: true,

      command_creation: "DISABLED",

      run_creation: "DISABLED",

    },

    next_step:

      "V5.9 may introduce an operator intent review surface before any command creation path.",

  };

}

async function findExistingRecord(input: {

  token: string;

  baseId: string;

  table: string;

  idempotencyKey: string;

}): Promise<{ id: string } | null> {

  const formula = `{Idempotency_Key} = '${escapeAirtableFormulaValue(

    input.idempotencyKey

  )}'`;

  const url = new URL(

    `https://api.airtable.com/v0/${encodeURIComponent(input.baseId)}/${encodeURIComponent(

      input.table

    )}`

  );

  url.searchParams.set("maxRecords", "1");

  url.searchParams.set("filterByFormula", formula);

  const response = await fetch(url.toString(), {

    method: "GET",

    cache: "no-store",

    headers: {

      Authorization: `Bearer ${input.token}`,

    },

  });

  if (!response.ok) {

    return null;

  }

  const json = (await response.json()) as {

    records?: Array<{

      id?: string;

    }>;

  };

  const id = json.records?.[0]?.id;

  return id ? { id } : null;

}

async function createAirtableRecord(input: {

  token: string;

  baseId: string;

  table: string;

  fields: Record<string, unknown>;

}): Promise<{

  ok: boolean;

  status: number;

  recordId: string | null;

  error: string | null;

}> {

  const url = `https://api.airtable.com/v0/${encodeURIComponent(

    input.baseId

  )}/${encodeURIComponent(input.table)}`;

  const response = await fetch(url, {

    method: "POST",

    cache: "no-store",

    headers: {

      Authorization: `Bearer ${input.token}`,

      "Content-Type": "application/json",

    },

    body: JSON.stringify({

      records: [

        {

          fields: input.fields,

        },

      ],

    }),

  });

  const text = await response.text();

  if (!response.ok) {

    return {

      ok: false,

      status: response.status,

      recordId: null,

      error: text.slice(0, 1200),

    };

  }

  try {

    const json = JSON.parse(text) as {

      records?: Array<{

        id?: string;

      }>;

    };

    return {

      ok: true,

      status: response.status,

      recordId: json.records?.[0]?.id ?? null,

      error: null,

    };

  } catch {

    return {

      ok: true,

      status: response.status,

      recordId: null,

      error: null,

    };

  }

}

export async function GET(request: NextRequest, context: RouteContext) {

  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);

  const workspaceId = normalizeWorkspaceId(

    request.nextUrl.searchParams.get("workspace_id") ??

      request.nextUrl.searchParams.get("workspaceId")

  );

  const featureGateEnabled = isFeatureGateEnabled();

  return NextResponse.json(

    buildBasePayload({

      incidentId,

      workspaceId,

      featureGateEnabled,

      method: "GET",

      actionStatus: featureGateEnabled

        ? "PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"

        : "PERSISTENCE_BLOCKED_BY_FEATURE_GATE",

    }),

    {

      status: 200,

      headers: {

        "Cache-Control": "no-store, no-cache, must-revalidate",

      },

    }

  );

}

export async function POST(request: NextRequest, context: RouteContext) {

  const params = await Promise.resolve(context.params);

  const incidentId = normalizeIncidentId(params.id);

  const workspaceId = normalizeWorkspaceId(

    request.nextUrl.searchParams.get("workspace_id") ??

      request.nextUrl.searchParams.get("workspaceId")

  );

  const featureGateEnabled = isFeatureGateEnabled();

  let body: {

    operator_confirmation?: string;

    dry_run?: unknown;

  } = {};

  try {

    body = (await request.json()) as typeof body;

  } catch {

    body = {};

  }

  if (body.dry_run === false || body.dry_run === "false") {

    return NextResponse.json(

      buildBasePayload({

        incidentId,

        workspaceId,

        featureGateEnabled,

        method: "POST",

        actionStatus: "REAL_RUN_FORBIDDEN",

        error: "dry_run:false is forbidden.",

      }),

      { status: 200 }

    );

  }

  if (!featureGateEnabled) {

    return NextResponse.json(

      buildBasePayload({

        incidentId,

        workspaceId,

        featureGateEnabled,

        method: "POST",

        actionStatus: "PERSISTENCE_BLOCKED_BY_FEATURE_GATE",

      }),

      { status: 200 }

    );

  }

  if (body.operator_confirmation !== CONFIRMATION_TOKEN) {

    return NextResponse.json(

      buildBasePayload({

        incidentId,

        workspaceId,

        featureGateEnabled,

        method: "POST",

        actionStatus: "OPERATOR_CONFIRMATION_REQUIRED",

        error: `operator_confirmation must equal ${CONFIRMATION_TOKEN}.`,

      }),

      { status: 200 }

    );

  }

  const token = getAirtableToken();

  const baseId = getAirtableBaseId();

  const table = getOperatorIntentsTable();

  if (!token || !baseId) {

    return NextResponse.json(

      buildBasePayload({

        incidentId,

        workspaceId,

        featureGateEnabled,

        method: "POST",

        actionStatus: "PERSISTENCE_CONFIG_MISSING",

        error: "Missing Airtable token or base id.",

      }),

      { status: 200 }

    );

  }

  const intentId = buildIntentId(workspaceId, incidentId);

  const persistenceId = buildPersistenceId(workspaceId, incidentId);

  const idempotencyKey = buildIdempotencyKey(workspaceId, incidentId);

  const fields = buildFields({

    workspaceId,

    incidentId,

    intentId,

    persistenceId,

    idempotencyKey,

  });

  const existing = await findExistingRecord({

    token,

    baseId,

    table,

    idempotencyKey,

  });

  if (existing) {

    return NextResponse.json(

      buildBasePayload({

        incidentId,

        workspaceId,

        featureGateEnabled,

        method: "POST",

        actionStatus: "INTENT_ALREADY_PERSISTED",

        airtableRecordId: existing.id,

        airtableHttpStatus: 200,

      }),

      { status: 200 }

    );

  }

  const created = await createAirtableRecord({

    token,

    baseId,

    table,

    fields,

  });

  return NextResponse.json(

    buildBasePayload({

      incidentId,

      workspaceId,

      featureGateEnabled,

      method: "POST",

      actionStatus: created.ok

        ? "INTENT_PERSISTED_AS_DRAFT"

        : "INTENT_PERSISTENCE_FAILED",

      airtableRecordId: created.recordId,

      airtableHttpStatus: created.status,

      error: created.error,

    }),

    { status: 200 }

  );

}
