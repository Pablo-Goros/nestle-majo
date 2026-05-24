import type { ForecastModelOptions, ForecastModelResult } from "./types";
import {
  finalizeModelResult,
  linearRegression,
  resolveOptions,
  roundAll,
} from "./helpers";

export function movingAverage(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const { horizon, window } = resolveOptions(options);
  const fitted: number[] = history.map((_, i) => {
    if (i < window) return history[i]!;
    const slice = history.slice(i - window, i);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });

  const lastWindow = history.slice(-window);
  const level = lastWindow.reduce((a, b) => a + b, 0) / lastWindow.length;
  const forecast = Array.from({ length: horizon }, () => level);

  return finalizeModelResult(
    "Promedio Móvil",
    history,
    roundAll(fitted),
    roundAll(forecast),
    `Serie estable; ventana ${window} suaviza ruido. Adecuado como baseline rápido.`,
  );
}

export function exponentialSmoothing(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const { horizon, alpha } = resolveOptions(options);
  const fitted: number[] = [];
  let level = history[0]!;

  for (let i = 0; i < history.length; i++) {
    if (i === 0) {
      fitted.push(level);
    } else {
      level = alpha * history[i]! + (1 - alpha) * level;
      fitted.push(level);
    }
  }

  const forecast = Array.from({ length: horizon }, () => level);

  return finalizeModelResult(
    "Suavización Exponencial",
    history,
    roundAll(fitted),
    roundAll(forecast),
    `Alpha ${alpha}: responde a cambios recientes sin sobreajustar.`,
  );
}

export function linearTrendForecast(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const { horizon } = resolveOptions(options);
  const { a, b } = linearRegression(history);
  const n = history.length;

  const fitted = history.map((_, i) => a + b * i);
  const forecast = Array.from({ length: horizon }, (_, h) =>
    a + b * (n + h),
  );

  const trend =
    b > 50 ? "creciente" : b < -50 ? "decreciente" : "estable";

  return finalizeModelResult(
    "Tendencia Lineal",
    history,
    roundAll(fitted),
    roundAll(forecast),
    `Tendencia ${trend}. Útil si el SKU muestra drift sostenido.`,
  );
}

export function seasonalIndexForecast(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const { horizon, seasonLength } = resolveOptions(options);
  const { a, b } = linearRegression(history);

  const seasonalIndices: number[] = Array.from(
    { length: seasonLength },
    () => 1,
  );
  const counts = Array.from({ length: seasonLength }, () => 0);

  history.forEach((value, i) => {
    const trend = a + b * i;
    const idx = i % seasonLength;
    if (trend > 0) {
      seasonalIndices[idx] =
        (seasonalIndices[idx]! * counts[idx]! + value / trend) /
        (counts[idx]! + 1);
      counts[idx]! += 1;
    }
  });

  const meanIndex =
    seasonalIndices.reduce((s, v) => s + v, 0) / seasonLength;
  const normalized = seasonalIndices.map((s) => s / meanIndex);

  const fitted = history.map(
    (_, i) => (a + b * i) * normalized[i % seasonLength]!,
  );

  const forecast = Array.from({ length: horizon }, (_, h) => {
    const t = history.length + h;
    return (a + b * t) * normalized[t % seasonLength]!;
  });

  return finalizeModelResult(
    "Índice Estacional",
    history,
    roundAll(fitted),
    roundAll(forecast),
    `Estacionalidad ${seasonLength} períodos. Recomendado para bebidas y confitería con picos.`,
  );
}

/**
 * Mock ARIMA: combina suavización exponencial con componente AR(1) sobre residuales.
 */
export function mockARIMA(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const { horizon, alpha } = resolveOptions(options);
  const base = exponentialSmoothing(history, { alpha, horizon: 0 });

  const residuals = history.map(
    (y, i) => y - (base.fittedValues[i] ?? y),
  );
  const phi = 0.35;
  let ar = residuals[residuals.length - 1] ?? 0;

  const fitted = history.map((y, i) => {
    const level = base.fittedValues[i] ?? y;
    const r = i > 0 ? residuals[i - 1]! * phi : 0;
    return level + r;
  });

  const lastLevel = base.fittedValues[history.length - 1]!;
  const forecast: number[] = [];
  for (let h = 0; h < horizon; h++) {
    ar *= phi;
    forecast.push(lastLevel + ar);
  }

  return finalizeModelResult(
    "ARIMA (mock)",
    history,
    roundAll(fitted),
    roundAll(forecast),
    "Captura autocorrelación de corto plazo. Buen equilibrio precisión/complejidad.",
  );
}

/**
 * Mock SARIMA: índice estacional + componente AR mock (mejor para series estacionales).
 */
export function mockSARIMA(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const seasonal = seasonalIndexForecast(history, {
    ...options,
    horizon: 0,
  });
  const { horizon } = resolveOptions(options);

  const residuals = history.map(
    (y, i) => y - (seasonal.fittedValues[i] ?? y),
  );
  const phi = 0.25;
  let ar = residuals[residuals.length - 1] ?? 0;

  const fitted = history.map((y, i) => {
    const s = seasonal.fittedValues[i] ?? y;
    const r = i > 0 ? residuals[i - 1]! * phi : 0;
    return s + r;
  });

  const lastFitted = fitted[fitted.length - 1]!;
  const forecast = Array.from({ length: horizon }, (_, h) => {
    const seasonalBump =
      1 + 0.04 * Math.sin(((history.length + h) / 12) * Math.PI * 2);
    ar *= phi;
    return lastFitted * seasonalBump + ar;
  });

  return finalizeModelResult(
    "SARIMA (mock)",
    history,
    roundAll(fitted),
    roundAll(forecast),
    "Modelo preferido para SKUs con estacionalidad marcada y promociones recurrentes.",
  );
}

const ALL_MODELS = [
  movingAverage,
  exponentialSmoothing,
  linearTrendForecast,
  seasonalIndexForecast,
  mockARIMA,
  mockSARIMA,
] as const;

/** Ejecuta todos los modelos y devuelve el de menor MAPE in-sample */
export function selectBestModel(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult {
  const results = ALL_MODELS.map((fn) => fn(history, options));
  return results.reduce((best, cur) =>
    cur.mape < best.mape ? cur : best,
  );
}

/** Ejecuta todos los modelos (útil para comparación en UI futura) */
export function runAllModels(
  history: number[],
  options?: ForecastModelOptions,
): ForecastModelResult[] {
  return ALL_MODELS.map((fn) => fn(history, options));
}
