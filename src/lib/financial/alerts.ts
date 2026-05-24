import type { Alert } from "@/lib/alerts";
import type { FinancialSimulationParams, SkuFinancialRow } from "./types";

let alertCounter = 0;

function nextId(): string {
  alertCounter += 1;
  return `FIN-${Date.now()}-${alertCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function resetFinancialAlertCounter(): void {
  alertCounter = 0;
}

export function evaluateFinancialAlerts(
  rows: SkuFinancialRow[],
  params: FinancialSimulationParams,
): Alert[] {
  resetFinancialAlertCounter();
  const alerts: Alert[] = [];

  for (const row of rows) {
    const marginGap = row.marginTarget - row.marginPercent;
    if (marginGap > 0) {
      alerts.push({
        id: nextId(),
        type: "margin_below_target",
        severity: marginGap > 5 ? "alta" : "media",
        sku: row.sku,
        skuCode: row.skuCode,
        channel: row.channel,
        message: `Margen ${row.marginPercent.toFixed(1)}% vs target ${row.marginTarget}% (${marginGap.toFixed(1)} pp bajo).`,
        recommendation:
          "Evaluar ajuste de precio, mix de canal o revisión de costos de materia prima.",
        owner: "Finanzas",
        status: "open",
        createdAt: nowIso(),
      });
    }

    const costIncreasePct =
      row.baseUnitCost === 0
        ? 0
        : ((row.unitCost - row.baseUnitCost) / row.baseUnitCost) * 100;
    if (costIncreasePct > 15) {
      alerts.push({
        id: nextId(),
        type: "unit_cost_spike",
        severity: costIncreasePct > 25 ? "alta" : "media",
        sku: row.sku,
        skuCode: row.skuCode,
        channel: row.channel,
        message: `Costo unitario sube ${costIncreasePct.toFixed(1)}% por FX, inflación y MP.`,
        recommendation:
          "Revisar contratos de materia prima y cobertura cambiaria.",
        owner: "Finanzas",
        status: "open",
        createdAt: nowIso(),
      });
    }

    if (row.revenue < row.baselineRevenue * 0.98) {
      alerts.push({
        id: nextId(),
        type: "revenue_below_baseline",
        severity:
          row.variationVsBaselinePct < -10
            ? "alta"
            : "media",
        sku: row.sku,
        skuCode: row.skuCode,
        channel: row.channel,
        message: `Revenue cae ${Math.abs(row.variationVsBaselinePct).toFixed(1)}% vs baseline en ${row.channel}.`,
        recommendation:
          "Validar elasticidad y ajustes de consenso antes de cerrar MBP.",
        owner: "Finanzas",
        status: "open",
        createdAt: nowIso(),
      });
    }

    if (params.scenario === "pesimista" && row.marginPercent < 0) {
      alerts.push({
        id: nextId(),
        type: "pessimistic_negative_margin",
        severity: "alta",
        sku: row.sku,
        skuCode: row.skuCode,
        channel: row.channel,
        message: `Escenario pesimista: margen negativo (${row.marginPercent.toFixed(1)}%).`,
        recommendation:
          "Simular recuperación con ajuste de precio o reducción de costo MP.",
        owner: "Finanzas",
        status: "open",
        createdAt: nowIso(),
      });
    }
  }

  return alerts;
}
