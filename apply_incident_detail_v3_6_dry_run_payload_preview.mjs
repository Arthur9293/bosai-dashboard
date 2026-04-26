import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const marker = "Incident Detail V3.6-dry-run-payload-preview";

let source = fs.readFileSync(filePath, "utf8");

if (source.includes(marker)) {
  console.log("V3.6 déjà présent dans page.tsx. Aucune modification.");
  process.exit(0);
}

const requiredMarkers = [
  "Incident Detail V3.0-operator-action-console",
  "Incident Detail V3.1-execution-path-polish",
  "Incident Detail V3.2-execution-preview",
  "Incident Detail V3.3-safe-execution-intent",
  "Incident Detail V3.4-minimal-safe-run-draft-anchor",
  "Incident Detail V3.5-dry-run-readiness-review",
];

for (const required of requiredMarkers) {
  if (!source.includes(required)) {
    console.error(`${required} introuvable. Patch V3.6 arrêté pour préserver la baseline.`);
    process.exit(1);
  }
}

if (!source.includes("executionPathHealth")) {
  console.error("Variable executionPathHealth introuvable. Patch V3.6 arrêté.");
  process.exit(1);
}

const v35Index = source.indexOf("Incident Detail V3.5-dry-run-readiness-review");
const anchorText = "Linked Execution Path";
const anchorIndex = source.indexOf(anchorText, v35Index);

if (anchorIndex === -1) {
  console.error("Linked Execution Path introuvable après V3.5. Patch V3.6 arrêté.");
  process.exit(1);
}

const beforeAnchor = source.slice(0, anchorIndex);
const blockStartMatches = [...beforeAnchor.matchAll(/\n\s*<(div|section|article)\b[^>]*>/g)];

if (blockStartMatches.length === 0) {
  console.error("Aucun début de bloc JSX trouvé avant Linked Execution Path.");
  process.exit(1);
}

const lastMatch = blockStartMatches[blockStartMatches.length - 1];
const insertIndex = lastMatch.index;

if (typeof insertIndex !== "number" || insertIndex < 0) {
  console.error("Index d’insertion invalide.");
  process.exit(1);
}

const block = `
        {(() => {
          const dryRunPayloadStatus =
            executionPathHealth === "COMPLETE PATH"
              ? "PAYLOAD READY"
              : executionPathHealth === "ACTIONABLE PATH" || executionPathHealth === "PARTIAL PATH"
                ? "PAYLOAD PARTIAL"
                : executionPathHealth === "MISSING PATH"
                  ? "PAYLOAD BLOCKED"
                  : "PREVIEW ONLY";

          const dryRunPayloadCapability =
            dryRunPayloadStatus === "PAYLOAD READY"
              ? "command_orchestrator"
              : dryRunPayloadStatus === "PAYLOAD PARTIAL"
                ? "flow_context"
                : "incident_context";

          const dryRunPayloadPreview = [
            "{",
            '  "capability": "' + dryRunPayloadCapability + '",',
            '  "workspace_id": "<workspace_id>",',
            '  "incident_id": "<incident_id>",',
            '  "command_id": "<command_id>",',
            '  "run_id": "<run_id>",',
            '  "flow_id": "<flow_id>",',
            '  "root_event_id": "<root_event_id>",',
            '  "dry_run": true,',
            '  "source": "dashboard_incident_detail_v3_6"',
            "}",
          ].join("\\n");

          const payloadSafetyNotes = [
            { label: "Payload affiché en lecture seule", status: "SAFE" },
            { label: "Aucun POST /run", status: "NO EXECUTION" },
            { label: "Aucun appel worker", status: "LOCKED" },
            { label: "Aucune mutation Airtable", status: "LOCKED" },
            { label: "Aucun changement de statut incident", status: "SAFE" },
            { label: "Aucun retry déclenché", status: "SAFE" },
            { label: "Aucune escalade automatique", status: "SAFE" },
            { label: "Confirmation humaine requise avant toute future exécution", status: "REQUIRED" },
          ];

          const payloadBadgeClassName = (status: string) => {
            if (status === "PAYLOAD READY" || status === "SAFE") {
              return "border-emerald-400/30 bg-emerald-500/15 text-emerald-100";
            }

            if (status === "PAYLOAD PARTIAL" || status === "REQUIRED") {
              return "border-amber-400/30 bg-amber-500/15 text-amber-100";
            }

            if (status === "LOCKED") {
              return "border-sky-400/30 bg-sky-500/15 text-sky-100";
            }

            return "border-rose-400/30 bg-rose-500/15 text-rose-100";
          };

          return (
            <div className="rounded-[2rem] border border-cyan-400/20 bg-cyan-950/15 p-4 shadow-[0_0_90px_rgba(34,211,238,0.06)] sm:p-5">
              {/* Incident Detail V3.6-dry-run-payload-preview */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200/70">
                    Dry Run Payload Preview
                  </p>
                  <h3 className="text-xl font-semibold text-white">
                    Aperçu payload dry run
                  </h3>
                  <p className="max-w-3xl text-sm leading-6 text-zinc-400">
                    Payload prévisualisé en lecture seule. Cette section ne déclenche aucun POST /run,
                    aucun appel worker et aucune mutation Airtable.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={\`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] \${payloadBadgeClassName(dryRunPayloadStatus)}\`}>
                    {dryRunPayloadStatus}
                  </span>
                  <span className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                    PAYLOAD PREVIEW ONLY
                  </span>
                  <span className="rounded-full border border-rose-400/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-rose-100">
                    NO POST /run
                  </span>
                  <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-100">
                    NOT ARMED
                  </span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Payload Status", dryRunPayloadStatus],
                  ["Target Endpoint", "POST /run"],
                  ["Capability", dryRunPayloadCapability],
                  ["Dry Run Mode", "dry_run: true"],
                  ["Execution State", "PREVIEW ONLY"],
                  ["Source", "dashboard_incident_detail_v3_6"],
                  ["Worker Call", "DISABLED"],
                  ["Airtable Mutation", "DISABLED"],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      {label}
                    </p>
                    <p className="mt-2 break-words text-sm font-semibold text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-black/30 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Read-only JSON
                    </p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                      Structure future du payload dry run. Affichage uniquement.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled
                    className="cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-500 opacity-70"
                  >
                    Payload preview generated
                  </button>
                </div>

                <pre className="mt-4 max-w-full overflow-x-auto rounded-2xl border border-cyan-400/20 bg-black/50 p-4 text-xs leading-6 text-cyan-100">
                  <code>{dryRunPayloadPreview}</code>
                </pre>
              </div>

              <div className="mt-5 rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-200/70">
                  Payload Safety Notes
                </p>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {payloadSafetyNotes.map((item) => (
                    <div
                      key={item.label}
                      className="min-w-0 rounded-2xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <p className="text-sm font-semibold leading-6 text-white">
                          {item.label}
                        </p>

                        <span className={\`w-fit rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] \${payloadBadgeClassName(item.status)}\`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

`;

source = source.slice(0, insertIndex) + block + source.slice(insertIndex);

fs.writeFileSync(filePath, source, "utf8");

console.log("V3.6 Dry Run Payload Preview injecté dans page.tsx.");
console.log("Insertion placée après V3.5 et avant Linked Execution Path.");
console.log("Patch visuel uniquement : aucun fetch, aucun POST, aucun worker, aucune mutation.");
