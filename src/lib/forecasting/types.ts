export interface ForecastModelResult {
  modelName: string;
  /** Valores proyectados hacia adelante (horizonte) */
  forecast: number[];
  /** Ajuste in-sample sobre el histórico (misma longitud que history) */
  fittedValues: number[];
  mape: number;
  mad: number;
  rmse: number;
  bias: number;
  trackingSignal: number;
  recommendation: string;
}

export interface ForecastModelOptions {
  /** Períodos a proyectar (default 3) */
  horizon?: number;
  /** Ventana para promedio móvil (default 3) */
  window?: number;
  /** Alpha para suavización exponencial (default 0.3) */
  alpha?: number;
  /** Longitud de estacionalidad (default 12) */
  seasonLength?: number;
}
