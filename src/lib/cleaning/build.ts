import type { MonthlyDemandPoint, WeeklyDemandPoint } from "@/lib/mockData";
import { getSkuBundle } from "@/lib/mockData";
import type { CleaningKpis, CleaningRow, CleaningSummary } from "./types";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export function buildCleaningSummary(rows: CleaningRow[]): CleaningSummary {
  const total = rows.length;
  const outliers = rows.filter((r) => r.isOutlier);
  const outlierCount = outliers.length;
  const affectedPct = total === 0 ? 0 : (outlierCount / total) * 100;

  const zValues = rows.map((r) => r.zScore);
  const peakZ = zValues.length ? Math.max(...zValues) : 0;
  const valleyZ = zValues.length ? Math.min(...zValues) : 0;

  const unclassifiedCount = outliers.filter((r) => !r.eventLabel).length;

  const origSum = rows.reduce((s, r) => s + r.originalDemand, 0);
  const cleanSum = rows.reduce((s, r) => s + r.cleanDemand, 0);
  const baselineImpactPct =
    origSum === 0 ? 0 : (Math.abs(origSum - cleanSum) / origSum) * 100;

  const kpis: CleaningKpis = {
    outlierCount,
    affectedPct,
    peakZ,
    valleyZ,
    unclassifiedCount,
    baselineImpactPct,
  };

  const byWeek = new Map<string, { original: number; limpio: number }>();
  for (const r of rows) {
    const prev = byWeek.get(r.week) ?? { original: 0, limpio: 0 };
    prev.original += r.originalDemand;
    prev.limpio += r.cleanDemand;
    byWeek.set(r.week, prev);
  }

  const chart = [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([period, v]) => ({ period, original: v.original, limpio: v.limpio }));

  return { kpis, chart };
}

export function rowsToWeeklyForecast(rows: CleaningRow[]): WeeklyDemandPoint[] {
  const byWeek = new Map<string, { original: number; clean: number }>();
  for (const r of rows) {
    const prev = byWeek.get(r.week) ?? { original: 0, clean: 0 };
    prev.original += r.originalDemand;
    prev.clean += r.cleanDemand;
    byWeek.set(r.week, prev);
  }

  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, v]) => ({
      week,
      actual: v.original,
      baseline: v.clean,
      consensus: v.clean,
    }));
}

export function rowsToMonthlyHistory(
  skuCode: string,
  rows: CleaningRow[],
): MonthlyDemandPoint[] {
  const bundle = getSkuBundle(skuCode);
  const baseMonthly = bundle?.monthlyHistory ?? [];

  if (baseMonthly.length > 0 && baseMonthly.some((m) => m.actual != null)) {
    const origSum = rows.reduce((s, r) => s + r.originalDemand, 0);
    const cleanSum = rows.reduce((s, r) => s + r.cleanDemand, 0);
    const ratio = origSum === 0 ? 1 : cleanSum / origSum;

    return baseMonthly.map((m) => {
      const actual =
        m.actual != null ? Math.round(m.actual * ratio) : m.actual;
      const baseline = actual ?? m.baseline;
      return {
        month: m.month,
        actual,
        baseline,
        consensus: baseline,
      };
    });
  }

  const totalClean = rows.reduce((s, r) => s + r.cleanDemand, 0);
  const perMonth = Math.round(totalClean / Math.max(MONTHS.length, 1));

  return MONTHS.map((month, i) => ({
    month,
    actual: i < 9 ? perMonth : null,
    baseline: perMonth,
    consensus: perMonth,
  }));
}
