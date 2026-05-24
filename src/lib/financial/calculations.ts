import type { FinancialScenario, FinancialSimulationParams } from "./types";

const SCENARIO_VOLUME_MULT: Record<FinancialScenario, number> = {
  optimista: 1.12,
  base: 1,
  pesimista: 0.88,
};

export function calculateRevenue(volume: number, unitPrice: number): number {
  return volume * unitPrice;
}

export function calculateCost(volume: number, unitCost: number): number {
  return volume * unitCost;
}

export function calculateGrossMargin(revenue: number, cost: number): number {
  return revenue - cost;
}

export function calculateGrossMarginPercent(
  revenue: number,
  grossMargin: number,
): number {
  if (revenue === 0) return 0;
  return (grossMargin / revenue) * 100;
}

export function calculateFinancialImpact(
  consensusRevenue: number,
  baselineRevenue: number,
): number {
  return consensusRevenue - baselineRevenue;
}

export function calculateScenario(
  baseValue: number,
  scenario: FinancialScenario,
): number {
  return baseValue * SCENARIO_VOLUME_MULT[scenario];
}

export function applySimulationToUnitPrice(
  basePrice: number,
  params: FinancialSimulationParams,
): number {
  const inflationPass = 1 + (params.inflationPct / 100) * 0.25;
  const priceAdj = 1 + params.priceChangePct / 100;
  return basePrice * priceAdj * inflationPass;
}

export function applySimulationToUnitCost(
  baseCost: number,
  params: FinancialSimulationParams,
): number {
  const fx = 1 + (params.dollarVariationPct / 100) * 0.35;
  const inflation = 1 + (params.inflationPct / 100) * 0.45;
  const rawMat = 1 + params.rawMaterialCostPct / 100;
  return baseCost * fx * inflation * rawMat;
}

/** Volumen ajustado por escenario y elasticidad frente al cambio de precio */
export function applyElasticityToVolume(
  volume: number,
  params: FinancialSimulationParams,
): number {
  const scenarioVol = calculateScenario(volume, params.scenario);
  const priceDelta = params.priceChangePct / 100;
  const elasticity = params.demandElasticityPct / 100;
  const demandFactor = 1 + priceDelta * elasticity;
  return Math.round(scenarioVol * demandFactor);
}

export function formatCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString("es-AR", { maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number, digits = 1): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}
