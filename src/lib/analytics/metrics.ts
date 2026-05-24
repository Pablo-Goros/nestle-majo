import type { ActualForecastPair, ForecastAccuracyResult, FVAResult, LaggedPair } from "./types";

function validPairs(pairs: ActualForecastPair[]): ActualForecastPair[] {
  return pairs.filter(
    (p) =>
      Number.isFinite(p.actual) &&
      Number.isFinite(p.forecast) &&
      p.actual !== 0,
  );
}

function errors(pairs: ActualForecastPair[]): number[] {
  return pairs.map((p) => p.actual - p.forecast);
}

/**
 * Mean Absolute Percentage Error (%).
 * Ignora pares con actual = 0.
 */
export function calculateMAPE(pairs: ActualForecastPair[]): number {
  const valid = validPairs(pairs);
  if (valid.length === 0) return 0;
  const sum = valid.reduce(
    (acc, p) => acc + Math.abs((p.actual - p.forecast) / p.actual),
    0,
  );
  return (sum / valid.length) * 100;
}

/** Mean Absolute Deviation */
export function calculateMAD(pairs: ActualForecastPair[]): number {
  const valid = pairs.filter(
    (p) => Number.isFinite(p.actual) && Number.isFinite(p.forecast),
  );
  if (valid.length === 0) return 0;
  const sum = valid.reduce(
    (acc, p) => acc + Math.abs(p.actual - p.forecast),
    0,
  );
  return sum / valid.length;
}

/** Root Mean Squared Error */
export function calculateRMSE(pairs: ActualForecastPair[]): number {
  const valid = pairs.filter(
    (p) => Number.isFinite(p.actual) && Number.isFinite(p.forecast),
  );
  if (valid.length === 0) return 0;
  const mse =
    valid.reduce((acc, p) => acc + (p.actual - p.forecast) ** 2, 0) /
    valid.length;
  return Math.sqrt(mse);
}

/**
 * Bias porcentual medio: promedio de (forecast - actual) / actual × 100.
 * Positivo = sobreestimación; negativo = subestimación.
 */
export function calculateBias(pairs: ActualForecastPair[]): number {
  const valid = validPairs(pairs);
  if (valid.length === 0) return 0;
  const sum = valid.reduce(
    (acc, p) => acc + ((p.forecast - p.actual) / p.actual) * 100,
    0,
  );
  return sum / valid.length;
}

/**
 * Demand Planning Accuracy a Lag-3 (%).
 * Por cada par lag-3: accuracy_i = max(0, 1 - |F - A| / A) × 100.
 */
export function calculateDPALag3(pairs: LaggedPair[]): number {
  const valid = validPairs(pairs);
  if (valid.length === 0) return 0;
  const accuracies = valid.map((p) => {
    const ape = Math.abs(p.actual - p.forecast) / p.actual;
    return Math.max(0, 1 - ape) * 100;
  });
  return accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
}

/**
 * Precisión global del forecast: 100 - MAPE (acotado 0–100).
 */
export function calculateForecastAccuracy(
  pairs: ActualForecastPair[],
): ForecastAccuracyResult {
  const mape = calculateMAPE(pairs);
  const mad = calculateMAD(pairs);
  const rmse = calculateRMSE(pairs);
  const bias = calculateBias(pairs);
  return {
    accuracy: Math.max(0, Math.min(100, 100 - mape)),
    mape,
    mad,
    rmse,
    bias,
  };
}

/**
 * Forecast Value Added: mejora del modelo vs naive (promedio móvil de orden 1).
 * FVA% = ((MAPE_naive - MAPE_model) / MAPE_naive) × 100
 */
export function calculateFVA(
  actuals: number[],
  modelForecasts: number[],
  naiveForecasts?: number[],
): FVAResult {
  const naive =
    naiveForecasts ??
    actuals.map((_, i) => (i > 0 ? actuals[i - 1]! : actuals[0]!));

  const n = Math.min(actuals.length, modelForecasts.length, naive.length);
  const pairs: ActualForecastPair[] = Array.from({ length: n }, (_, i) => ({
    actual: actuals[i]!,
    forecast: modelForecasts[i]!,
  }));
  const naivePairs: ActualForecastPair[] = Array.from({ length: n }, (_, i) => ({
    actual: actuals[i]!,
    forecast: naive[i]!,
  }));

  const modelMape = calculateMAPE(pairs);
  const naiveMape = calculateMAPE(naivePairs);

  if (naiveMape === 0) {
    return { fvaPercent: 0, modelMape, naiveMape };
  }

  return {
    fvaPercent: ((naiveMape - modelMape) / naiveMape) * 100,
    modelMape,
    naiveMape,
  };
}

/**
 * Tracking Signal = Σ(actual - forecast) / MAD.
 * Valores fuera de [-4, 4] indican sesgo sistemático.
 */
export function calculateTrackingSignal(pairs: ActualForecastPair[]): number {
  const mad = calculateMAD(pairs);
  if (mad === 0) return 0;
  const cumulativeError = errors(pairs).reduce((a, b) => a + b, 0);
  return cumulativeError / mad;
}
