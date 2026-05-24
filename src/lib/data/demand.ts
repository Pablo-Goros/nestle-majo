import { CHANNELS } from "@/lib/mock-data";
import type {
  ChannelForecastPoint,
  MonthlyDemandPoint,
  WeeklyDemandPoint,
} from "@/lib/mockData";
import {
  getIsoWeekKey,
  monthLabel,
  parseFlexibleDate,
} from "./normalize";
import { fillMissingPeriods } from "@/lib/dataNormalization";
import type {
  GeneratedDemandStore,
  OrderRecord,
  SkuDemandBundle,
  WeeklyDemandAggregate,
} from "./types";

export function buildWeeklyAggregates(
  orders: OrderRecord[],
): WeeklyDemandAggregate[] {
  const map = new Map<string, WeeklyDemandAggregate>();

  for (const o of orders) {
    const d = parseFlexibleDate(o.fecha_entrega) ?? parseFlexibleDate(o.fecha_emision);
    if (!d) continue;
    const week = getIsoWeekKey(d);
    const key = `${week}|${o.producto_codigo}|${o.tipo_canal}|${o.nombre_canal}`;
    const prev = map.get(key) ?? {
      week,
      skuCode: o.producto_codigo,
      skuName: o.producto_nombre,
      channel: o.tipo_canal,
      client: o.nombre_canal,
      deliveredQty: 0,
      pendingQty: 0,
      postponedQty: 0,
    };

    if (o.estado === "entregado") prev.deliveredQty += o.cantidad;
    else if (o.estado === "pendiente") prev.pendingQty += o.cantidad;
    else if (o.estado === "postergado") prev.postponedQty += o.cantidad;

    map.set(key, prev);
  }

  return [...map.values()].sort((a, b) => a.week.localeCompare(b.week));
}

function fillMissingMonthlyHistory(
  byMonth: Map<number, { label: string; actual: number }>,
): MonthlyDemandPoint[] {
  if (byMonth.size === 0) return [];
  const keys = [...byMonth.keys()].sort((a, b) => a - b);
  const start = keys[0]!;
  const end = keys[keys.length - 1]!;
  const result: MonthlyDemandPoint[] = [];

  for (let cursor = start; cursor <= end; cursor += 1) {
    const value = byMonth.get(cursor);
    const label = value?.label ?? monthLabel(new Date(Math.floor(cursor / 12), cursor % 12, 1));
    const actual = value?.actual ?? 0;
    result.push({
      month: label,
      actual,
      baseline: actual,
      consensus: actual,
    });
  }

  return result;
}

function buildMonthlyHistory(
  orders: OrderRecord[],
  skuCode: string,
): MonthlyDemandPoint[] {
  const byMonth = new Map<number, { label: string; actual: number }>();

  for (const o of orders) {
    if (o.producto_codigo !== skuCode || o.estado !== "entregado") continue;
    const d =
      parseFlexibleDate(o.fecha_entrega) ?? parseFlexibleDate(o.fecha_emision);
    if (!d) continue;
    const sort = d.getFullYear() * 12 + d.getMonth();
    const label = monthLabel(d);
    const prev = byMonth.get(sort) ?? { label, actual: 0 };
    prev.actual += o.cantidad;
    byMonth.set(sort, prev);
  }

  return fillMissingMonthlyHistory(byMonth);
}

function buildWeeklyForecast(
  aggregates: WeeklyDemandAggregate[],
  skuCode: string,
): WeeklyDemandPoint[] {
  const weeks = aggregates
    .filter((a) => a.skuCode === skuCode)
    .sort((a, b) => a.week.localeCompare(b.week));

  const rawWeekly = weeks.map((w) => ({
    period: w.week.includes("-W") ? `S${w.week.split("-W")[1]}` : w.week,
    value: w.deliveredQty,
  }));

  const filled = fillMissingPeriods(rawWeekly, "weekly");
  const complete = [...filled];

  while (complete.length < 13) {
    const last = complete[complete.length - 1]!;
    const nextIndex = complete.length + 1;
    const nextValue = Math.round(
      last.value + (complete.length > 1 ? last.value - complete[complete.length - 2]!.value : 0),
    );
    complete.push({
      period: `S${nextIndex}`,
      value: Math.max(0, nextValue),
    });
  }

  return complete.map((w, index) => ({
    week: `S${index + 1}`,
    actual: w.value,
    baseline: w.value,
    consensus: w.value,
  }));
}

function buildChannelForecasts(
  orders: OrderRecord[],
  skuCode: string,
): ChannelForecastPoint[] {
  const deliveredTotals = new Map<string, number>();
  const totalOrders = new Map<string, number>();

  for (const o of orders) {
    if (o.producto_codigo !== skuCode) continue;
    if (o.estado === "entregado") {
      deliveredTotals.set(o.tipo_canal, (deliveredTotals.get(o.tipo_canal) ?? 0) + o.cantidad);
    }
    totalOrders.set(o.tipo_canal, (totalOrders.get(o.tipo_canal) ?? 0) + o.cantidad);
  }

  const overall = Array.from(totalOrders.values()).reduce((sum, value) => sum + value, 0);

  return CHANNELS.map((ch) => {
    const delivered = deliveredTotals.get(ch.name) ?? 0;
    const baseline = delivered > 0 ? delivered : Math.round(overall / Math.max(1, CHANNELS.length));
    return {
      channel: ch.name,
      channelKey: ch.key,
      baseline,
      consensus: baseline,
    };
  });
}

export function generateDemandBase(
  orders: OrderRecord[],
  source: "upload" | "demo",
): GeneratedDemandStore {
  const aggregates = buildWeeklyAggregates(orders);
  const skuCodes = [...new Set(orders.map((o) => o.producto_codigo))];
  const bySku: Record<string, SkuDemandBundle> = {};

  for (const skuCode of skuCodes) {
    const skuOrders = orders.filter((o) => o.producto_codigo === skuCode);
    const skuAggregates = aggregates.filter((a) => a.skuCode === skuCode);
    const signals = skuAggregates.reduce(
      (acc, a) => ({
        deliveredQty: acc.deliveredQty + a.deliveredQty,
        pendingQty: acc.pendingQty + a.pendingQty,
        postponedQty: acc.postponedQty + a.postponedQty,
      }),
      { deliveredQty: 0, pendingQty: 0, postponedQty: 0 },
    );

    const productName = skuOrders[0]?.producto_nombre ?? skuCode;
    const channels = [...new Set(skuOrders.map((o) => o.tipo_canal))];
    const periods = skuAggregates.length;

    console.info("Generando demanda base:", {
      skuCode,
      productName,
      channels,
      periods,
      source,
    });

    bySku[skuCode] = {
      monthlyHistory: buildMonthlyHistory(orders, skuCode),
      weeklyForecast: buildWeeklyForecast(aggregates, skuCode),
      channelForecasts: buildChannelForecasts(orders, skuCode),
      signals,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    source,
    aggregates,
    bySku,
  };
}
