import { getAllSkuChannelContexts } from "@/lib/mockData";
import type { SkuChannelPlanningContext } from "@/lib/mockData";
import {
  buildCleaningSummary,
  buildDemandPointsForSku,
  detectOutliers,
  evaluateCleaningAlerts,
  getSkuCleaning,
} from "@/lib/cleaning";
import { DEMO_PRODUCTS } from "@/lib/mockData/catalog";
import {
  buildFinancialDashboard,
  getFinancialSimulationParams,
} from "@/lib/financial";
import {
  DEFAULT_THRESHOLDS,
  evaluateContext,
  resetAlertIdCounter,
} from "./rules";
import type { Alert, AlertSeverity, AlertType, EvaluateAlertsOptions } from "./types";

export interface AlertEngineResult {
  alerts: Alert[];
  evaluatedAt: string;
  contextCount: number;
}

/**
 * Motor de alertas: evalúa todas las reglas sobre cada contexto SKU×canal.
 */
export function evaluateAlerts(
  contexts?: SkuChannelPlanningContext[],
  options?: EvaluateAlertsOptions,
): AlertEngineResult {
  resetAlertIdCounter();

  const thresholds = { ...DEFAULT_THRESHOLDS, ...options?.thresholds };
  const source = contexts ?? getAllSkuChannelContexts();

  const planningAlerts = source
    .flatMap((ctx) => evaluateContext(ctx, thresholds))
    .filter((a) => options?.includeResolved || a.status === "open");

  const financialAlerts = buildFinancialDashboard(
    getFinancialSimulationParams(),
  ).alerts;

  const cleaningAlerts = DEMO_PRODUCTS.flatMap((p) => {
    const stored = getSkuCleaning(p.code);
    const threshold = stored?.threshold ?? 3;
    const rows =
      stored?.rows ??
      detectOutliers(buildDemandPointsForSku(p.code), threshold);
    const summary = buildCleaningSummary(rows);
    return evaluateCleaningAlerts(p.code, p.name, rows, summary);
  });

  const seen = new Set<string>();
  const alerts = [...planningAlerts, ...financialAlerts, ...cleaningAlerts]
    .filter((a) => {
      const key = `${a.type}:${a.skuCode}:${a.channel}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return options?.includeResolved || a.status === "open";
    })
    .sort(compareAlerts);

  return {
    alerts,
    evaluatedAt: new Date().toISOString(),
    contextCount: source.length,
  };
}

/** Evalúa alertas para un SKU en todos sus canales */
export function evaluateAlertsForSku(skuCode: string): AlertEngineResult {
  const contexts = getAllSkuChannelContexts().filter(
    (c) => c.product.code === skuCode,
  );
  return evaluateAlerts(contexts);
}

/** Filtra alertas por severidad, tipo o estado */
export function filterAlerts(
  alerts: Alert[],
  filters: {
    severity?: AlertSeverity;
    type?: AlertType;
    status?: Alert["status"];
    skuCode?: string;
    channel?: string;
  },
): Alert[] {
  return alerts.filter((a) => {
    if (filters.severity && a.severity !== filters.severity) return false;
    if (filters.type && a.type !== filters.type) return false;
    if (filters.status && a.status !== filters.status) return false;
    if (filters.skuCode && a.skuCode !== filters.skuCode) return false;
    if (filters.channel && a.channel !== filters.channel) return false;
    return true;
  });
}

function severityRank(s: AlertSeverity): number {
  return { alta: 0, media: 1, baja: 2 }[s];
}

function compareAlerts(a: Alert, b: Alert): number {
  const sev = severityRank(a.severity) - severityRank(b.severity);
  if (sev !== 0) return sev;
  return b.createdAt.localeCompare(a.createdAt);
}

/** Cantidad de alertas abiertas (sidebar, badges) */
export function getActiveAlertCount(): number {
  return evaluateAlerts().alerts.length;
}
