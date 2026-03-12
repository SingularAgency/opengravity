import { env } from "../config/env.js";
import { UserFacingError } from "../utils/user-facing-error.js";

const AIRTABLE_API_URL = "https://api.airtable.com/v0";
const AIRTABLE_META_URL = "https://api.airtable.com/v0/meta/bases";

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

interface AirtableTableSchema {
  id: string;
  name: string;
  fields: Array<{ id: string; name: string; type: string }>;
}

interface AirtableSchemaResponse {
  tables: AirtableTableSchema[];
}

const schemaCache = new Map<string, AirtableTableSchema[]>();

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
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = null;
    }

    if (
      response.status === 422 &&
      parsed?.error?.type === "UNKNOWN_FIELD_NAME" &&
      options.fields &&
      options.fields.length > 0
    ) {
      const tableSchema = await describeAirtableTable(options.table, baseId);
      const fieldNames = tableSchema?.fields.map((f) => f.name).join(", ") || "No se pudo obtener el esquema.";
      throw new UserFacingError(
        `No reconozco alguno de los campos solicitados en la tabla ${options.table}.`,
        {
          hint: "Intenta de nuevo sin limitar campos o usa los nombres exactos mostrados.",
          details: `Campos disponibles: ${fieldNames}`,
        }
      );
    }

    throw new UserFacingError("No pude obtener datos de Airtable.", {
      details: `HTTP ${response.status}: ${errorText}`,
      hint: "Verifica el token, la base y los permisos del PAT.",
    });
  }

  const data = (await response.json()) as AirtableResponse;
  return data;
}

export async function getAirtableSchema(baseId?: string): Promise<AirtableTableSchema[]> {
  ensureCredentials(baseId);
  const resolvedBase = baseId || env.AIRTABLE_BASE_ID;

  if (schemaCache.has(resolvedBase)) {
    return schemaCache.get(resolvedBase)!;
  }

  const response = await fetch(`${AIRTABLE_META_URL}/${resolvedBase}/tables`, {
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new UserFacingError("No pude obtener el esquema de Airtable.", {
      details: `HTTP ${response.status}: ${errorText}`,
      hint: "Confirma que el PAT tiene acceso al endpoint metadata.",
    });
  }

  const data = (await response.json()) as AirtableSchemaResponse;
  schemaCache.set(resolvedBase, data.tables);
  return data.tables;
}

export async function describeAirtableTable(table: string, baseId?: string) {
  const schema = await getAirtableSchema(baseId);
  return schema.find(
    (t) => t.name.toLowerCase() === table.toLowerCase() || t.id === table
  );
}
