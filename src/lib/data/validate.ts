import { REQUIRED_COLUMNS } from "./types";
import type {
  ColumnMapping,
  ColumnValidation,
  OrderRecord,
  ParsePreview,
  RequiredColumn,
} from "./types";
import {
  formatDateIso,
  parseFlexibleDate,
} from "./normalize";
import { isMappingComplete } from "./parse";
import { normalizeUploadedData } from "@/lib/dataNormalization";

export function validateColumnMapping(
  mapping: ColumnMapping,
): ColumnValidation[] {
  return REQUIRED_COLUMNS.map((column) => {
    const sourceHeader = mapping[column];
    if (!sourceHeader) {
      return { column, mapped: false, status: "missing", message: "Sin mapear" };
    }
    return { column, mapped: true, sourceHeader, status: "ok" };
  });
}

export function mapRowsToOrders(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): { orders: OrderRecord[]; errors: string[] } {
  if (!isMappingComplete(mapping)) {
    return { orders: [], errors: ["Completá el mapeo de columnas antes de validar."] };
  }

  const normalizedRows = normalizeUploadedData(rows, mapping);
  const orders: OrderRecord[] = [];
  const errors: string[] = [];

  normalizedRows.forEach((row, idx) => {
    const line = idx + 2;
    const emision = parseFlexibleDate(row.date);
    const entrega = parseFlexibleDate(row.deliveryDate);
    const cantidad = row.quantity;
    const estado = row.status;
    const canal = row.channel;

    if (!emision) errors.push(`Fila ${line}: fecha inválida`);
    if (!entrega) errors.push(`Fila ${line}: fecha inválida`);
    if (cantidad == null || !Number.isFinite(cantidad)) errors.push(`Fila ${line}: cantidad no numérica`);
    if (!estado) errors.push(`Fila ${line}: estado inválido`);
    if (!canal) errors.push(`Fila ${line}: canal inválido`);

    if (!emision || !entrega || cantidad == null || !Number.isFinite(cantidad) || !estado || !canal) return;

    orders.push({
      id: `OC-${line}-${row.sku}`,
      fecha_emision: formatDateIso(emision),
      tipo_canal: canal,
      nombre_canal: row.customer || "Cliente desconocido",
      locacion: String(row.raw.locacion ?? "").trim(),
      producto_nombre: row.productName,
      producto_codigo: row.sku.toUpperCase(),
      cantidad,
      fecha_entrega: formatDateIso(entrega),
      estado,
    });
  });

  return { orders, errors };
}

export function validateOrders(orders: OrderRecord[]): ColumnValidation[] {
  const base = validateColumnMapping(
    Object.fromEntries(REQUIRED_COLUMNS.map((c) => [c, c])) as ColumnMapping,
  );

  if (orders.length === 0) {
    return base.map((v) => ({
      ...v,
      status: "invalid" as const,
      message: "Sin registros válidos",
    }));
  }

  return base.map((v) => ({ ...v, status: "ok" as const, message: "OK" }));
}

export function buildParsePreview(orders: OrderRecord[]): ParsePreview {
  const skus = new Set(orders.map((o) => o.producto_codigo));
  const channels = new Set(orders.map((o) => o.tipo_canal));
  const dates = orders
    .map((o) => parseFlexibleDate(o.fecha_emision))
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    totalRows: orders.length,
    skuCount: skus.size,
    channelCount: channels.size,
    dateFrom: dates[0] ? formatDateIso(dates[0]) : null,
    dateTo: dates[dates.length - 1] ? formatDateIso(dates[dates.length - 1]!) : null,
    previewRows: orders.slice(0, 20),
  };
}
