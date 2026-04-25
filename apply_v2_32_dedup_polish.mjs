import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.31-visible-footer */}";

if (!source.includes(marker)) {
  console.error("Marker V2.31 visible footer introuvable. Patch V2.32 arrêté.");
  process.exit(1);
}

if (source.includes("V2.32-dedup-polish")) {
  console.log("V2.32 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const markerIndex = source.indexOf(marker);

/**
 * 1) Remplacer le bouton doublon "Lancer depuis la synthèse"
 * par une note de synthèse non cliquable.
 */
const launchText = "Lancer depuis la synthèse";
const launchTextIndex = source.indexOf(launchText, markerIndex);

if (launchTextIndex === -1) {
  console.log("Bouton 'Lancer depuis la synthèse' introuvable. Étape ignorée.");
} else {
  const launchBlockStartNeedle = "{queueFocusedFirstIncidentHref ? (";
  const launchBlockStart = source.lastIndexOf(
    launchBlockStartNeedle,
    launchTextIndex,
  );

  const launchBlockEndNeedle = ") : null}";
  const launchBlockEnd = source.indexOf(launchBlockEndNeedle, launchTextIndex);

  if (
    launchBlockStart === -1 ||
    launchBlockEnd === -1 ||
    launchBlockStart < markerIndex
  ) {
    console.error("Bloc CTA 'Lancer depuis la synthèse' introuvable.");
    process.exit(1);
  }

  const launchBlockEndFinal = launchBlockEnd + launchBlockEndNeedle.length;

  const launchReplacement = `<div className="mt-4 rounded-[16px] border border-white/10 bg-black/20 px-4 py-3">
                              <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
                                Action consolidée
                              </div>
                              <div className="mt-2 text-sm font-medium leading-6 text-zinc-100">
                                L’action principale reste disponible dans le routeur opérateur.
                              </div>
                            </div>`;

  source =
    source.slice(0, launchBlockStart) +
    launchReplacement +
    source.slice(launchBlockEndFinal);

  console.log("CTA 'Lancer depuis la synthèse' remplacé par une note consolidée.");
}

/**
 * 2) Supprimer le bouton final doublon "Ouvrir le premier incident"
 * après V2.31, car l’action principale est déjà portée par V2.30.
 */
const updatedMarkerIndex = source.indexOf(marker);
const finalOpenText = "Ouvrir le premier incident";
const finalOpenTextIndex = source.indexOf(finalOpenText, updatedMarkerIndex);

if (finalOpenTextIndex === -1) {
  console.log("Bouton final 'Ouvrir le premier incident' introuvable. Étape ignorée.");
} else {
  const finalBlockStartNeedle = "{queueFocusedFirstIncidentHref ? (";
  const finalBlockStart = source.lastIndexOf(
    finalBlockStartNeedle,
    finalOpenTextIndex,
  );

  const finalBlockEndNeedle = ") : null}";
  const finalBlockEnd = source.indexOf(finalBlockEndNeedle, finalOpenTextIndex);

  if (
    finalBlockStart === -1 ||
    finalBlockEnd === -1 ||
    finalBlockStart < updatedMarkerIndex
  ) {
    console.error("Bloc CTA final 'Ouvrir le premier incident' introuvable.");
    process.exit(1);
  }

  const finalBlockEndFinal = finalBlockEnd + finalBlockEndNeedle.length;

  const finalReplacement = `{/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}`;

  source =
    source.slice(0, finalBlockStart) +
    finalReplacement +
    source.slice(finalBlockEndFinal);

  console.log("CTA final 'Ouvrir le premier incident' supprimé.");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("Patch V2.32 appliqué sur :");
console.log(filePath);
