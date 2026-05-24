import { applyInsightAdjustments } from "@/lib/dashboard/insights";
import { buildDashboardData } from "@/lib/dashboard/compute";
import { evaluateAlertsForSku } from "@/lib/alerts";
import type { Alert } from "@/lib/alerts";
import { computeConsensusBreakdown, getApprovedInsights } from "@/lib/insights/consensus";
import {
  getConsensusState,
  getInsights,
  getPublishedVersionsForSku,
} from "@/lib/insights/store";
import type {
  ConsensusBreakdown,
  PublishedForecastVersion,
} from "@/lib/insights/types";
import {
  buildFinancialDashboard,
  getFinancialSimulationParams,
} from "@/lib/financial";
import type { FinancialKpis, SkuFinancialRow } from "@/lib/financial/types";
import { getSkuBundle } from "@/lib/mockData";
import type { DashboardKpis } from "@/lib/dashboard/compute";

export interface WeeklyChannelForecastRow {
  semana: string;
  sku: string;
  skuCode: string;
  canal: string;
  baseline: number;
  forecastFinal: number;
}

export interface ForecastExportContext {
  productCode: string;
  productName: string;
  version: string;
  modelName: string;
  breakdown: ConsensusBreakdown;
  weeklyRows: WeeklyChannelForecastRow[];
  kpis: DashboardKpis | null;
  alerts: Alert[];
  approvedInsights: ReturnType<typeof getApprovedInsights>;
  financialKpis: FinancialKpis;
  financialRows: SkuFinancialRow[];
  publishState: ReturnType<typeof getConsensusState>;
  versions: PublishedForecastVersion[];
}

function buildWeeklyChannelRows(
  productCode: string,
  productName: string,
): WeeklyChannelForecastRow[] {
  const bundle = getSkuBundle(productCode);
  if (!bundle) return [];

  const insights = getInsights();
  const totalChBaseline =
    bundle.channelForecasts.reduce((s, c) => s + c.baseline, 0) || 1;
  const rows: WeeklyChannelForecastRow[] = [];

  for (const w of bundle.weeklyForecast) {
    for (const ch of bundle.channelForecasts) {
      const share = ch.baseline / totalChBaseline;
      const weekBase = Math.round(w.baseline * share);
      const weekFinal = applyInsightAdjustments(
        weekBase,
        insights,
        productCode,
        ch.channel,
      );
      rows.push({
        semana: w.week,
        sku: productName,
        skuCode: productCode,
        canal: ch.channel,
        baseline: weekBase,
        forecastFinal: weekFinal,
      });
    }
  }

  return rows;
}

export function buildForecastExportContext(
  productCode: string,
  productName: string,
  modelName?: string,
): ForecastExportContext | null {
  const bundle = getSkuBundle(productCode);
  if (!bundle) return null;

  const insights = getInsights();
  const baseline = bundle.weeklyForecast.reduce((acc, w) => acc + w.baseline, 0);
  const breakdown = computeConsensusBreakdown(
    baseline,
    insights,
    productCode,
    productName,
  );
  const dashboard = buildDashboardData(productCode);
  const { alerts } = evaluateAlertsForSku(productCode);
  const financial = buildFinancialDashboard(getFinancialSimulationParams());
  const skuFinancialRows = financial.rows.filter((r) => r.skuCode === productCode);

  const publishState = getConsensusState(productCode);

  return {
    productCode,
    productName,
    version: publishState?.version ?? "v3.2",
    modelName: modelName ?? dashboard?.kpis.modelName ?? "Baseline estadístico",
    breakdown,
    weeklyRows: buildWeeklyChannelRows(productCode, productName),
    kpis: dashboard?.kpis ?? null,
    alerts,
    approvedInsights: getApprovedInsights(insights, productCode),
    financialKpis: financial.kpis,
    financialRows: skuFinancialRows,
    publishState,
    versions: getPublishedVersionsForSku(productCode),
  };
}
