import { getGeneratedDemand } from "@/lib/data";
import { getSkuBundle } from "@/lib/mockData";
import type { DemandPoint } from "./types";

export function buildDemandPointsForSku(skuCode: string): DemandPoint[] {
  const bundle = getSkuBundle(skuCode);
  if (!bundle) return [];

  const loaded = getGeneratedDemand();
  const aggregates = loaded?.aggregates.filter((a) => a.skuCode === skuCode);

  if (aggregates && aggregates.length > 0) {
    return aggregates.map((a) => ({
      id: `${a.week}|${a.skuCode}|${a.channel}`,
      week: a.week,
      skuCode: a.skuCode,
      skuName: a.skuName,
      channel: a.channel,
      originalDemand:
        a.deliveredQty > 0
          ? a.deliveredQty
          : a.pendingQty + a.postponedQty,
    }));
  }

  const weeks = bundle.weeklyForecast;
  const channels = bundle.channelForecasts;
  const total = channels.reduce((s, c) => s + c.baseline, 0) || 1;

  return weeks.flatMap((w) => {
    const base = w.actual ?? w.baseline;
    return channels.map((cf) => ({
      id: `${w.week}|${skuCode}|${cf.channel}`,
      week: w.week,
      skuCode,
      skuName: bundle.product.name,
      channel: cf.channel,
      originalDemand: Math.max(
        0,
        Math.round(base * (cf.baseline / total)),
      ),
    }));
  });
}
