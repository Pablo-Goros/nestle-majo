import { applyInsightAdjustments } from "@/lib/dashboard/insights";
import { getInsights, INSIGHTS_CHANGED_EVENT } from "@/lib/insights/store";
import { DEMO_PRODUCTS, getSkuBundle } from "@/lib/mockData";
import {
  applyElasticityToVolume,
  applySimulationToUnitCost,
  applySimulationToUnitPrice,
  calculateCost,
  calculateFinancialImpact,
  calculateGrossMargin,
  calculateGrossMarginPercent,
  calculateRevenue,
} from "./calculations";
import { evaluateFinancialAlerts } from "./alerts";
import type {
  FinancialDashboardData,
  FinancialKpis,
  FinancialSimulationParams,
  SkuFinancialInput,
  SkuFinancialRow,
  SkuFinancialStatus,
} from "./types";

export { INSIGHTS_CHANGED_EVENT };

function rowStatus(
  marginPercent: number,
  marginTarget: number,
): SkuFinancialStatus {
  if (marginPercent < 0) return "Crítico";
  if (marginPercent < marginTarget) return "Bajo target";
  return "OK";
}

export function buildSkuFinancialRow(
  input: SkuFinancialInput,
  params: FinancialSimulationParams,
): SkuFinancialRow {
  const unitPrice = applySimulationToUnitPrice(input.unitPrice, params);
  const unitCost = applySimulationToUnitCost(input.unitCost, params);

  const baselineVolume = applyElasticityToVolume(input.forecastBase, params);
  const consensusVolume = applyElasticityToVolume(
    input.forecastConsensus,
    params,
  );

  const baselineRevenue = calculateRevenue(baselineVolume, unitPrice);
  const revenue = calculateRevenue(consensusVolume, unitPrice);
  const cost = calculateCost(consensusVolume, unitCost);
  const grossMargin = calculateGrossMargin(revenue, cost);
  const marginPercent = calculateGrossMarginPercent(revenue, grossMargin);
  const financialImpact = calculateFinancialImpact(revenue, baselineRevenue);
  const variationVsBaselinePct =
    baselineRevenue === 0
      ? 0
      : ((revenue - baselineRevenue) / baselineRevenue) * 100;

  return {
    skuCode: input.skuCode,
    sku: input.skuName,
    channel: input.channel,
    forecastBase: baselineVolume,
    forecastConsensus: consensusVolume,
    unitPrice,
    unitCost,
    baseUnitCost: input.unitCost,
    marginPercent,
    marginTarget: input.marginTarget,
    revenue,
    baselineRevenue,
    cost,
    grossMargin,
    variationVsBaselinePct,
    financialImpact,
    status: rowStatus(marginPercent, input.marginTarget),
  };
}

function buildChartSeries(rows: SkuFinancialRow[]) {
  const bySku = new Map<
    string,
    { margen: number; target: number; count: number }
  >();
  for (const r of rows) {
    const prev = bySku.get(r.skuCode) ?? { margen: 0, target: r.marginTarget, count: 0 };
    bySku.set(r.skuCode, {
      margen: prev.margen + r.marginPercent,
      target: r.marginTarget,
      count: prev.count + 1,
    });
  }
  return [...bySku.entries()].map(([code, v]) => {
    const product = DEMO_PRODUCTS.find((p) => p.code === code);
    return {
      sku: product?.name.split(" ")[0] ?? code,
      margen: Math.round((v.margen / v.count) * 10) / 10,
      target: v.target,
    };
  });
}

function buildTrendSeries(params: FinancialSimulationParams) {
  const months = [
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul",
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
  ];
  const dollarSeries = months.map((mes, i) => ({
    mes,
    valor: Math.round(
      950 +
        i * 42 +
        Math.sin(i) * 30 +
        params.dollarVariationPct * 8,
    ),
  }));
  const rawMaterialSeries = months.map((mes, i) => ({
    mes,
    cafe: Math.round(100 + i * 4 + params.rawMaterialCostPct * 0.3),
    cacao: Math.round(100 + i * 5.5 + params.rawMaterialCostPct * 0.4),
    leche: Math.round(100 + i * 3 + params.rawMaterialCostPct * 0.25),
  }));
  return { dollarSeries, rawMaterialSeries };
}

function aggregateKpis(rows: SkuFinancialRow[]): FinancialKpis {
  const projectedRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const baselineRevenue = rows.reduce((s, r) => s + r.baselineRevenue, 0);
  const projectedCost = rows.reduce((s, r) => s + r.cost, 0);
  const grossMargin = rows.reduce((s, r) => s + r.grossMargin, 0);
  const grossMarginPercent = calculateGrossMarginPercent(
    projectedRevenue,
    grossMargin,
  );
  const variationVsBaselinePct =
    baselineRevenue === 0
      ? 0
      : ((projectedRevenue - baselineRevenue) / baselineRevenue) * 100;
  const financialImpact = calculateFinancialImpact(
    projectedRevenue,
    baselineRevenue,
  );
  const lowMarginSkuCount = new Set(
    rows.filter((r) => r.status !== "OK").map((r) => r.skuCode),
  ).size;

  return {
    projectedRevenue,
    projectedCost,
    grossMargin,
    grossMarginPercent,
    variationVsBaselinePct,
    financialImpact,
    lowMarginSkuCount,
  };
}

export function buildFinancialDashboard(
  params: FinancialSimulationParams,
): FinancialDashboardData {
  const insights = getInsights();
  const rows: SkuFinancialRow[] = [];

  for (const product of DEMO_PRODUCTS) {
    const bundle = getSkuBundle(product.code);
    if (!bundle) continue;

    for (const cf of bundle.channelForecasts) {
      const consensus = applyInsightAdjustments(
        cf.baseline,
        insights,
        product.code,
        cf.channel,
      );
      const input: SkuFinancialInput = {
        skuCode: product.code,
        skuName: product.name,
        channel: cf.channel,
        unitPrice: bundle.financials.unitPrice,
        unitCost: bundle.financials.costPerUnit,
        marginTarget: bundle.financials.marginTarget,
        forecastBase: cf.baseline,
        forecastConsensus: consensus,
      };
      rows.push(buildSkuFinancialRow(input, params));
    }
  }

  const kpis = aggregateKpis(rows);
  const { dollarSeries, rawMaterialSeries } = buildTrendSeries(params);

  return {
    kpis,
    rows,
    marginChart: buildChartSeries(rows),
    dollarSeries,
    rawMaterialSeries,
    alerts: evaluateFinancialAlerts(rows, params),
  };
}
