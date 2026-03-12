import { env } from "../config/env.js";
import { UserFacingError } from "../utils/user-facing-error.js";

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
    throw new UserFacingError("Airtable no está configurado.", {
      hint: "Agrega AIRTABLE_API_KEY en tu archivo .env o panel.",
    });
  }
  if (!baseId && !env.AIRTABLE_BASE_ID) {
    throw new UserFacingError("Falta el ID de la base de Airtable.", {
      hint: "Define AIRTABLE_BASE_ID por defecto o pásalo en la herramienta.",
    });
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
    throw new UserFacingError("No pude obtener datos de Airtable.", {
      details: `HTTP ${response.status}: ${errorText}`,
      hint: "Verifica el token, la base y los permisos del PAT.",
    });
  }

  const data = (await response.json()) as AirtableResponse;
  return data;
}
