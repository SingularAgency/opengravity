import { env } from "../config/env.js";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";

export interface AirtableQueryOptions {
  baseId?: string;
  table: string;
  maxRecords?: number;
  view?: string;
  filterByFormula?: string;
  fields?: string[];
  sort?: Array<{ field: string; direction?: "asc" | "desc" }>;
}

interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

function ensureCredentials(baseId?: string) {
  if (!env.AIRTABLE_API_KEY) {
    throw new Error("AIRTABLE_API_KEY is not configured");
  }
  if (!baseId && !env.AIRTABLE_BASE_ID) {
    throw new Error("AIRTABLE_BASE_ID is not configured");
  }
}

export async function queryAirtableRecords(options: AirtableQueryOptions) {
  ensureCredentials(options.baseId);

  const baseId = options.baseId || env.AIRTABLE_BASE_ID;
  const tableName = encodeURIComponent(options.table);
  const params = new URLSearchParams();

  if (options.maxRecords) params.append("maxRecords", options.maxRecords.toString());
  if (options.view) params.append("view", options.view);
  if (options.filterByFormula) params.append("filterByFormula", options.filterByFormula);
  if (options.fields && options.fields.length > 0) {
    options.fields.forEach((field) => params.append("fields[]", field));
  }
  if (options.sort && options.sort.length > 0) {
    options.sort.forEach((sort, index) => {
      params.append(`sort[${index}][field]`, sort.field);
      params.append(`sort[${index}][direction]`, sort.direction || "asc");
    });
  }

  const url = `${AIRTABLE_API_URL}/${baseId}/${tableName}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Airtable Error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as AirtableResponse;
  return data;
}
