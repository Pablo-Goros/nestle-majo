import { mean, median, stdDev, zScore } from "./stats";
import { applyTreatmentValue } from "./treatment";
import type { CleaningRow, DemandPoint } from "./types";

function seriesKey(p: DemandPoint): string {
  return `${p.skuCode}|${p.channel}`;
}

export function detectOutliers(
  points: DemandPoint[],
  threshold: number,
): CleaningRow[] {
  const grouped = new Map<string, DemandPoint[]>();
  for (const p of points) {
    const key = seriesKey(p);
    const list = grouped.get(key) ?? [];
    list.push(p);
    grouped.set(key, list);
  }

  const rows: CleaningRow[] = [];

  for (const [, series] of grouped) {
    const sorted = [...series].sort((a, b) => a.week.localeCompare(b.week));
    const values = sorted.map((p) => p.originalDemand);
    const avg = mean(values);
    const sd = stdDev(values, avg);
    const med = median(values);

    for (let index = 0; index < sorted.length; index++) {
      const p = sorted[index]!;
      const z = zScore(p.originalDemand, avg, sd);
      const isOutlier = Math.abs(z) > threshold;
      const treatment = isOutlier ? "excluir" : "mantener";
      const cleanDemand = isOutlier
        ? applyTreatmentValue(
            p.originalDemand,
            treatment,
            values,
            index,
            avg,
            med,
          )
        : p.originalDemand;

      rows.push({
        id: p.id,
        week: p.week,
        skuCode: p.skuCode,
        skuName: p.skuName,
        channel: p.channel,
        originalDemand: p.originalDemand,
        cleanDemand,
        zScore: z,
        isOutlier,
        expected: Math.round(avg),
        status: isOutlier
          ? cleanDemand !== p.originalDemand
            ? "Limpiado"
            : "Outlier"
          : "OK",
        eventLabel: "",
        eventKind: "coyuntural",
        treatment,
      });
    }
  }

  return rows.sort((a, b) => a.week.localeCompare(b.week));
}

export function recomputeRowCleanDemand(
  row: CleaningRow,
  allRows: CleaningRow[],
): CleaningRow {
  const series = allRows.filter(
    (r) => r.skuCode === row.skuCode && r.channel === row.channel,
  );
  const sorted = [...series].sort((a, b) => a.week.localeCompare(b.week));
  const values = sorted.map((r) => r.originalDemand);
  const avg = mean(values);
  const med = median(values);
  const idx = sorted.findIndex((r) => r.id === row.id);

  if (!row.isOutlier) {
    return { ...row, cleanDemand: row.originalDemand, status: "OK" };
  }

  const cleanDemand = applyTreatmentValue(
    row.originalDemand,
    row.treatment,
    values,
    idx,
    avg,
    med,
  );
  return {
    ...row,
    cleanDemand,
    status: cleanDemand !== row.originalDemand ? "Limpiado" : "Outlier",
  };
}

export function updateRowMeta(
  row: CleaningRow,
  patch: Partial<Pick<CleaningRow, "eventLabel" | "eventKind" | "treatment">>,
): CleaningRow {
  return { ...row, ...patch };
}
