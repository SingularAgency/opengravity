import {
  batchCreateAirtableRecords,
  createAirtableRecord,
  describeAirtableTable,
  getAirtableSchema,
  listAirtableBases,
  queryAirtableRecords,
  updateAirtableRecord,
} from "../../services/airtable.js";
import { UserFacingError } from "../../utils/user-facing-error.js";

export const airtableQueryDef = {
  type: "function" as const,
  function: {
    name: "airtable_query_records",
    description: "Fetch records from an Airtable base/table with optional filters.",
    parameters: {
      type: "object",
      properties: {
        table: {
          type: "string",
          description: "Name of the Airtable table to query (e.g., 'Projects').",
        },
        base_id: {
          type: "string",
          description: "Optional Airtable base ID. Defaults to the configured base.",
        },
        max_records: {
          type: "number",
          description: "Maximum number of records to retrieve (default 5).",
        },
        view: {
          type: "string",
          description: "View to apply (e.g., 'Grid view').",
        },
        filter_formula: {
          type: "string",
          description: "Airtable filterByFormula expression.",
        },
        fields: {
          type: "array",
          items: { type: "string" },
          description: "Subset of fields to return.",
        },
        match_fields: {
          type: "object",
          description: "Exact match filters expressed as { FieldName: value }.",
        },
        search_text: {
          type: "string",
          description: "Full-text search snippet. Requires search_field.",
        },
        search_field: {
          type: "string",
          description: "Field to apply search_text on.",
        },
      },
      required: ["table"],
    },
  },
};

export const airtableListBasesDef = {
  type: "function" as const,
  function: {
    name: "airtable_list_bases",
    description: "List Airtable bases accessible with the current token.",
    parameters: { type: "object", properties: {} },
  },
};

export const airtableListSchemaDef = {
  type: "function" as const,
  function: {
    name: "airtable_list_schema",
    description: "List tables and fields available in the configured Airtable base.",
    parameters: {
      type: "object",
      properties: {
        base_id: {
          type: "string",
          description: "Optional Airtable base ID. Defaults to the configured base.",
        },
      },
    },
  },
};

export const airtableQueryFn = async (args: {
  table: string;
  base_id?: string;
  max_records?: number;
  view?: string;
  filter_formula?: string;
  fields?: string[];
  match_fields?: Record<string, string | number | boolean>;
  search_text?: string;
  search_field?: string;
}) => {
  if (!args.table) {
    throw new UserFacingError("Debes indicar la tabla de Airtable que quieres consultar.");
  }

  try {
    const response = await queryAirtableRecords({
      table: args.table,
      baseId: args.base_id,
      maxRecords: args.max_records ?? 5,
      view: args.view,
      filterByFormula: args.filter_formula,
      fields: args.fields,
      matchFields: args.match_fields,
      searchText: args.search_text,
      searchField: args.search_field,
    });

    return formatAirtableRecords(response, args.table);
  } catch (error: any) {
    if (
      error instanceof UserFacingError &&
      error.details?.includes("Campos disponibles") &&
      args.fields &&
      args.fields.length > 0
    ) {
      const schema = await describeAirtableTable(args.table, args.base_id);
      const fallbackResponse = await queryAirtableRecords({
        table: args.table,
        baseId: args.base_id,
        maxRecords: args.max_records ?? 5,
        view: args.view,
        filterByFormula: args.filter_formula,
        matchFields: args.match_fields,
        searchText: args.search_text,
        searchField: args.search_field,
      });
      const schemaFields =
        schema?.fields.map((f) => `• ${f.name} (${f.type})`).join("\n") ||
        error.details;
      return `${error.toUserMessage()}\nCampos disponibles:\n${schemaFields}\n\nMostrando los registros sin filtrar campos:\n${formatAirtableRecords(
        fallbackResponse,
        args.table
      )}`;
    }
    throw error;
  }
};

export const airtableListSchemaFn = async (args: { base_id?: string } = {}) => {
  const tables = await getAirtableSchema(args.base_id);
  if (tables.length === 0) {
    return "No encontré tablas disponibles en esa base.";
  }

  const summary = tables
    .map((table) => {
      const fields = table.fields.map((f) => `${f.name} (${f.type})`).join(", ");
      return `• ${table.name} [${table.id}] → ${fields}`;
    })
    .join("\n");

  return `Esquema de Airtable:\n${summary}`;
};

export const airtableListBasesFn = async () => {
  const bases = await listAirtableBases();
  if (bases.length === 0) return "No encontré bases disponibles para este token.";
  return (
    "Bases disponibles:\n" +
    bases.map((base) => `• ${base.name} (${base.id})`).join("\n")
  );
};

export const airtableCreateRecordDef = {
  type: "function" as const,
  function: {
    name: "airtable_create_record",
    description: "Create a new record in Airtable. Requires explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        base_id: { type: "string" },
        fields: {
          type: "object",
          description: "Field dictionary to create.",
        },
        typecast: { type: "boolean", description: "Whether Airtable should coerce values." },
        confirm_write: {
          type: "boolean",
          description: "Must be true to allow write operations.",
        },
      },
      required: ["table", "fields"],
    },
  },
};

