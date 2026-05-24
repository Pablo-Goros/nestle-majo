import {
  calculateBias,
  calculateMAD,
  calculateMAPE,
  calculateRMSE,
  calculateTrackingSignal,
  type ActualForecastPair,
} from "@/lib/analytics";
import type { ForecastModelResult, ForecastModelOptions } from "./types";

export const DEFAULT_HORIZON = 3;

export function resolveOptions(opts?: ForecastModelOptions) {
  return {
    horizon: opts?.horizon ?? DEFAULT_HORIZON,
    window: opts?.window ?? 3,
    alpha: opts?.alpha ?? 0.3,
    seasonLength: opts?.seasonLength ?? 12,
  };
}

export function buildInSamplePairs(
  history: number[],
  fitted: number[],
): ActualForecastPair[] {
  return history
    .map((actual, i) => ({ actual, forecast: fitted[i]! }))
    .filter((p) => Number.isFinite(p.forecast));
}

export function finalizeModelResult(
  modelName: string,
  history: number[],
  fittedValues: number[],
  forecast: number[],
  recommendation: string,
): ForecastModelResult {
  const pairs = buildInSamplePairs(history, fittedValues);
  return {
    modelName,
    forecast,
    fittedValues,
    mape: calculateMAPE(pairs),
    mad: calculateMAD(pairs),
    rmse: calculateRMSE(pairs),
    bias: calculateBias(pairs),
    trackingSignal: calculateTrackingSignal(pairs),
    recommendation,
  };
}

export function roundAll(values: number[]): number[] {
  return values.map((v) => Math.round(v));
}

/** Regresión lineal simple y = a + b·t */
export function linearRegression(values: number[]): { a: number; b: number } {
  const n = values.length;
  if (n === 0) return { a: 0, b: 0 };
  if (n === 1) return { a: values[0]!, b: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }

  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { a: values[n - 1]!, b: 0 };

  const b = (n * sumXY - sumX * sumY) / denom;
  const a = (sumY - b * sumX) / n;
  return { a, b };
}
