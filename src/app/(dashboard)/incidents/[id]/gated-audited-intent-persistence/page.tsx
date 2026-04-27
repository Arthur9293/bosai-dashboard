import Link from "next/link";

import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type PageProps = {

  params:

    | Promise<{

        id: string;

      }>

    | {

        id: string;

      };

  searchParams?: Promise<Record<string, string | string[] | undefined>>;

};

const VERSION = "Incident Detail V5.8";

const FEATURE_GATE_ENV = "BOSAI_AUDITED_INTENT_PERSISTENCE_ENABLED";

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

function firstSearchParam(

  searchParams: Record<string, string | string[] | undefined>,

  key: string

): string | undefined {

  const value = searchParams[key];

  return Array.isArray(value) ? value[0] : value;

}

function isFeatureGateEnabled(): boolean {

  const raw = process.env[FEATURE_GATE_ENV];

  if (typeof raw !== "string") {

    return false;

  }

  return ["true", "1", "yes", "on"].includes(raw.trim().toLowerCase());

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

function withWorkspace(href: string, workspaceId: string): string {

  const separator = href.includes("?") ? "&" : "?";

  return `${href}${separator}workspace_id=${encodeURIComponent(workspaceId)}`;

}

function Card(props: {

  children: ReactNode;

  tone?: "default" | "cyan" | "green" | "amber" | "red";

}) {

  const toneClass =

    props.tone === "cyan"

      ? "border-cyan-400/30 bg-cyan-950/10"

      : props.tone === "green"

        ? "border-emerald-400/30 bg-emerald-950/10"

        : props.tone === "amber"

          ? "border-yellow-400/30 bg-yellow-950/10"

          : props.tone === "red"

            ? "border-rose-400/30 bg-rose-950/10"

            : "border-white/10 bg-white/[0.03]";

  return (

    <section className={`rounded-[2rem] border p-7 shadow-2xl shadow-black/30 ${toneClass}`}>

      {props.children}

    </section>

  );

}

function Eyebrow(props: { children: ReactNode }) {

  return (

    <p className="mb-5 text-xs font-black uppercase tracking-[0.45em] text-white/35">

      {props.children}

    </p>

  );

}

function Badge(props: {

  children: ReactNode;

  tone?: "cyan" | "green" | "amber" | "red" | "neutral";

}) {

  const toneClass =

    props.tone === "green"

      ? "border-emerald-400/35 bg-emerald-500/15 text-emerald-100"

      : props.tone === "amber"

        ? "border-yellow-400/35 bg-yellow-500/15 text-yellow-100"

        : props.tone === "red"

          ? "border-rose-400/35 bg-rose-500/15 text-rose-100"

          : props.tone === "neutral"

            ? "border-white/15 bg-white/[0.04] text-white/70"

            : "border-cyan-400/35 bg-cyan-500/15 text-cyan-100";

  return (

    <span className={`inline-flex max-w-full items-center rounded-full border px-5 py-3 break-all text-xs font-black uppercase tracking-[0.32em] ${toneClass}`}>

      {props.children}

    </span>

  );

}

function DataTile(props: {

  label: string;

  value: ReactNode;

  tone?: "cyan" | "green" | "amber" | "red" | "neutral";

}) {

  const valueClass =

    props.tone === "green"

      ? "text-emerald-100"

      : props.tone === "amber"

        ? "text-yellow-100"

        : props.tone === "red"

          ? "text-rose-100"

          : props.tone === "neutral"

            ? "text-white"

            : "text-cyan-100";

  return (

    <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">

      <p className="mb-3 text-[0.65rem] font-black uppercase tracking-[0.4em] text-white/35">

        {props.label}

      </p>

      <div className={`break-all font-mono text-xl font-black leading-snug ${valueClass}`}>

        {props.value}

      </div>

    </div>

  );

}

function JsonBlock(props: { value: unknown }) {

  return (

    <div className="overflow-x-auto rounded-[1.5rem] border border-white/10 bg-black p-5">

      <pre className="min-w-max whitespace-pre-wrap break-words font-mono text-sm leading-7 text-white/85">

        {JSON.stringify(props.value, null, 2)}

      </pre>

    </div>

  );

}

function NavButton(props: { href: string; children: ReactNode }) {

  return (

    <Link

      href={props.href}

      className="block rounded-full border border-cyan-400/25 bg-cyan-500/10 px-5 py-4 text-center text-sm font-black text-cyan-50 transition hover:bg-cyan-500/15"

    >

      {props.children}

    </Link>

  );

}

export default async function GatedAuditedIntentPersistencePage(props: PageProps) {

  const params = await Promise.resolve(props.params);

  const searchParams = props.searchParams ? await props.searchParams : {};

  const incidentId = normalizeIncidentId(params.id);

  const workspaceId = normalizeWorkspaceId(

    firstSearchParam(searchParams, "workspace_id") ??

      firstSearchParam(searchParams, "workspaceId")

  );

  const gateEnabled = isFeatureGateEnabled();

  const intentId = buildIntentId(workspaceId, incidentId);

  const persistenceId = buildPersistenceId(workspaceId, incidentId);

  const idempotencyKey = buildIdempotencyKey(workspaceId, incidentId);

  const payload = {

    version: VERSION,

    status: gateEnabled

      ? "PERSISTENCE_READY_REQUIRES_POST_CONFIRMATION"

      : "PERSISTENCE_BLOCKED_BY_FEATURE_GATE",

    feature_gate_enabled: gateEnabled,

    intent_id: intentId,

    persistence_id: persistenceId,

    idempotency_key: idempotencyKey,

    write_method: "POST_ONLY",

    page_execution: "READ_ONLY",

    airtable_write_from_page: "DISABLED",

    worker_call: "DISABLED_FROM_THIS_SURFACE",

    real_run: "FORBIDDEN",

    secret_exposure: "DISABLED",

  };

  const incidentHref = withWorkspace(`/incidents/${incidentId}`, workspaceId);

  const v57Href = withWorkspace(

    `/incidents/${incidentId}/server-side-dry-run-write-preview`,

    workspaceId

  );

  const v56Href = withWorkspace(

    `/incidents/${incidentId}/gated-audited-intent-persistence-preview`,

    workspaceId

  );

  const v55Href = withWorkspace(

    `/incidents/${incidentId}/audited-intent-persistence-draft`,

    workspaceId

  );

  const v54Href = withWorkspace(

    `/incidents/${incidentId}/audited-operator-intent-draft`,

    workspaceId

  );

  return (

    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 text-white sm:px-6 lg:px-8">

      <Card tone="cyan">

        <Eyebrow>Gated Audited Intent Persistence</Eyebrow>

        <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-7xl">

          Persistance auditée contrôlée

        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-10 text-white/60">

          V5.8 introduit le contrat de persistance réelle d’une intention opérateur

          en statut Draft, derrière feature gate et confirmation explicite. Cette page

          reste read-only : elle ne persiste rien automatiquement.

        </p>

        <div className="mt-8 flex flex-wrap gap-3">

          <Badge tone={gateEnabled ? "green" : "amber"}>{payload.status}</Badge>

          <Badge tone="cyan">POST ONLY</Badge>

          <Badge tone="red">NO PAGE WRITE</Badge>

          <Badge tone="red">NO WORKER CALL</Badge>

          <Badge tone="red">NO REAL RUN</Badge>

        </div>

      </Card>

      <Card tone={gateEnabled ? "green" : "amber"}>

        <Eyebrow>Persistence Gate</Eyebrow>

        <div className="grid gap-4">

          <DataTile label="Feature Gate Env" value={FEATURE_GATE_ENV} tone="cyan" />

          <DataTile

            label="Feature Gate Status"

            value={gateEnabled ? "ENABLED" : "DISABLED"}

            tone={gateEnabled ? "green" : "amber"}

          />

          <DataTile

            label="Write Method"

            value="POST_ONLY_WITH_CONFIRMATION"

            tone="cyan"

          />

          <DataTile label="Page Write" value="DISABLED" tone="red" />

        </div>

      </Card>

      <Card tone="cyan">

        <Eyebrow>Persistence Contract</Eyebrow>

        <div className="grid gap-4">

          <DataTile label="Intent ID" value={intentId} tone="cyan" />

          <DataTile label="Persistence ID" value={persistenceId} tone="cyan" />

          <DataTile label="Idempotency Key" value={idempotencyKey} tone="cyan" />

          <DataTile label="Target Table" value="Operator_Intents" tone="cyan" />

          <DataTile label="Target Status" value="Draft" tone="amber" />

          <DataTile label="Real Run" value="FORBIDDEN" tone="red" />

          <DataTile label="Worker Call" value="DISABLED" tone="red" />

        </div>

      </Card>

      <Card tone="red">

        <Eyebrow>Execution Lock</Eyebrow>

        <div className="flex flex-wrap gap-3">

          <Badge tone="red">NO REAL RUN</Badge>

          <Badge tone="cyan">DRAFT ONLY</Badge>

          <Badge tone="red">NO WORKER CALL</Badge>

          <Badge tone="red">NO COMMAND CREATION</Badge>

          <Badge tone="red">NO RUN CREATION</Badge>

          <Badge tone="amber">OPERATOR CONFIRMATION REQUIRED</Badge>

          <Badge tone="amber">IDEMPOTENCY REQUIRED</Badge>

        </div>

        <button

          type="button"

          disabled

          className="mt-8 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-sm font-black text-white/30"

        >

          Persistance via page désactivée — POST serveur requis

        </button>

      </Card>

      <Card>

        <Eyebrow>Read-only Page Payload</Eyebrow>

        <JsonBlock value={payload} />

      </Card>

      <Card>

        <Eyebrow>Navigation</Eyebrow>

        <div className="grid gap-4">

          <Link

            href={incidentHref}

            className="block rounded-full border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black text-white transition hover:bg-white/[0.07]"

          >

            Retour incident

          </Link>

          <NavButton href={v57Href}>Retour V5.7 dry-run write preview</NavButton>

          <NavButton href={v56Href}>Retour V5.6 gated persistence preview</NavButton>

          <NavButton href={v55Href}>Retour V5.5 persistence draft</NavButton>

          <NavButton href={v54Href}>Retour V5.4 operator intent draft</NavButton>

        </div>

      </Card>

    </main>

  );

}
