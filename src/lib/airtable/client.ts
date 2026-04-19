import "server-only";

import { getAirtableConfig } from "./config";

export type AirtableSortDirection = "asc" | "desc";

export type AirtableSort = {
  field: string;
  direction?: AirtableSortDirection;
};

export type AirtableRecord<
  TFields extends Record<string, unknown> = Record<string, unknown>
> = {
  id: string;
  createdTime?: string;
  fields: TFields;
};

export type AirtableListRecordsInput = {
  table: string;
  view?: string;
  filterByFormula?: string;
  maxRecords?: number;
  pageSize?: number;
  fields?: string[];
  sorts?: AirtableSort[];
};

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function encodeTableName(table: string): string {
  return encodeURIComponent(table);
}

function buildListUrl(input: AirtableListRecordsInput, offset?: string): string {
  const config = getAirtableConfig();
  const url = new URL(
    `https://api.airtable.com/v0/${config.baseId}/${encodeTableName(input.table)}`
  );

  if (input.view) {
    url.searchParams.set("view", input.view);
  }

  if (input.filterByFormula) {
    url.searchParams.set("filterByFormula", input.filterByFormula);
  }

  if (typeof input.maxRecords === "number" && input.maxRecords > 0) {
    url.searchParams.set("maxRecords", String(input.maxRecords));
  }

  if (typeof input.pageSize === "number" && input.pageSize > 0) {
    url.searchParams.set("pageSize", String(input.pageSize));
  }

  for (const field of input.fields || []) {
    const normalized = text(field);
    if (normalized) {
      url.searchParams.append("fields[]", normalized);
    }
  }

  (input.sorts || []).forEach((sort, index) => {
    const field = text(sort.field);
    const direction = sort.direction === "desc" ? "desc" : "asc";

    if (!field) return;

    url.searchParams.set(`sort[${index}][field]`, field);
    url.searchParams.set(`sort[${index}][direction]`, direction);
  });

  if (offset) {
    url.searchParams.set("offset", offset);
  }

  return url.toString();
}

async function airtableFetchJson<T>(url: string): Promise<T> {
  const config = getAirtableConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(
        `Airtable request failed (${response.status} ${response.statusText})${body ? `: ${body}` : ""}`
      );
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

type AirtableListResponse<
  TFields extends Record<string, unknown> = Record<string, unknown>
> = {
  records?: AirtableRecord<TFields>[];
  offset?: string;
};

export async function airtableListRecords<
  TFields extends Record<string, unknown> = Record<string, unknown>
>(
  input: AirtableListRecordsInput
): Promise<AirtableRecord<TFields>[]> {
  const all: AirtableRecord<TFields>[] = [];
  let offset = "";

  while (true) {
    const url = buildListUrl(input, offset || undefined);
    const payload = await airtableFetchJson<AirtableListResponse<TFields>>(url);
    const records = Array.isArray(payload.records) ? payload.records : [];

    all.push(...records);

    if (!payload.offset) {
      break;
    }

    offset = payload.offset;

    if (
      typeof input.maxRecords === "number" &&
      input.maxRecords > 0 &&
      all.length >= input.maxRecords
    ) {
      return all.slice(0, input.maxRecords);
    }
  }

  if (
    typeof input.maxRecords === "number" &&
    input.maxRecords > 0 &&
    all.length > input.maxRecords
  ) {
    return all.slice(0, input.maxRecords);
  }

  return all;
}

export async function airtableFirstRecord<
  TFields extends Record<string, unknown> = Record<string, unknown>
>(
  input: AirtableListRecordsInput
): Promise<AirtableRecord<TFields> | null> {
  const records = await airtableListRecords<TFields>({
    ...input,
    maxRecords: 1,
    pageSize: 1,
  });

  return records[0] || null;
}

export function airtableEscapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export function getTextCell(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") {
    return value.trim();
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }

  if (Array.isArray(value)) {
    const first = value.find((item) => text(item));
    return text(first);
  }

  return "";
}

export function getNumberCell(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getBooleanCell(value: unknown): boolean {
  return value === true;
}

export function getStringArrayCell(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => text(item)).filter(Boolean);
}

export function getLinkedRecordIds(value: unknown): string[] {
  return getStringArrayCell(value);
}

export function getFirstLinkedRecordId(value: unknown): string {
  return getLinkedRecordIds(value)[0] || "";
}
