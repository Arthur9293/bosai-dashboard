import type {
  CommandsResponse,
  EventsResponse,
  HealthResponse,
  HealthScoreResponse,
  IncidentsResponse,
  RunsResponse,
  EventMappingsResponse,
  EventCommandGraphResponse,
} from "./types";

const WORKER_BASE_URL =
  process.env.BOSAI_WORKER_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_BOSAI_WORKER_BASE_URL?.trim() ||
  "";

function getWorkerBaseUrl(): string {
  if (!WORKER_BASE_URL) {
    throw new Error(
      "Missing BOSAI worker base URL. Define BOSAI_WORKER_BASE_URL or NEXT_PUBLIC_BOSAI_WORKER_BASE_URL in Vercel."
    );
  }

  return WORKER_BASE_URL.replace(/\/+$/, "");
}

async function fetchJson<T>(path: string): Promise<T> {
  const baseUrl = getWorkerBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Request failed: ${response.status}${text ? ` — ${text}` : ""}`
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

export async function fetchEvents(): Promise<EventsResponse> {
  return fetchJson<EventsResponse>("/events");
}

export async function fetchEventMappings(): Promise<EventMappingsResponse> {
  return fetchJson<EventMappingsResponse>("/event-mappings");
}

export async function fetchEventCommandGraph(): Promise<EventCommandGraphResponse> {
  return fetchJson<EventCommandGraphResponse>("/event-command-graph");
}
export async function fetchCommandById(id: string) {
  const res = await fetch(`${process.env.BOSAI_WORKER_BASE_URL}/commands/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch command ${id}`);
  }

  return res.json();
}

export async function fetchRunById(id: string) {
  const res = await fetch(`${process.env.BOSAI_WORKER_BASE_URL}/runs/${id}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch run ${id}`);
  }

  return res.json();
}
