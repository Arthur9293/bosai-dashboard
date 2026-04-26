import fs from "node:fs";
import path from "node:path";

const pagePath = "src/app/(dashboard)/incidents/[id]/page.tsx";
const componentPath = "src/components/dashboard/IncidentHandshakePreviewLink.tsx";

const importLine =
  'import { IncidentHandshakePreviewLink } from "@/components/dashboard/IncidentHandshakePreviewLink";';

const marker = "Incident Detail V4.9-handshake-preview-link";

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function findOpeningTagEnd(source, tagName) {
  const start = source.indexOf(`<${tagName}`);
  if (start === -1) return -1;

  let quote = null;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (char === quote && source[i - 1] !== "\\") quote = null;
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }

    if (char === ">") return i;
  }

  return -1;
}

if (!fs.existsSync(pagePath)) {
  console.error("Page incident introuvable:", pagePath);
  process.exit(1);
}

ensureDir(componentPath);

const componentSource = `\
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Incident Detail V4.9-handshake-preview-link
 *
 * Navigation-only link.
 * No fetch.
 * No POST /run.
 * No worker call.
 * No Airtable mutation.
 * No secret exposure.
 */
export function IncidentHandshakePreviewLink() {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const cleanPathname = currentUrl.pathname.replace(/\\/$/, "");

    if (!/^\\/incidents\\/[^/]+$/.test(cleanPathname)) {
      setHref(null);
      return;
    }

    const workspaceId =
      currentUrl.searchParams.get("workspace_id") ||
      currentUrl.searchParams.get("workspaceId") ||
      "";

    const nextHref =
      cleanPathname +
      "/handshake-preview" +
      (workspaceId ? \`?workspace_id=\${encodeURIComponent(workspaceId)}\` : "");

    setHref(nextHref);
  }, []);

  if (!href) return null;

  return (
    <section
      data-bosai-marker="Incident Detail V4.9-handshake-preview-link"
      className="mx-auto mb-6 max-w-7xl px-4 sm:px-6 lg:px-8"
    >
      <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-950/20 p-4 shadow-[0_0_60px_rgba(34,211,238,0.06)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-200/70">
              UI / SERVER HANDSHAKE PREVIEW
            </p>
            <p className="text-sm leading-6 text-zinc-400">
              Accès lecture seule vers la prévisualisation serveur V4.8.2. Aucun fetch, aucun POST /run, aucun appel worker.
            </p>
          </div>

          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-500/15"
          >
            Ouvrir handshake preview
          </Link>
        </div>
      </div>
    </section>
  );
}
`;

fs.writeFileSync(componentPath, componentSource, "utf8");

let pageSource = fs.readFileSync(pagePath, "utf8");

if (!pageSource.includes(importLine)) {
  const lastImportMatch = [...pageSource.matchAll(/^import .*;$/gm)].pop();

  if (!lastImportMatch) {
    console.error("Aucun import trouvé dans page.tsx. Patch arrêté.");
    process.exit(1);
  }

  const insertAt = lastImportMatch.index + lastImportMatch[0].length;
  pageSource =
    pageSource.slice(0, insertAt) +
    "\\n" +
    importLine +
    pageSource.slice(insertAt);
}

if (pageSource.includes("<IncidentHandshakePreviewLink />")) {
  console.log("Lien V4.9 déjà présent dans page.tsx.");
} else {
  let anchorEnd = findOpeningTagEnd(pageSource, "main");
  let anchorName = "main";

  if (anchorEnd === -1) {
    anchorEnd = findOpeningTagEnd(pageSource, "ControlPlaneShell");
    anchorName = "ControlPlaneShell";
  }

  if (anchorEnd === -1) {
    console.error("Aucun anchor sûr trouvé (<main> ou <ControlPlaneShell>). Patch arrêté.");
    process.exit(1);
  }

  pageSource =
    pageSource.slice(0, anchorEnd + 1) +
    `\\n      {/* ${marker} */}\\n      <IncidentHandshakePreviewLink />\\n` +
    pageSource.slice(anchorEnd + 1);

  console.log("Lien V4.9 inséré après l'ouverture de:", anchorName);
}

fs.writeFileSync(pagePath, pageSource, "utf8");

console.log("V4.9 handshake preview link appliqué avec succès.");
console.log("Fichiers modifiés :");
console.log("-", pagePath);
console.log("-", componentPath);
console.log("Aucun fetch, aucun POST /run, aucun appel worker, aucune mutation.");
