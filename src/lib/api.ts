import type {
  CommandsResponse,
  HealthResponse,
  HealthScoreResponse,
  IncidentsResponse,
  RunsResponse,
} from "./types";

const WORKER_BASE_URL =
  process.env.BOSAI_WORKER_BASE_URL?.replace(/\/+$/, "") ||
  process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL?.replace(/\/+$/, "") ||
  "";

function buildUrl(path: string) {
  if (!WORKER_BASE_URL) {
    throw new Error(
      "Missing BOSAI worker base URL. Set BOSAI_WORKER_BASE_URL or NEXT_PUBLIC_BOSAI_WORKER_BASE_URL."
    );
  }

  return `${WORKER_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Request failed: ${response.status} ${response.statusText}${
        text ? ` — ${text}` : ""
      }`
    );
  }

  return response.json() as Promise<T>;
}

export async function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export async function fetchHealthScore(): Promise<HealthScoreResponse> {
  return fetchJson<HealthScoreResponse>("/health/score");
}

export async function fetchRuns(): Promise<RunsResponse> {
  return fetchJson<RunsResponse>("/runs");
}

export async function fetchCommands(): Promise<CommandsResponse> {
  return fetchJson<CommandsResponse>("/commands");
}

export async function fetchIncidents(): Promise<IncidentsResponse> {
  return fetchJson<IncidentsResponse>("/incidents");
}
