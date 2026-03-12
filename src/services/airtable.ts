import { env } from "../config/env.js";
import { resolveFieldAlias, resolveTableAlias } from "../config/airtable-aliases.js";
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
  matchFields?: Record<string, string | number | boolean>;
  searchText?: string;
  searchField?: string;
}

export interface AirtableWriteOptions {
  baseId?: string;
  table: string;
  fields: Record<string, any>;
  typecast?: boolean;
}

export interface AirtableBatchCreateOptions {
  baseId?: string;
  table: string;
  records: Record<string, any>[];
  typecast?: boolean;
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

interface AirtableBasesResponse {
  bases: Array<{ id: string; name: string }>;
}

const schemaCache = new Map<string, AirtableTableSchema[]>();

function ensureCredentials(baseId?: string) {
  if (!env.AIRTABLE_API_KEY) {
    throw new UserFacingError("Airtable no está configurado.", {
      hint: "Genera un personal access token en https://airtable.com/create/tokens y colócalo como AIRTABLE_API_KEY.",
    });
  }
  if (!baseId && !env.AIRTABLE_BASE_ID) {
    throw new UserFacingError("Falta el ID de la base de Airtable.", {
      hint: "Define AIRTABLE_BASE_ID por defecto o pásalo en la herramienta.",
    });
  }
}

async function fetchWithAuth(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.AIRTABLE_API_KEY}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return response;
}

export async function listAirtableBases() {
  ensureCredentials();
  const response = await fetchWithAuth(AIRTABLE_META_URL);
  if (!response.ok) {
    const text = await response.text();
    throw new UserFacingError("No pude listar tus bases de Airtable.", {
      details: `HTTP ${response.status}: ${text}`,
      hint: "Asegúrate de que el PAT tenga el scope schema.bases:read.",
    });
  }
  const data = (await response.json()) as AirtableBasesResponse;
  return data.bases;
}

export async function getAirtableSchema(baseId?: string): Promise<AirtableTableSchema[]> {
  ensureCredentials(baseId);
  const resolvedBase = baseId || env.AIRTABLE_BASE_ID;
  if (schemaCache.has(resolvedBase)) {
    return schemaCache.get(resolvedBase)!;
  }

  const response = await fetchWithAuth(`${AIRTABLE_META_URL}/${resolvedBase}/tables`);
  if (!response.ok) {
    const text = await response.text();
    throw new UserFacingError("No pude obtener el esquema de Airtable.", {
      details: `HTTP ${response.status}: ${text}`,
      hint: "Confirma que el PAT tiene acceso a schema.bases:read.",
    });
  }

  const data = (await response.json()) as AirtableSchemaResponse;
  schemaCache.set(resolvedBase, data.tables);
  return data.tables;
}

async function getTableSchema(table: string, baseId?: string) {
  const resolvedBase = baseId || env.AIRTABLE_BASE_ID;
  const alias = resolveTableAlias(resolvedBase, table);
  const schema = await getAirtableSchema(resolvedBase);
  const match =
    schema.find((t) => t.name.toLowerCase() === alias.toLowerCase()) ||
    schema.find((t) => t.id === alias);

  if (!match) {
    const tableList = schema.map((t) => t.name).join(", ");
    throw new UserFacingError(`La tabla ${table} no existe en la base seleccionada.`, {
      hint: `Tablas disponibles: ${tableList}`,
    });
  }

  return match;
}

function normalizeFieldName(schema: AirtableTableSchema, field: string, baseId?: string) {
  const alias = resolveFieldAlias(baseId, schema.name, field);
  const match =
    schema.fields.find((f) => f.name.toLowerCase() === alias.toLowerCase()) ||
    schema.fields.find((f) => f.id === alias);
  return match?.name || alias;
}

