import type { Alert } from "@/lib/alerts";
import type { CleaningRow, CleaningSummary } from "./types";

let counter = 0;

function nextId(): string {
  counter += 1;
  return `CLN-${Date.now()}-${counter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function resetCleaningAlertCounter(): void {
  counter = 0;
}

export function evaluateCleaningAlerts(
  skuCode: string,
  skuName: string,
  rows: CleaningRow[],
  summary: CleaningSummary,
): Alert[] {
  resetCleaningAlertCounter();
  const alerts: Alert[] = [];
  const channel = "Todos";
  const { kpis } = summary;

  if (kpis.unclassifiedCount > 0) {
    alerts.push({
      id: nextId(),
      type: "cleaning_unclassified_outliers",
      severity: kpis.unclassifiedCount > 2 ? "alta" : "media",
      sku: skuName,
      skuCode,
      channel,
      message: `${kpis.unclassifiedCount} outlier(s) sin clasificar en limpieza.`,
      recommendation:
        "Asignar evento y tipo (estructural/coyuntural) antes del forecast.",
      owner: "Demand Planner",
      status: "open",
      createdAt: nowIso(),
    });
  }

  if (kpis.affectedPct > 10) {
    alerts.push({
      id: nextId(),
      type: "cleaning_high_outlier_ratio",
      severity: kpis.affectedPct > 20 ? "alta" : "media",
      sku: skuName,
      skuCode,
      channel,
      message: `${kpis.affectedPct.toFixed(1)}% de la serie tiene outliers (umbral 10%).`,
      recommendation: "Revisar tratamiento y validar eventos coyunturales.",
      owner: "Demand Planner",
      status: "open",
      createdAt: nowIso(),
    });
  }

  const coyunturalImpact = rows.filter(
    (r) =>
      r.isOutlier &&
      r.eventKind === "coyuntural" &&
      r.treatment !== "mantener" &&
      Math.abs(r.cleanDemand - r.originalDemand) > r.expected * 0.1,
  );
  if (coyunturalImpact.length > 0) {
    alerts.push({
      id: nextId(),
      type: "cleaning_coyuntural_baseline",
      severity: "media",
      sku: skuName,
      skuCode,
      channel,
      message: `Evento coyuntural afectando baseline en ${coyunturalImpact.length} punto(s).`,
      recommendation:
        "Confirmar si el ajuste debe excluirse del baseline estadístico.",
      owner: "Demand Planner",
      status: "open",
      createdAt: nowIso(),
    });
  }

  const unexplainedDrop = rows.find(
    (r) =>
      r.isOutlier &&
      r.zScore < -3 &&
      !r.eventLabel &&
      r.originalDemand < r.expected * 0.7,
  );
  if (unexplainedDrop) {
    alerts.push({
      id: nextId(),
      type: "cleaning_unexplained_drop",
      severity: "alta",
      sku: skuName,
      skuCode,
      channel: unexplainedDrop.channel,
      message: `Caída abrupta en ${unexplainedDrop.week} (Z=${unexplainedDrop.zScore.toFixed(1)}) sin evento asignado.`,
      recommendation:
        "Investigar quiebre de stock, falso stock o traba comercial.",
      owner: "Demand Planner",
      status: "open",
      createdAt: nowIso(),
    });
  }

  return alerts;
}
