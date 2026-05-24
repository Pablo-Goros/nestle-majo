import { computeInsightDelta } from "@/lib/insights/consensus";
import { getInsights } from "@/lib/insights/store";
import type { CollaborativeInsight } from "@/lib/insights/types";

function matchesChannel(insight: CollaborativeInsight, channel?: string): boolean {
  if (!channel) return true;
  return insight.channel === "Todos" || insight.channel === channel;
}

/** Insights aprobados desde localStorage (semilla mockData). */
export function getActiveInsights(
  skuCode?: string,
  channel?: string,
): CollaborativeInsight[] {
  return getInsights().filter(
    (i) =>
      i.estado_aprobacion === "aprobado" &&
      (!skuCode || i.skuCode === skuCode) &&
      matchesChannel(i, channel),
  );
}

export function getApprovedForProduct(
  insights: CollaborativeInsight[],
  skuCode: string,
  channel?: string,
): CollaborativeInsight[] {
  return insights.filter(
    (i) =>
      i.estado_aprobacion === "aprobado" &&
      i.skuCode === skuCode &&
      matchesChannel(i, channel),
  );
}

export function applyInsightAdjustments(
  base: number,
  insights: CollaborativeInsight[],
  skuCode: string,
  channel?: string,
): number {
  const approved = getApprovedForProduct(insights, skuCode, channel);
  let total = base;
  for (const ins of approved) {
    total += computeInsightDelta(ins, base);
  }
  return Math.round(total);
}

export function sumInsightAdjustment(
  base: number,
  insights: CollaborativeInsight[],
  skuCode: string,
): number {
  const approved = getApprovedForProduct(insights, skuCode);
  return approved.reduce((sum, ins) => sum + computeInsightDelta(ins, base), 0);
}

/** @deprecated usar applyInsightAdjustments con CollaborativeInsight */
export function parseInsightDelta(impact: string, base: number): number {
  const pct = impact.match(/([+-]?\d+(?:\.\d+)?)\s*%/);
  if (pct) return base * (parseFloat(pct[1]!) / 100);
  const units = impact.match(/([+-]?\d+)\s*u/i);
  if (units) return parseFloat(units[1]!);
  return 0;
}
