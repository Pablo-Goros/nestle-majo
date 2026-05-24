import { mean, median, movingAverage } from "./stats";
import type { OutlierTreatment } from "./types";

export function applyTreatmentValue(
  original: number,
  treatment: OutlierTreatment,
  seriesValues: number[],
  index: number,
  avg: number,
  med: number,
): number {
  switch (treatment) {
    case "mantener":
      return original;
    case "excluir":
      return Math.round(avg);
    case "mediana":
      return Math.round(med);
    case "suavizar":
      return Math.round(movingAverage(seriesValues, index));
    default:
      return original;
  }
}
