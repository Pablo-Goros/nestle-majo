import {
  calculateBias,
  calculateDPALag3,
  calculateFVA,
  calculateForecastAccuracy,
  calculateMAD,
  calculateRMSE,
  calculateTrackingSignal,
  type ActualForecastPair,
} from "@/lib/analytics";
import { generateFallbackSeries } from "@/lib/dataNormalization";
import { evaluateAlerts, filterAlerts } from "@/lib/alerts";
import type { Alert } from "@/lib/alerts";
import { selectBestModel } from "@/lib/forecasting";
import {
  generateLag3Pairs,
  getHistoryActuals,
  getSkuBundle,
  type SkuPlanningBundle,
} from "@/lib/mockData";
import { getInsights } from "@/lib/insights/store";
import { applyInsightAdjustments, sumInsightAdjustment } from "./insights";

export interface DashboardChartPoint {
  mes: string;
  real: number | null;
  baseline: number;
  consenso: number;
}

export interface DashboardWeeklyRow {
  semana: string;
  real: number | null;
  baseDem: number;
  ajuste: number;
  consenso: number;
  vsBase: number;
  estado: string;
}

export interface DashboardChannelRow {
  canal: string;
  forecast: number;
  consenso: number;
}

export interface DashboardKpis {
  demandBaseM1: number;
  demandConsensusM1: number;
  consensusVsBasePct: number;
  mape: number;
  mad: number;
  rmse: number;
  bias: number;
  dpaLag3: number;
  forecastAccuracy: number;
  fva: number;
  trackingSignal: number;
  inStockPct: number;
  stockoutRiskCount: number;
  modelName: string;
}

export interface DashboardData {
  bundle: SkuPlanningBundle;
  kpis: DashboardKpis;
  chartSeries: DashboardChartPoint[];
  seasonality: DashboardChartPoint[];
  weekly: DashboardWeeklyRow[];
  channels: DashboardChannelRow[];
  productAlerts: Alert[];
  activeAlertCount: number;
}

function weeklyStatus(vsBase: number): string {
  if (Math.abs(vsBase) > 7) return "Atención";
  if (Math.abs(vsBase) > 3) return "Revisar";
  return "OK";
}

function buildInSamplePairs(
  bundle: SkuPlanningBundle,
  fitted: number[],
): ActualForecastPair[] {
  return bundle.monthlyHistory
    .map((m, i) => ({
      actual: m.actual,
      forecast: fitted[i] ?? m.baseline,
    }))
    .filter((p): p is ActualForecastPair => p.actual != null);
}

function buildLag3Pairs(
  bundle: SkuPlanningBundle,
  fitted: number[],
) {
  return bundle.monthlyHistory
    .map((m, i) => {
      if (m.actual == null || i < 3) return null;
      return {
        actual: m.actual,
        forecast: fitted[i - 3] ?? bundle.monthlyHistory[i - 3]!.baseline,
        period: m.month,
      };
    })
    .filter((p): p is { actual: number; forecast: number; period: string } => p != null);
}

function computeInStockPct(bundle: SkuPlanningBundle): number {
  if (bundle.inventory.length === 0) return 0;
  const scores = bundle.inventory.map((inv) =>
    Math.min(100, (inv.coverageDays / 12) * 100),
  );
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

export function buildDashboardData(productCode: string): DashboardData | null {
  const bundle = getSkuBundle(productCode);
  if (!bundle) return null;

  const actualHistory = getHistoryActuals(productCode);
  const baselineHistory = actualHistory.length >= 3
    ? actualHistory
    : bundle.monthlyHistory
        .map((m) => (m.actual != null ? m.actual : m.baseline))
        .filter(Number.isFinite);
  const history = baselineHistory.length >= 3
    ? baselineHistory
    : generateFallbackSeries(baselineHistory, 3);

  const best = selectBestModel(history, { horizon: 3 });

  console.info("Dashboard build:", {
    productCode,
    historyLength: history.length,
    bestModel: best.modelName,
  });
  const insights = getInsights();
  const pairs = buildInSamplePairs(bundle, best.fittedValues);
  const actuals = pairs.map((p) => p.actual);
  const fitted = pairs.map((p) => p.forecast);

  const accuracy = calculateForecastAccuracy(pairs);
  const fvaResult = calculateFVA(actuals, fitted);
  const lag3Pairs = buildLag3Pairs(bundle, best.fittedValues);
  const dpaLag3 =
    lag3Pairs.length > 0
      ? calculateDPALag3(lag3Pairs)
      : calculateDPALag3(generateLag3Pairs(bundle.monthlyHistory));

  const demandBaseM1 = Math.round(
    best.forecast[0] ?? best.fittedValues[best.fittedValues.length - 1]!,
  );
  const demandConsensusM1 = applyInsightAdjustments(
    demandBaseM1,
    insights,
    productCode,
  );
  const consensusVsBasePct =
    demandBaseM1 === 0
      ? 0
      : ((demandConsensusM1 - demandBaseM1) / demandBaseM1) * 100;

  const chartSeries: DashboardChartPoint[] = bundle.monthlyHistory.map(
    (m, i) => {
      const baseline = Math.round(best.fittedValues[i] ?? m.baseline);
      const consenso = applyInsightAdjustments(
        baseline,
        insights,
        productCode,
      );
      return {
        mes: m.month,
        real: m.actual,
        baseline,
        consenso,
      };
    },
  );

  const weekly: DashboardWeeklyRow[] = bundle.weeklyForecast.map((w) => {
    const baseDem = w.baseline;
    const ajuste = Math.round(
      sumInsightAdjustment(baseDem, insights, productCode) / 13,
    );
    const consenso = baseDem + ajuste;
    const vsBase = baseDem === 0 ? 0 : ((consenso - baseDem) / baseDem) * 100;
    return {
      semana: w.week,
      real: w.actual,
      baseDem,
      ajuste,
      consenso,
      vsBase,
      estado: weeklyStatus(vsBase),
    };
  });

  const channels: DashboardChannelRow[] = bundle.channelForecasts.map((cf) => ({
    canal: cf.channel,
    forecast: cf.baseline,
    consenso: applyInsightAdjustments(
      cf.baseline,
      insights,
      productCode,
      cf.channel,
    ),
  }));

  const { alerts: allAlerts } = evaluateAlerts();
  const productAlerts = filterAlerts(allAlerts, { skuCode: productCode });
  const stockoutRiskCount = productAlerts.filter(
    (a) => a.type === "stockout_risk",
  ).length;

  const kpis: DashboardKpis = {
    demandBaseM1,
    demandConsensusM1,
    consensusVsBasePct,
    mape: accuracy.mape,
    mad: calculateMAD(pairs),
    rmse: calculateRMSE(pairs),
    bias: calculateBias(pairs),
    dpaLag3,
    forecastAccuracy: accuracy.accuracy,
    fva: fvaResult.fvaPercent,
    trackingSignal: calculateTrackingSignal(pairs),
    inStockPct: computeInStockPct(bundle),
    stockoutRiskCount: stockoutRiskCount || productAlerts.filter((a) => a.severity === "alta").length,
    modelName: best.modelName,
  };

  return {
    bundle,
    kpis,
    chartSeries,
    seasonality: chartSeries,
    weekly,
    channels,
    productAlerts,
    activeAlertCount: productAlerts.length,
  };
}

export function formatUnits(n: number): string {
  return `${n.toLocaleString("es-AR")} u`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
