import { COLUMN_ALIASES } from "@/lib/data/constants";
import { formatDateIso, normalizeChannel, normalizeHeader, normalizeStatus, parseFlexibleDate, parseQuantity } from "@/lib/data/normalize";
import type { ColumnMapping } from "@/lib/data/types";

export interface NormalizedUploadedRow {
  date: string;
  deliveryDate: string;
  sku: string;
  productName: string;
  channel: string;
  customer: string;
  quantity: number;
  status: string;
  price: number | null;
  stock: number | null;
  raw: Record<string, unknown>;
}

const NORMALIZED_COLUMN_ALIASES: Record<string, string[]> = {
  date: [
    "fecha_emision",
    "fecha emision",
    "fecha_emisión",
    "emision",
    "fecha",
    "date",
    "timestamp",
    "periodo",
  ],
  deliveryDate: [
    "fecha_entrega",
    "fecha entrega",
    "entrega",
    "delivery_date",
    "due_date",
    "delivery",
  ],
  sku: [
    "producto_codigo",
    "producto codigo",
    "codigo",
    "código",
    "sku",
    "sku_code",
  ],
  productName: [
    "producto_nombre",
    "producto nombre",
    "producto",
    "nombre_producto",
    "sku_nombre",
    "product_name",
    "name",
  ],
  channel: [
    "tipo_canal",
    "tipo canal",
    "canal",
    "canal_tipo",
    "channel",
    "channel_type",
  ],
  customer: [
    "nombre_canal",
    "nombre canal",
    "cliente",
    "cliente_nombre",
    "nombre_cliente",
    "customer",
    "customer_name",
  ],
  quantity: [
    "cantidad",
    "qty",
    "unidades",
    "volume",
    "cantidad_unidades",
    "quantity",
  ],
  status: [
    "estado",
    "status",
    "estado_pedido",
    "order_status",
    "estado_estado",
  ],
  price: [
    "precio",
    "price",
    "precio_unitario",
    "unit_price",
    "price_per_unit",
  ],
  stock: [
    "stock",
    "inventario",
    "inventory",
    "stock_actual",
    "on_hand",
  ],
};

function findColumnValue(
  row: Record<string, unknown>,
  mapping: ColumnMapping | undefined,
  key: string,
): string {
  const mappedHeader = mapping?.[key as keyof ColumnMapping];
  if (mappedHeader && row[mappedHeader] != null) {
    return String(row[mappedHeader]);
  }

  const normalizedKeys = Object.keys(row).map((header) => ({
    header,
    normalized: normalizeHeader(header),
  }));

  const aliases = [...(COLUMN_ALIASES[key as keyof ColumnMapping] ?? []), ...(NORMALIZED_COLUMN_ALIASES[key] ?? [])];

  for (const alias of aliases) {
    const aliasNorm = normalizeHeader(alias);
    const match = normalizedKeys.find((col) => col.normalized === aliasNorm);
    if (match) return String(row[match.header] ?? "");
  }

  for (const col of normalizedKeys) {
    if (aliases.some((alias) => normalizeHeader(alias) === col.normalized)) {
      return String(row[col.header] ?? "");
    }
  }

  return "";
}

export function normalizeUploadedData(
  rows: Record<string, unknown>[],
  mapping?: ColumnMapping,
): NormalizedUploadedRow[] {
  return rows.map((row) => {
    const rawDate = findColumnValue(row, mapping, "date");
    const rawDeliveryDate = findColumnValue(row, mapping, "deliveryDate");
    const parsedDate = parseFlexibleDate(rawDate);
    const parsedDelivery = parseFlexibleDate(rawDeliveryDate) ?? parsedDate;
    const date = parsedDate ? formatDateIso(parsedDate) : String(rawDate ?? "");
    const deliveryDate = parsedDelivery ? formatDateIso(parsedDelivery) : String(rawDeliveryDate || rawDate || "");

    const sku = String(findColumnValue(row, mapping, "sku") || "").toUpperCase().trim();
    const productName = String(findColumnValue(row, mapping, "productName") || "").trim();
    const channelRaw = String(findColumnValue(row, mapping, "channel") || "").trim();
    const channel = normalizeChannel(channelRaw) ?? channelRaw;
    const customer = String(findColumnValue(row, mapping, "customer") || "").trim();
    const quantity = parseQuantity(findColumnValue(row, mapping, "quantity")) ?? 0;
    const statusRaw = String(findColumnValue(row, mapping, "status") || "").trim();
    const status = (normalizeStatus(statusRaw) ?? statusRaw) || "pendiente";
    const price = parseQuantity(findColumnValue(row, mapping, "price"));
    const stock = parseQuantity(findColumnValue(row, mapping, "stock"));

    return {
      date,
      deliveryDate,
      sku,
      productName,
      channel,
      customer,
      quantity,
      status,
      price: price ?? null,
      stock: stock ?? null,
      raw: row,
    };
  });
}

