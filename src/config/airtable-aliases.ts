import fs from "fs";
import path from "path";

interface TableAliasConfig {
  name?: string;
  fields?: Record<string, string>;
}

interface AirtableAliasConfig {
  tables?: Record<string, TableAliasConfig>;
}

interface AliasFile {
  [baseId: string]: AirtableAliasConfig;
}

let cache: AliasFile | null = null;

function loadAliasFile(): AliasFile {
  if (cache) return cache;

  const filePath = path.resolve(process.cwd(), "config", "airtable-aliases.json");
  if (!fs.existsSync(filePath)) {
    cache = {};
    return cache;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    cache = JSON.parse(raw) as AliasFile;
  } catch (err) {
    console.warn("[AirtableAlias] Could not parse airtable-aliases.json", err);
    cache = {};
  }
  return cache!;
}

export function resolveTableAlias(baseId: string | undefined, table: string): string {
  const normalizedTable = table.trim().toLowerCase();
  const aliases = loadAliasFile();
  const key = baseId?.toLowerCase() || "default";
  const entry = aliases[key]?.tables?.[normalizedTable] || aliases["default"]?.tables?.[normalizedTable];
  return entry?.name || table;
}

export function resolveFieldAlias(
  baseId: string | undefined,
  table: string,
  field: string
): string {
  const normalizedField = field.trim().toLowerCase();
  const aliases = loadAliasFile();
  const key = baseId?.toLowerCase() || "default";
  const tableKey = table.trim().toLowerCase();
  const baseTable =
    aliases[key]?.tables?.[tableKey] ||
    aliases["default"]?.tables?.[tableKey];
  return baseTable?.fields?.[normalizedField] || field;
}
