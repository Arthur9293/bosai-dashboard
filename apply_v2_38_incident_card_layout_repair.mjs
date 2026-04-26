import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.38-incident-card-layout-repair */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.38-incident-card-layout-repair")) {
  console.log("V2.38 déjà appliqué. Aucune modification.");
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
 * 1) Annuler le resserrement global trop fort de V2.37.
 * Le max-w-6xl force trop la page et compresse les cartes incidents.
 */
replaceAllSafe(
  "restore page max width",
  "max-w-6xl xl:max-w-7xl",
  "max-w-7xl",
);

/**
 * 2) Réparer les grilles de cartes incidents.
 * Problème visible : 2 cartes desktop + mini-grilles internes = colonnes trop serrées.
 * On force les grids incidents à rester 1 colonne jusqu’à xl.
 */
replaceAllSafe(
  "incident cards grid safer desktop",
  "grid gap-5 lg:gap-8 lg:grid-cols-2",
  "grid gap-5 xl:grid-cols-2 xl:gap-8",
);

replaceAllSafe(
  "incident cards grid safer desktop 2",
  "grid gap-5 lg:gap-7 lg:grid-cols-2",
  "grid gap-5 xl:grid-cols-2 xl:gap-7",
);

replaceAllSafe(
  "incident cards grid safer desktop 3",
  "grid gap-5 lg:grid-cols-2",
  "grid gap-5 xl:grid-cols-2",
);

replaceAllSafe(
  "incident cards grid safer desktop 4",
  "grid gap-4 sm:gap-6 lg:grid-cols-2",
  "grid gap-4 sm:gap-6 xl:grid-cols-2",
);

/**
 * 3) Réparer les mini-grilles internes.
 * Les blocs STATUS / SEVERITY / SLA / WORKSPACE ne doivent pas être en 4 colonnes
 * sur largeur moyenne. On passe à 2 colonnes jusqu’à xl.
 */
replaceAllSafe(
  "mini grid 4 repair",
  "grid-cols-4",
  "grid-cols-2 xl:grid-cols-4",
);

replaceAllSafe(
  "mini grid sm4 repair",
  "sm:grid-cols-4",
  "sm:grid-cols-2 xl:grid-cols-4",
);

replaceAllSafe(
  "mini grid md4 repair",
  "md:grid-cols-4",
  "md:grid-cols-2 xl:grid-cols-4",
);

replaceAllSafe(
  "mini grid lg4 repair",
  "lg:grid-cols-4",
  "lg:grid-cols-2 xl:grid-cols-4",
);

/**
 * 4) Réparer les grilles 3 colonnes internes Investigation / Control.
 * Sur MacBook largeur moyenne, 3 colonnes écrasent les labels.
 */
replaceAllSafe(
  "mini grid 3 repair",
  "grid-cols-3",
  "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
);

replaceAllSafe(
  "mini grid sm3 repair",
  "sm:grid-cols-3",
  "sm:grid-cols-2 xl:grid-cols-3",
);

replaceAllSafe(
  "mini grid md3 repair",
  "md:grid-cols-3",
  "md:grid-cols-2 xl:grid-cols-3",
);

replaceAllSafe(
  "mini grid lg3 repair",
  "lg:grid-cols-3",
  "lg:grid-cols-2 xl:grid-cols-3",
);

/**
 * 5) Éviter les mots trop cassés dans les cartes diagnostic.
 */
replaceAllSafe(
  "diagnostic text wrapping",
  "break-words",
  "break-words [overflow-wrap:anywhere]",
);

replaceAllSafe(
  "diagnostic text nowrap bad",
  "whitespace-nowrap",
  "whitespace-normal",
);

/**
 * 6) Réparer les paddings trop agressifs issus de V2.37 sur desktop.
 * Mobile reste compact, desktop respire.
 */
replaceAllSafe(
  "restore card padding p4",
  "p-4 sm:p-6",
  "p-4 md:p-5 xl:p-6",
);

replaceAllSafe(
  "restore card padding p35",
  "p-3.5 sm:p-5",
  "p-3.5 md:p-4 xl:p-5",
);

replaceAllSafe(
  "restore px",
  "px-4 sm:px-6",
  "px-4 md:px-5 xl:px-6",
);

replaceAllSafe(
  "restore py",
  "py-4 sm:py-6",
  "py-4 md:py-5 xl:py-6",
);

/**
 * 7) Boutons trop hauts/larges dans certains blocs.
 * On garde les CTA lisibles mais moins massifs.
 */
replaceAllSafe(
  "huge primary action button repair",
  "min-h-[220px]",
  "min-h-[96px]",
);

replaceAllSafe(
  "huge primary action button repair 2",
  "min-h-[260px]",
  "min-h-[112px]",
);

replaceAllSafe(
  "huge rounded pill repair",
  "rounded-[999px]",
  "rounded-[28px]",
);

/**
 * 8) Ajouter un anchor visible proche du flux incidents si possible.
 */
const incidentStreamIndex = source.indexOf("Incident Stream");

if (incidentStreamIndex !== -1 && !source.includes("{/* V2.38-layout-repair-anchor */}")) {
  source =
    source.slice(0, incidentStreamIndex) +
    "{/* V2.38-layout-repair-anchor */}\n" +
    source.slice(incidentStreamIndex);

  changes += 1;
  console.log("OK anchor V2.38 ajouté");
}

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.38 appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
