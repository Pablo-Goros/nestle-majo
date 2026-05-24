import Papa from "papaparse";
import * as XLSX from "xlsx";
import { COLUMN_ALIASES } from "./constants";
import { normalizeHeader } from "./normalize";
import type { ColumnMapping, RequiredColumn } from "./types";
import { REQUIRED_COLUMNS } from "./types";

export interface RawParseResult {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
}

export async function parseUploadedFile(file: File): Promise<RawParseResult> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "csv") return parseCsvFile(file);
  if (ext === "xlsx" || ext === "xls") return parseExcelFile(file);
  throw new Error("Formato no soportado. Usá .csv, .xlsx o .xls");
}

function parseCsvFile(file: File): Promise<RawParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const headers = res.meta.fields ?? [];
        resolve({
          headers,
          rows: (res.data ?? []).filter((r) =>
            Object.values(r).some((v) => String(v ?? "").trim()),
          ),
          fileName: file.name,
        });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcelFile(file: File): Promise<RawParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]!];
  if (!sheet) throw new Error("El archivo Excel no tiene hojas");
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  const headers =
    json.length > 0 ? Object.keys(json[0]!) : (XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[]) ?? [];
  const rows = json.map((row) => {
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = v == null ? "" : String(v);
    }
    return out;
  });
  return { headers, rows, fileName: file.name };
}

export function suggestColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    norm: normalizeHeader(h),
  }));

  for (const col of REQUIRED_COLUMNS) {
    const aliases = COLUMN_ALIASES[col] ?? [col];
    const match = normalizedHeaders.find((h) =>
      aliases.some((a) => normalizeHeader(a) === h.norm || h.norm.includes(normalizeHeader(a))),
    );
    if (match) mapping[col] = match.original;
  }

  return mapping;
}

export function isMappingComplete(mapping: ColumnMapping): boolean {
  return REQUIRED_COLUMNS.every((c) => Boolean(mapping[c]));
}
