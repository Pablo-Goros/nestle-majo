/** Par actual vs pronóstico para métricas de precisión */
export interface ActualForecastPair {
  actual: number;
  forecast: number;
}

/** Punto con lag explícito (p. ej. DPA Lag-3) */
export interface LaggedPair extends ActualForecastPair {
  period?: string;
}

export interface ForecastAccuracyResult {
  /** Porcentaje 0–100 (mayor = mejor) */
  accuracy: number;
  mape: number;
  mad: number;
  rmse: number;
  bias: number;
}

export interface FVAResult {
  /** Mejora porcentual vs pronóstico naive */
  fvaPercent: number;
  modelMape: number;
  naiveMape: number;
}
