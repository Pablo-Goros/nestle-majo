import type { AlertStatus, AlertType } from "./types";

export const ALERT_TYPE_LABELS: Record<AlertType, string> = {
  consensus_deviation: "Desvío consenso vs baseline > 20%",
  dpa_lag3_low: "DPA Lag-3 bajo umbral",
  bias_out_of_range: "Bias fuera de rango",
  tracking_signal: "Tracking signal fuera de rango",
  stockout_risk: "Stockout proyectado",
  margin_below_target: "Margen bajo target",
  critical_sku_no_insights: "SKU crítico sin insight cargado",
  unit_cost_spike: "Costo unitario +15%",
  revenue_below_baseline: "Revenue bajo baseline",
  pessimistic_negative_margin: "Margen negativo (pesimista)",
  cleaning_unclassified_outliers: "Outliers sin clasificar",
  cleaning_high_outlier_ratio: "Outliers >10% de la serie",
  cleaning_coyuntural_baseline: "Coyuntural afecta baseline",
  cleaning_unexplained_drop: "Caída abrupta sin explicar",
};

export const ALERT_STATUS_LABELS: Record<AlertStatus, string> = {
  open: "Activa",
  acknowledged: "Reconocida",
  resolved: "Resuelta",
};
