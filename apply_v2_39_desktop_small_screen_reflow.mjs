import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.39-desktop-small-screen-responsive-reflow */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.39-desktop-small-screen-responsive-reflow")) {
  console.log("V2.39 déjà appliqué. Aucune modification.");
  process.exit(0);
}

const dynamicAnchor = `export const dynamic = "force-dynamic";`;

if (source.includes(dynamicAnchor)) {
  source = source.replace(dynamicAnchor, `${dynamicAnchor}\n\n${markerAsTsComment}`);
} else {
  source = `${markerAsTsComment}\n${source}`;
}

let changes = 0;

function replaceAllSafe(label, oldText, newText) {
  const count = source.split(oldText).length - 1;

  if (count > 0) {
    source = source.replaceAll(oldText, newText);
    changes += count;
    console.log(`OK ${label}: ${count}`);
  } else {
    console.log(`Ignoré ${label}: introuvable`);
  }
}

/**
 * V2.39 — Principe :
 * - ne plus activer les layouts denses trop tôt sur laptop
 * - repousser 2 colonnes / 3 colonnes / 4 colonnes vers 2xl
 * - garder mobile compact
 * - garder grand desktop riche
 */

/**
 * 1) Réparer les grilles principales.
 * Les 2 colonnes doivent arriver beaucoup plus tard.
 */
replaceAllSafe(
  "lg:grid-cols-2 -> 2xl:grid-cols-2",
  "lg:grid-cols-2",
  "2xl:grid-cols-2",
);

replaceAllSafe(
  "xl:grid-cols-2 -> 2xl:grid-cols-2",
  "xl:grid-cols-2",
  "2xl:grid-cols-2",
);

/**
 * 2) Réparer les grilles internes déjà transformées par V2.38.
 * Sur desktop compact, elles doivent rester plus verticales.
 */
replaceAllSafe(
  "grid-cols-2 xl:grid-cols-4 -> readable signal grid",
  "grid-cols-2 xl:grid-cols-4",
  "grid-cols-1 md:grid-cols-2 2xl:grid-cols-4",
);

replaceAllSafe(
  "sm:grid-cols-2 xl:grid-cols-4 -> readable signal grid",
  "sm:grid-cols-2 xl:grid-cols-4",
  "md:grid-cols-2 2xl:grid-cols-4",
);

replaceAllSafe(
  "md:grid-cols-2 xl:grid-cols-4 -> readable signal grid",
  "md:grid-cols-2 xl:grid-cols-4",
  "md:grid-cols-2 2xl:grid-cols-4",
);

replaceAllSafe(
  "lg:grid-cols-2 xl:grid-cols-4 -> readable signal grid",
  "lg:grid-cols-2 xl:grid-cols-4",
  "md:grid-cols-2 2xl:grid-cols-4",
);

/**
 * 3) Réparer Investigation / Control Layer.
 * Les 3 colonnes internes compressent trop sur laptop.
 */
replaceAllSafe(
  "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 -> vertical until wide",
  "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  "grid-cols-1 2xl:grid-cols-3",
);

replaceAllSafe(
  "sm:grid-cols-2 xl:grid-cols-3 -> vertical until wide",
  "sm:grid-cols-2 xl:grid-cols-3",
  "2xl:grid-cols-3",
);

replaceAllSafe(
  "lg:grid-cols-2 xl:grid-cols-3 -> vertical until wide",
  "lg:grid-cols-2 xl:grid-cols-3",
  "2xl:grid-cols-3",
);

replaceAllSafe(
  "xl:grid-cols-3 -> 2xl:grid-cols-3",
  "xl:grid-cols-3",
  "2xl:grid-cols-3",
);

replaceAllSafe(
  "xl:grid-cols-4 -> 2xl:grid-cols-4",
  "xl:grid-cols-4",
  "2xl:grid-cols-4",
);

/**
 * 4) Réparer les wrappers de page / cockpit trop denses sur laptop.
 * Ne change pas le shell, seulement page incidents.
 */
replaceAllSafe(
  "gap-5 lg:gap-8 -> gap wide later",
  "gap-5 lg:gap-8",
  "gap-5 2xl:gap-8",
);

replaceAllSafe(
  "gap-5 lg:gap-7 -> gap wide later",
  "gap-5 lg:gap-7",
  "gap-5 2xl:gap-7",
);

replaceAllSafe(
  "gap-4 sm:gap-6 xl:grid-cols-2 -> wide cards later",
  "gap-4 sm:gap-6 xl:grid-cols-2",
  "gap-4 sm:gap-6 2xl:grid-cols-2",
);

/**
 * 5) Annuler les CTA énormes dans les zones opérateur si présents.
 */
replaceAllSafe(
  "large pill min height 96 -> compact",
  "min-h-[96px]",
  "min-h-[72px] md:min-h-[88px]",
);

replaceAllSafe(
  "large pill min height 112 -> compact",
  "min-h-[112px]",
  "min-h-[80px] md:min-h-[96px]",
);

/**
 * 6) Texte long : URLs / notes / reasons doivent respirer.
 */
replaceAllSafe(
  "overflow anywhere duplicate safe",
  "[overflow-wrap:anywhere]",
  "[overflow-wrap:anywhere] break-words",
);

replaceAllSafe(
  "text balance safer",
  "break-words break-words",
  "break-words",
);

/**
 * 7) Anchor visible près d’Incident Stream.
 */
const incidentStreamIndex = source.indexOf("Incident Stream");

if (incidentStreamIndex !== -1 && !source.includes("{/* V2.39-reflow-anchor */}")) {
  source =
    source.slice(0, incidentStreamIndex) +
    "{/* V2.39-reflow-anchor */}\n" +
    source.slice(incidentStreamIndex);

  changes += 1;
  console.log("OK anchor V2.39 ajouté près de Incident Stream");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.39 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
