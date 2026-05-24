import { loadJson, saveJson } from "@/lib/storage";
import type { FinancialSimulationParams } from "./types";

const FINANCIAL_SIM_KEY = "nestle_financial_sim";

export const FINANCIAL_SIM_CHANGED_EVENT = "nestle-financial-sim-changed";

export const DEFAULT_FINANCIAL_PARAMS: FinancialSimulationParams = {
  scenario: "base",
  dollarVariationPct: 0,
  inflationPct: 6,
  priceChangePct: 8,
  rawMaterialCostPct: 12,
  demandElasticityPct: -5,
};

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(FINANCIAL_SIM_CHANGED_EVENT));
  }
}

export function getFinancialSimulationParams(): FinancialSimulationParams {
  const stored = loadJson<Partial<FinancialSimulationParams> | null>(
    FINANCIAL_SIM_KEY,
    null,
  );
  if (!stored) return { ...DEFAULT_FINANCIAL_PARAMS };
  return { ...DEFAULT_FINANCIAL_PARAMS, ...stored };
}

export function saveFinancialSimulationParams(
  params: FinancialSimulationParams,
): void {
  saveJson(FINANCIAL_SIM_KEY, params);
  emitChange();
}
