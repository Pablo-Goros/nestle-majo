export type {
  EventLabel,
  EventKind,
  OutlierTreatment,
  DemandPoint,
  CleaningRow,
  CleaningKpis,
  CleaningSummary,
  SkuCleaningStore,
  CleaningPersistedState,
} from "./types";

export { EVENT_OPTIONS } from "./types";

export { mean, stdDev, zScore, median, movingAverage } from "./stats";
export { applyTreatmentValue } from "./treatment";
export {
  detectOutliers,
  recomputeRowCleanDemand,
  updateRowMeta,
} from "./detect";
export { buildDemandPointsForSku } from "./series";
export { buildCleaningSummary, rowsToWeeklyForecast, rowsToMonthlyHistory } from "./build";
export {
  getCleaningState,
  getSkuCleaning,
  hasCleanedDemand,
  saveSkuCleaning,
  clearSkuCleaning,
  CLEANING_CHANGED_EVENT,
} from "./store";
export { evaluateCleaningAlerts, resetCleaningAlertCounter } from "./alerts";