function escapeFormulaValue(value: string | number | boolean) {
  if (typeof value === "number" || typeof value === "boolean") {
    return `${value}`;
  }
  const escaped = value.replace(/'/g, "\\'");
  return `'${escaped}'`;
}

function buildFormula(options: AirtableQueryOptions, schema: AirtableTableSchema, baseId?: string) {
  if (options.filterByFormula) return options.filterByFormula;

  const clauses: string[] = [];

  if (options.matchFields) {
    for (const [field, value] of Object.entries(options.matchFields)) {
      const normalizedField = normalizeFieldName(schema, field, baseId);
      clauses.push(`{${normalizedField}} = ${escapeFormulaValue(value)}`);
    }
  }

  if (options.searchText && options.searchField) {
    const normalizedField = normalizeFieldName(schema, options.searchField, baseId);
    clauses.push(`FIND(${escapeFormulaValue(options.searchText)}, {${normalizedField}})`);
  }

  if (clauses.length === 0) return undefined;
  if (clauses.length === 1) return clauses[0];
  return `AND(${clauses.join(",")})`;
}

export async function queryAirtableRecords(options: AirtableQueryOptions) {
  ensureCredentials(options.baseId);

  const baseId = options.baseId || env.AIRTABLE_BASE_ID;
  const tableSchema = await getTableSchema(options.table, baseId);
  const params = new URLSearchParams();

  if (options.maxRecords) params.append("maxRecords", Math.min(options.maxRecords, 50).toString());
  if (options.view) params.append("view", options.view);
  const formula = buildFormula(options, tableSchema, baseId);
  if (formula) params.append("filterByFormula", formula);

  const resolvedFields =
    options.fields?.map((field) => normalizeFieldName(tableSchema, field, baseId)) || [];
  if (resolvedFields.length > 0) {
    resolvedFields.forEach((field) => params.append("fields[]", field));
  }

  if (options.sort && options.sort.length > 0) {
    options.sort.forEach((sort, index) => {
      const normalizedField = normalizeFieldName(tableSchema, sort.field, baseId);
      params.append(`sort[${index}][field]`, normalizedField);
      params.append(`sort[${index}][direction]`, sort.direction || "asc");
    });
  }

  const url = `${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(tableSchema.name)}?${params.toString()}`;

  const response = await fetchWithAuth(url);

  if (!response.ok) {
    const errorText = await response.text();
    let parsed: any;
    try {
      parsed = JSON.parse(errorText);
    } catch {
      parsed = null;
    }

    if (response.status === 422 && parsed?.error?.type === "UNKNOWN_FIELD_NAME") {
      const fieldNames = tableSchema.fields.map((f) => `${f.name} (${f.type})`).join(", ");
      throw new UserFacingError(
        `No reconozco alguno de los campos solicitados en la tabla ${tableSchema.name}.`,
        {
          hint: "Intenta de nuevo usando los nombres exactos mostrados.",
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

export async function createAirtableRecord(options: AirtableWriteOptions) {
  ensureCredentials(options.baseId);
  const baseId = options.baseId || env.AIRTABLE_BASE_ID;
  const schema = await getTableSchema(options.table, baseId);
  const url = `${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(schema.name)}`;

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      fields: options.fields,
      typecast: options.typecast ?? true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new UserFacingError("No pude crear el registro en Airtable.", {
      details: `HTTP ${response.status}: ${text}`,
      hint: "Verifica los campos enviados y que el PAT tenga permisos de escritura.",
    });
  }

  return response.json();
}

export async function updateAirtableRecord(options: AirtableWriteOptions & { recordId: string }) {
  ensureCredentials(options.baseId);
  const baseId = options.baseId || env.AIRTABLE_BASE_ID;
  const schema = await getTableSchema(options.table, baseId);
  const url = `${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(schema.name)}/${options.recordId}`;

  const response = await fetchWithAuth(url, {
    method: "PATCH",
    body: JSON.stringify({
      fields: options.fields,
      typecast: options.typecast ?? true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new UserFacingError("No pude actualizar el registro en Airtable.", {
      details: `HTTP ${response.status}: ${text}`,
      hint: "Revisa el ID del registro y los campos enviados.",
    });
  }

  return response.json();
}

export async function batchCreateAirtableRecords(options: AirtableBatchCreateOptions) {
  ensureCredentials(options.baseId);
  const baseId = options.baseId || env.AIRTABLE_BASE_ID;
  const schema = await getTableSchema(options.table, baseId);
  const url = `${AIRTABLE_API_URL}/${baseId}/${encodeURIComponent(schema.name)}`;

  const payloadRecords = options.records.slice(0, 10).map((fields) => ({ fields }));

  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      records: payloadRecords,
      typecast: options.typecast ?? true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new UserFacingError("No pude crear los registros en lote en Airtable.", {
      details: `HTTP ${response.status}: ${text}`,
      hint: "Valida los campos y que el PAT tenga permisos de escritura.",
    });
  }

  return response.json();
}

export async function describeAirtableTable(table: string, baseId?: string) {
  return getTableSchema(table, baseId);
}
