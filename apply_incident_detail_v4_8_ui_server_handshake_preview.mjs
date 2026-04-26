import fs from "node:fs";

const pagePath = "src/app/(dashboard)/incidents/[id]/page.tsx";

const markerV48 = "Incident Detail V4.8-ui-server-handshake-preview";

if (!fs.existsSync(pagePath)) {
  console.error("Page introuvable:", pagePath);
  process.exit(1);
}

const existing = fs.readFileSync(pagePath, "utf8");

if (existing.includes(markerV48)) {
  console.log("V4.8 déjà présent. Aucune modification.");
  process.exit(0);
}

const requiredSignals = [
  "Dry Run Arm Switch Preview",
  "Safe Run Draft",
  "Dry Run Readiness Review",
  "Dry Run Payload Preview",
  "Dry Run Confirmation Gate",
];

const missingSignals = requiredSignals.filter((signal) => !existing.includes(signal));

if (missingSignals.length > 0) {
  console.error("Baseline visuelle V3.x incomplète. Signaux manquants:");
  for (const signal of missingSignals) {
    console.error("-", signal);
  }
  console.error("Patch arrêté pour éviter une insertion au mauvais endroit.");
  process.exit(1);
}

const anchorCandidates = [
  "{/* Incident Detail V3.1-execution-path-polish */}",
  "{/* Incident Detail V3.1-execution-path-health */}",
  "LINKED EXECUTION PATH",
];

let anchor = "";
let anchorIndex = -1;

for (const candidate of anchorCandidates) {
  const index = existing.indexOf(candidate);
  if (index !== -1) {
    anchor = candidate;
    anchorIndex = index;
    break;
  }
}

if (anchorIndex === -1) {
  console.error("Anchor Linked Execution Path introuvable.");
  console.error("Patch arrêté. Ne pas forcer.");
  process.exit(1);
}

const block = String.raw`
        {/* Incident Detail V4.8-ui-server-handshake-preview */}
        <section className="rounded-[34px] border border-cyan-400/25 bg-cyan-950/20 p-6 shadow-[0_0_80px_rgba(34,211,238,0.08)] sm:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.42em] text-cyan-200/70">
                UI / SERVER HANDSHAKE PREVIEW
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Prévisualisation handshake serveur
              </h2>

              <p className="max-w-3xl text-base leading-8 text-zinc-400 sm:text-lg">
                Cette section prépare la jonction visuelle entre la page incident et la route serveur
                <span className="font-semibold text-cyan-200"> POST /api/incidents/[id]/dry-run</span>.
                Aucun appel réseau n’est déclenché depuis cette interface.
              </p>

              <div className="flex flex-wrap gap-3">
                <span className="rounded-full border border-emerald-400/35 bg-emerald-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-emerald-200">
                  SERVER ROUTE READY
                </span>
                <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-cyan-200">
                  HANDSHAKE PREVIEW
                </span>
                <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-rose-200">
                  NO FETCH
                </span>
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.28em] text-amber-200">
                  OPERATOR REQUIRED
                </span>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Server route
                </p>
                <p className="mt-3 break-words font-mono text-sm font-semibold text-white sm:text-base">
                  POST /api/incidents/[id]/dry-run
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Route serveur préparée par V4.7. Le navigateur ne l’appelle pas directement depuis ce bloc.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Expected contract
                </p>
                <p className="mt-3 break-words font-mono text-sm font-semibold text-white sm:text-base">
                  ADAPTER_CONTRACT_READY
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  État attendu quand la route V4.7 répond correctement en production.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Worker call
                </p>
                <p className="mt-3 break-words font-mono text-sm font-semibold text-white sm:text-base">
                  DISABLED
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Aucun appel worker, aucun POST /run, aucun déclenchement réel.
                </p>
              </div>

              <div className="rounded-[26px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Secret handling
                </p>
                <p className="mt-3 break-words font-mono text-sm font-semibold text-white sm:text-base">
                  SERVER_SIDE_ONLY_NOT_EXPOSED
                </p>
                <p className="mt-3 text-sm leading-6 text-zinc-500">
                  Le secret reste strictement côté serveur. Aucun token n’est rendu côté client.
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-cyan-400/20 bg-slate-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
                Handshake contract preview
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">UI source</p>
                  <p className="mt-2 break-words font-mono text-xs text-zinc-400">
                    dashboard_incident_detail_v4_8
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                    OK
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Server contract</p>
                  <p className="mt-2 break-words font-mono text-xs text-zinc-400">
                    Incident Detail V4.7
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200">
                    OK
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Client fetch</p>
                  <p className="mt-2 break-words font-mono text-xs text-zinc-400">
                    Not implemented
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-sky-400/30 bg-sky-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-sky-200">
                    LOCKED
                  </span>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Execution state</p>
                  <p className="mt-2 break-words font-mono text-xs text-zinc-400">
                    Preview only
                  </p>
                  <span className="mt-3 inline-flex rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-rose-200">
                    NO EXECUTION
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-rose-400/25 bg-rose-950/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-200/70">
                Handshake safety lock
              </p>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-rose-200">
                  NO FETCH
                </span>
                <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-rose-200">
                  NO POST /RUN
                </span>
                <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-rose-200">
                  NO WORKER CALL
                </span>
                <span className="rounded-full border border-rose-400/35 bg-rose-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-rose-200">
                  NO AIRTABLE MUTATION
                </span>
                <span className="rounded-full border border-amber-400/35 bg-amber-500/15 px-4 py-2 text-xs font-bold uppercase tracking-[0.26em] text-amber-200">
                  HUMAN CONFIRMATION REQUIRED
                </span>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                UI recommendation
              </p>
              <p className="mt-3 text-base leading-7 text-zinc-300">
                La page incident peut afficher l’état attendu du contrat serveur V4.7. Le prochain palier pourra
                préparer un vrai affichage de retour serveur, mais cette version reste strictement visuelle.
              </p>

              <button
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.03] px-5 py-4 text-sm font-bold text-zinc-600"
              >
                Server handshake preview only
              </button>
            </div>
          </div>
        </section>

`;

const updated = existing.slice(0, anchorIndex) + block + existing.slice(anchorIndex);

fs.writeFileSync(pagePath, updated, "utf8");

console.log("V4.8 UI / Server Handshake Preview appliqué avec succès.");
console.log("Fichier modifié :", pagePath);
console.log("Anchor utilisé :", anchor);
console.log("Aucun fetch, aucun POST /run, aucun appel worker, aucune mutation.");
