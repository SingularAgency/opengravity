import { queryAirtableRecords } from "../../services/airtable.js";

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

export const airtableQueryFn = async (args: {
  table: string;
  base_id?: string;
  max_records?: number;
  view?: string;
  filter_formula?: string;
  fields?: string[];
}) => {
  try {
    const response = await queryAirtableRecords({
      table: args.table,
      baseId: args.base_id,
      maxRecords: args.max_records ?? 5,
      view: args.view,
      filterByFormula: args.filter_formula,
      fields: args.fields,
    });

    if (!response.records || response.records.length === 0) {
      return `No se encontraron registros en la tabla ${args.table}.`;
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

    return `Resultados de Airtable (${args.table}):\n${summary}`;
  } catch (error: any) {
    return `Error consultando Airtable: ${error.message}`;
  }
};

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
