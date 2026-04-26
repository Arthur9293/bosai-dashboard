import fs from "node:fs";

const filePath = "src/app/(dashboard)/incidents/page.tsx";

let source = fs.readFileSync(filePath, "utf8");

const marker = "{/* V2.37-global-visual-harmonization */}";
const markerAsTsComment = `// ${marker}`;

if (source.includes("V2.37-global-visual-harmonization")) {
  console.log("V2.37 déjà appliqué. Aucune modification.");
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
 * Harmonisation globale douce.
 * SAFE : uniquement classes Tailwind visuelles.
 */
replaceAllSafe(
  "max width",
  "max-w-7xl",
  "max-w-6xl xl:max-w-7xl",
);

replaceAllSafe(
  "gap desktop",
  "gap-8",
  "gap-5 lg:gap-8",
);

replaceAllSafe(
  "gap desktop 7",
  "gap-7",
  "gap-5 lg:gap-7",
);

replaceAllSafe(
  "rounded 32",
  "rounded-[32px]",
  "rounded-[24px] sm:rounded-[32px]",
);

replaceAllSafe(
  "rounded 28",
  "rounded-[28px]",
  "rounded-[22px] sm:rounded-[28px]",
);

replaceAllSafe(
  "rounded 24",
  "rounded-[24px]",
  "rounded-[20px] sm:rounded-[24px]",
);

replaceAllSafe(
  "padding p6",
  "p-6",
  "p-4 sm:p-6",
);

replaceAllSafe(
  "padding p5",
  "p-5",
  "p-3.5 sm:p-5",
);

replaceAllSafe(
  "gap 6",
  "gap-6",
  "gap-4 sm:gap-6",
);

replaceAllSafe(
  "gap 5",
  "gap-5",
  "gap-3.5 sm:gap-5",
);

replaceAllSafe(
  "mt 6",
  "mt-6",
  "mt-4 sm:mt-6",
);

replaceAllSafe(
  "mt 5",
  "mt-5",
  "mt-3.5 sm:mt-5",
);

/**
 * Harmonisation du footer opérateur déjà validé.
 */
replaceAllSafe(
  "footer border",
  "border border-sky-400/15",
  "border border-sky-400/20",
);

replaceAllSafe(
  "incident/card background",
  "border border-white/10 bg-white/[0.03]",
  "border border-white/10 bg-gradient-to-br from-white/[0.045] via-white/[0.025] to-sky-400/[0.025]",
);

/**
 * Transition visuelle avant le flux incidents.
 * On l’insère avant le premier bloc visible après Queue Operator Summary Footer,
 * en ciblant le CTA final validé.
 */
const transitionMarker = "{/* V2.37-incidents-transition */}";

if (!source.includes(transitionMarker)) {
  const anchor = "{/* V2.32-dedup-polish: CTA final doublon supprimé. Action conservée dans Queue Next Step Router. */}";
  const anchorIndex = source.indexOf(anchor);

  if (anchorIndex !== -1) {
    const afterAnchorIndex = source.indexOf("</div>", anchorIndex);

    if (afterAnchorIndex !== -1) {
      const insertAt = afterAnchorIndex + "</div>".length;

      const transition = `

                          ${transitionMarker}
                          <div className="my-6 rounded-[22px] border border-white/10 bg-gradient-to-br from-white/[0.045] via-sky-400/[0.035] to-transparent px-4 py-4 sm:my-8 sm:rounded-[26px] sm:px-5">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                              Incident Stream
                            </div>
                            <div className="mt-2 text-sm leading-6 text-zinc-300">
                              Liste opérationnelle alignée avec la file active et les signaux de triage.
                            </div>
                          </div>
`;

      source = source.slice(0, insertAt) + transition + source.slice(insertAt);
      changes += 1;
      console.log("OK transition incidents ajoutée après Queue Action");
    } else {
      console.log("Transition ignorée : fin de bloc introuvable.");
    }
  } else {
    console.log("Transition ignorée : anchor V2.32 introuvable.");
  }
}

fs.writeFileSync(filePath, source, "utf8");

console.log("");
console.log("Patch V2.37 bis appliqué.");
console.log(`Total modifications visuelles : ${changes}`);
console.log("Aucun changement logique, fetch, routing, endpoint, compteur ou lien.");