export const airtableUpdateRecordDef = {
  type: "function" as const,
  function: {
    name: "airtable_update_record",
    description: "Update an existing Airtable record. Requires explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        base_id: { type: "string" },
        record_id: { type: "string" },
        fields: { type: "object" },
        typecast: { type: "boolean" },
        confirm_write: {
          type: "boolean",
          description: "Must be true to allow write operations.",
        },
      },
      required: ["table", "record_id", "fields"],
    },
  },
};

export const airtableBatchCreateDef = {
  type: "function" as const,
  function: {
    name: "airtable_batch_create",
    description: "Create up to 10 records in Airtable. Requires explicit confirmation.",
    parameters: {
      type: "object",
      properties: {
        table: { type: "string" },
        base_id: { type: "string" },
        records: {
          type: "array",
          items: { type: "object" },
          description: "Array of field dictionaries.",
        },
        typecast: { type: "boolean" },
        confirm_write: {
          type: "boolean",
          description: "Must be true to allow write operations.",
        },
      },
      required: ["table", "records"],
    },
  },
};

export const airtableCreateRecordFn = async (args: {
  table: string;
  base_id?: string;
  fields: Record<string, any>;
  typecast?: boolean;
  confirm_write?: boolean;
}) => {
  requireWriteConfirmation(args.confirm_write);
  const result = await createAirtableRecord({
    table: args.table,
    baseId: args.base_id,
    fields: args.fields,
    typecast: args.typecast,
  });
  return `Registro creado exitosamente (ID: ${result.id}).`;
};

export const airtableUpdateRecordFn = async (args: {
  table: string;
  base_id?: string;
  record_id: string;
  fields: Record<string, any>;
  typecast?: boolean;
  confirm_write?: boolean;
}) => {
  requireWriteConfirmation(args.confirm_write);
  await updateAirtableRecord({
    table: args.table,
    baseId: args.base_id,
    recordId: args.record_id,
    fields: args.fields,
    typecast: args.typecast,
  });
  return `Registro ${args.record_id} actualizado correctamente.`;
};

export const airtableBatchCreateFn = async (args: {
  table: string;
  base_id?: string;
  records: Record<string, any>[];
  typecast?: boolean;
  confirm_write?: boolean;
}) => {
  requireWriteConfirmation(args.confirm_write);
  if (!Array.isArray(args.records) || args.records.length === 0) {
    throw new UserFacingError("Debes proporcionar al menos un registro para crear.");
  }
  const result = await batchCreateAirtableRecords({
    table: args.table,
    baseId: args.base_id,
    records: args.records,
    typecast: args.typecast,
  });
  return `Se crearon ${result.records?.length ?? args.records.length} registros.`;
};

function requireWriteConfirmation(confirm?: boolean) {
  if (!confirm) {
    throw new UserFacingError(
      "Esta operación escribe en Airtable y requiere confirmación.",
      { hint: "Añade confirm_write=true en la llamada si realmente deseas ejecutar la acción." }
    );
  }
}

function formatAirtableRecords(response: { records?: { id: string; fields: Record<string, any> }[] }, table: string) {
  if (!response.records || response.records.length === 0) {
    return `No se encontraron registros en la tabla ${table}.`;
  }
  const columns = pickColumns(response.records);
  if (columns.length === 0) {
    const summary = response.records
      .map((record) => `• (${record.id}) ${JSON.stringify(record.fields)}`)
      .join("\n");
    return `Resultados de Airtable (${table}):\n${summary}`;
  }

  const rows = response.records.map((record) => [
    record.id,
    ...columns.map((column) => formatValue(record.fields[column])),
  ]);
  const tableOutput = renderTable(["ID", ...columns], rows);
  return `Resultados de Airtable (${table}):\n${tableOutput}`;
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return value.map((v) => formatValue(v)).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function pickColumns(records: { fields: Record<string, any> }[]) {
  const seen = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record.fields)) {
      if (seen.size >= 4) break;
      seen.add(key);
    }
    if (seen.size >= 4) break;
  }
  return Array.from(seen);
}

function renderTable(headers: string[], rows: string[][]) {
  const widths = headers.map((header, index) => {
    return Math.max(
      header.length,
      ...rows.map((row) => (row[index]?.length || 0))
    );
  });

  const formatRow = (cells: string[]) =>
    `| ${cells
      .map((cell, idx) => (cell || "").padEnd(widths[idx], " "))
      .join(" | ")} |`;

  const separator = `|-${widths.map((w) => "-".repeat(w)).join("-|-")}-|`;

  const output = [
    formatRow(headers),
    separator,
    ...rows.map((row) => formatRow(row)),
  ];

  return output.join("\n");
}
