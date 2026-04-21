"use client";

type WorkspaceRouteMemoryProps = {
  workspaceId: string;
};

/**
 * Patch ultra-safe temporaire.
 *
 * But :
 * - éliminer un crash client global venant de la mémoire de route workspace
 * - ne pas toucher au core auth / workspace / dashboard
 * - garder l’app utilisable pendant le diagnostic
 *
 * Effet :
 * - la mémoire de dernière route par workspace est temporairement désactivée
 * - aucune conséquence sur login, activation, overview, commands, etc.
 */
export function WorkspaceRouteMemory({
  workspaceId: _workspaceId,
}: WorkspaceRouteMemoryProps) {
  return null;
}
