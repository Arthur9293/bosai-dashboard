import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const footerMarker = "{/* V2.31-visible-footer */}";
const v33Marker = "{/* V2.33-final-visual-balance */}";

if (!source.includes(footerMarker)) {
  console.error("Marker V2.31 visible footer introuvable. Patch V2.33 arrêté.");
  process.exit(1);
}

if (source.includes(v33Marker)) {
  console.log("V2.33 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const footerIndex = source.indexOf(footerMarker);

function replaceAfter(label, oldText, newText) {
  const start = source.indexOf(oldText, footerIndex);

  if (start === -1) {
    console.error(`Remplacement introuvable pour : ${label}`);
    process.exit(1);
  }

  source =
    source.slice(0, start) +
    newText +
    source.slice(start + oldText.length);

  console.log(`OK: ${label}`);
}

/**
 * 1) Rendre le bloc Summary Footer plus premium.
 */
replaceAfter(
  "wrapper Queue Operator Summary Footer",
  `<div className="mt-5 rounded-[18px] border border-white/10 bg-white/[0.03] px-4 py-4">`,
  `<div className="mt-6 rounded-[24px] border border-sky-400/15 bg-gradient-to-br from-sky-400/[0.08] via-white/[0.035] to-emerald-400/[0.06] px-4 py-5 shadow-[0_0_0_1px_rgba(255,255,255,0.025)]">
                            ${v33Marker}
                            <div className="mb-4 h-px w-full bg-gradient-to-r from-transparent via-emerald-400/30 to-transparent" />`,
);

/**
 * 2) Donner plus de poids au titre final.
 */
replaceAfter(
  "titre synthèse opérateur",
  `<div className="mt-3 text-lg font-semibold tracking-tight text-white">
                              Synthèse opérateur de la file active
                            </div>`,
  `<div className="mt-3 max-w-[34rem] text-xl font-semibold leading-tight tracking-tight text-white">
                              Synthèse opérateur de la file active
                            </div>`,
);

/**
 * 3) Aérer les deux cartes File active / Route suivante.
 */
replaceAfter(
  "grid synthèse footer",
  `<div className="mt-4 grid gap-3 sm:grid-cols-2">`,
  `<div className="mt-5 grid gap-4 sm:grid-cols-2">`,
);

replaceAfter(
  "première carte synthèse footer",
  `<div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">`,
  `<div className="rounded-[18px] border border-white/10 bg-black/25 px-4 py-4">`,
);

replaceAfter(
  "deuxième carte synthèse footer",
  `<div className="rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">`,
  `<div className="rounded-[18px] border border-white/10 bg-black/25 px-4 py-4">`,
);

/**
 * 4) Polish ciblé du bloc Signaux synthèse.
 */
const signauxLabel = "Signaux synthèse";
const signauxIndex = source.indexOf(signauxLabel, footerIndex);

if (signauxIndex === -1) {
  console.error("Bloc Signaux synthèse introuvable.");
  process.exit(1);
}

const signauxCardOld = `<div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">`;
const signauxCardStart = source.lastIndexOf(signauxCardOld, signauxIndex);

if (signauxCardStart === -1 || signauxCardStart < footerIndex) {
  console.error("Carte Signaux synthèse introuvable.");
  process.exit(1);
}

source =
  source.slice(0, signauxCardStart) +
  `<div className="mt-5 rounded-[18px] border border-emerald-400/15 bg-emerald-400/[0.045] px-4 py-4">` +
  source.slice(signauxCardStart + signauxCardOld.length);

console.log("OK: carte Signaux synthèse");

/**
 * 5) Polish ciblé du bloc Action immédiate.
 */
const actionLabel = "Action immédiate";
const actionIndex = source.indexOf(actionLabel, footerIndex);

if (actionIndex === -1) {
  console.error("Bloc Action immédiate introuvable.");
  process.exit(1);
}

const actionCardOld = `<div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">`;
const actionCardStart = source.lastIndexOf(actionCardOld, actionIndex);

if (actionCardStart === -1 || actionCardStart < footerIndex) {
  console.error("Carte Action immédiate introuvable.");
  process.exit(1);
}

source =
  source.slice(0, actionCardStart) +
  `<div className="mt-4 rounded-[18px] border border-white/10 bg-black/25 px-4 py-4">` +
  source.slice(actionCardStart + actionCardOld.length);

console.log("OK: carte Action immédiate");

/**
 * 6) Polish ciblé du bloc Action consolidée V2.32.
 */
const consolidatedLabel = "Action consolidée";
const consolidatedIndex = source.indexOf(consolidatedLabel, footerIndex);

if (consolidatedIndex === -1) {
  console.error("Bloc Action consolidée introuvable.");
  process.exit(1);
}

const consolidatedCardOld = `<div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">`;
const consolidatedCardStart = source.lastIndexOf(
  consolidatedCardOld,
  consolidatedIndex,
);

if (consolidatedCardStart === -1 || consolidatedCardStart < footerIndex) {
  console.error("Carte Action consolidée introuvable.");
  process.exit(1);
}

source =
  source.slice(0, consolidatedCardStart) +
  `<div className="mt-4 rounded-[18px] border border-sky-400/10 bg-sky-400/[0.035] px-4 py-4">` +
  source.slice(consolidatedCardStart + consolidatedCardOld.length);

console.log("OK: carte Action consolidée");

/**
 * 7) Ajouter une respiration visuelle juste après le footer, avant les actions finales.
 */
const footerEndSearchStart = source.indexOf("Action consolidée", footerIndex);
const afterFooterAnchor = `                          </div>

                          {/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}`;

const afterFooterIndex = source.indexOf(afterFooterAnchor, footerEndSearchStart);

if (afterFooterIndex !== -1) {
  const afterFooterReplacement = `                          </div>

                          <div className="my-5 h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                          {/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}`;

  source =
    source.slice(0, afterFooterIndex) +
    afterFooterReplacement +
    source.slice(afterFooterIndex + afterFooterAnchor.length);

  console.log("OK: séparateur actions finales");
} else {
  console.log("Séparateur final non ajouté : anchor V2.32 non trouvé. Non bloquant.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.33 appliqué sur :");
console.log(filePath);
