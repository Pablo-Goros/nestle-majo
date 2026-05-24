import type { Alert } from "@/lib/alerts";

export type FinancialScenario = "optimista" | "base" | "pesimista";

export interface FinancialSimulationParams {
  scenario: FinancialScenario;
  dollarVariationPct: number;
  inflationPct: number;
  priceChangePct: number;
  rawMaterialCostPct: number;
  demandElasticityPct: number;
}

export interface SkuFinancialInput {
  skuCode: string;
  skuName: string;
  channel: string;
  unitPrice: number;
  unitCost: number;
  marginTarget: number;
  forecastBase: number;
  forecastConsensus: number;
}

export type SkuFinancialStatus = "OK" | "Bajo target" | "Crítico";

export interface SkuFinancialRow {
  skuCode: string;
  sku: string;
  channel: string;
  forecastBase: number;
  forecastConsensus: number;
  unitPrice: number;
  unitCost: number;
  baseUnitCost: number;
  marginPercent: number;
  marginTarget: number;
  revenue: number;
  baselineRevenue: number;
  cost: number;
  grossMargin: number;
  variationVsBaselinePct: number;
  financialImpact: number;
  status: SkuFinancialStatus;
}

export interface FinancialKpis {
  projectedRevenue: number;
  projectedCost: number;
  grossMargin: number;
  grossMarginPercent: number;
  variationVsBaselinePct: number;
  financialImpact: number;
  lowMarginSkuCount: number;
}

export interface FinancialDashboardData {
  kpis: FinancialKpis;
  rows: SkuFinancialRow[];
  marginChart: { sku: string; margen: number; target: number }[];
  dollarSeries: { mes: string; valor: number }[];
  rawMaterialSeries: { mes: string; cafe: number; cacao: number; leche: number }[];
  alerts: Alert[];
}