export function validateDataset(rows: NormalizedUploadedRow[]) {
  const periods = rows
    .map((row) => parseFlexibleDate(row.date))
    .filter((d): d is Date => d != null)
    .sort((a, b) => a.getTime() - b.getTime());

  const products = [...new Set(rows.map((row) => row.productName).filter(Boolean))];
  const channels = [...new Set(rows.map((row) => row.channel).filter(Boolean))];

  const errors: string[] = [];
  if (rows.length === 0) {
    errors.push("El dataset está vacío.");
  }
  if (products.length === 0) {
    errors.push("No se detectó producto válido.");
  }
  if (channels.length === 0) {
    errors.push("No se detectó canal válido.");
  }

  console.info("Dataset cargado:", {
    records: rows.length,
    periods: periods.length,
    products,
    channels,
    firstPeriod: periods[0] ? formatDateIso(periods[0]) : null,
    lastPeriod: periods[periods.length - 1]
      ? formatDateIso(periods[periods.length - 1]!)
      : null,
  });

  return {
    valid: errors.length === 0,
    errors,
    totalRecords: rows.length,
    periods: periods.length,
    products,
    channels,
    firstPeriod: periods[0] ? formatDateIso(periods[0]) : null,
    lastPeriod: periods[periods.length - 1]
      ? formatDateIso(periods[periods.length - 1]!)
      : null,
  };
}

function getMonthIndex(label: string): number {
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return months.indexOf(normalizeHeader(label));
}

export function fillMissingPeriods<T extends { period: string; value: number }>(
  series: T[],
  type: "weekly" | "monthly",
): T[] {
  if (series.length === 0) return [];

  const sortKey = (item: T): number => {
    const period = item.period;
    if (type === "weekly") {
      const match = /^S(\d+)$/i.exec(period);
      if (match) return Number(match[1]);
      const isoMatch = /^(\d{4})-W(\d{2})$/.exec(period);
      if (isoMatch) return Number(isoMatch[1]) * 100 + Number(isoMatch[2]);
      return Number(period.replace(/\D/g, "")) || 0;
    }

    const monthIndex = getMonthIndex(period);
    return monthIndex >= 0 ? monthIndex : Number(period.replace(/\D/g, "")) || 0;
  };

  const normalized = [...series].sort((a, b) => sortKey(a) - sortKey(b));
  const existing = new Map<number, T>();
  normalized.forEach((item) => existing.set(sortKey(item), item));

  const start = sortKey(normalized[0]!);
  const end = sortKey(normalized[normalized.length - 1]!);
  const filled: T[] = [];

  for (let index = start; index <= end; index += 1) {
    const current = existing.get(index);
    if (current) {
      filled.push(current);
      continue;
    }

    let periodLabel = String(index);
    if (type === "weekly") {
      periodLabel = `S${index}`;
    } else {
      const month = index % 12;
      const labels = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
      periodLabel = labels[month] ?? `M${month + 1}`;
    }

    filled.push({
      ...series[0],
      period: periodLabel,
      value: 0,
    });
  }

  return filled;
}

export interface DemandAggregatePoint {
  period: string;
  sku: string;
  productName: string;
  channel: string;
  customer: string;
  deliveredQty: number;
  pendingQty: number;
  postponedQty: number;
}

export function aggregateDemand(rows: NormalizedUploadedRow[]): DemandAggregatePoint[] {
  const map = new Map<string, DemandAggregatePoint>();

  for (const row of rows) {
    const date = parseFlexibleDate(row.deliveryDate) ?? parseFlexibleDate(row.date);
    if (!date) continue;
    const week = date.toISOString().slice(0, 10);
    const key = `${week}|${row.sku}|${row.channel}|${row.customer}`;
    const current = map.get(key) ?? {
      period: week,
      sku: row.sku,
      productName: row.productName,
      channel: row.channel,
      customer: row.customer,
      deliveredQty: 0,
      pendingQty: 0,
      postponedQty: 0,
    };

    if (row.status === "entregado") current.deliveredQty += row.quantity;
    else if (row.status === "pendiente") current.pendingQty += row.quantity;
    else if (row.status === "postergado") current.postponedQty += row.quantity;

    map.set(key, current);
  }

  return [...map.values()].sort((a, b) => a.period.localeCompare(b.period));
}

export function generateFallbackSeries(
  history: number[],
  targetLength: number,
): number[] {
  const fallback: number[] = [];
  const n = history.length;
  const average = n > 0 ? history.reduce((acc, value) => acc + value, 0) / n : 1;
  const last = n > 0 ? history[history.length - 1]! : average || 1;

  const trend =
    n >= 2
      ? history[history.length - 1]! - history[history.length - 2]!
      : 0;
  const adjustment = trend / Math.max(n, 1);

  for (let i = 0; i < targetLength; i += 1) {
    if (i < n) {
      fallback.push(history[i]!);
      continue;
    }
    const next = Math.max(0, Math.round(last + adjustment * (i - n + 1)));
    fallback.push(next || Math.max(1, Math.round(average)));
  }

  return fallback;
}
