export type {
  FinancialScenario,
  FinancialSimulationParams,
  SkuFinancialInput,
  SkuFinancialRow,
  SkuFinancialStatus,
  FinancialKpis,
  FinancialDashboardData,
} from "./types";

export {
  calculateRevenue,
  calculateCost,
  calculateGrossMargin,
  calculateGrossMarginPercent,
  calculateFinancialImpact,
  calculateScenario,
  applySimulationToUnitPrice,
  applySimulationToUnitCost,
  applyElasticityToVolume,
  formatCurrency,
  formatPct,
} from "./calculations";

export {
  DEFAULT_FINANCIAL_PARAMS,
  getFinancialSimulationParams,
  saveFinancialSimulationParams,
  FINANCIAL_SIM_CHANGED_EVENT,
} from "./store";

export { buildSkuFinancialRow, buildFinancialDashboard } from "./build";
export { evaluateFinancialAlerts, resetFinancialAlertCounter } from "./alerts";
