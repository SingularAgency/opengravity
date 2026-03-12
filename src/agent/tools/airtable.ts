import { describeAirtableTable, getAirtableSchema, queryAirtableRecords } from "../../services/airtable.js";
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
      },
      required: ["table"],
    },
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

function formatAirtableRecords(response: { records?: { id: string; fields: Record<string, any> }[] }, table: string) {
  if (!response.records || response.records.length === 0) {
    return `No se encontraron registros en la tabla ${table}.`;
  }
  const summary = response.records
    .map((record) => {
      const preview = Object.entries(record.fields)
        .map(([key, value]) => `${key}: ${formatValue(value)}`)
        .slice(0, 6)
        .join(" | ");
      return `• (${record.id}) ${preview}`;
    })
    .join("\n");

  return `Resultados de Airtable (${table}):\n${summary}`;
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
