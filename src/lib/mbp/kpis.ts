import { evaluateAlerts } from "@/lib/alerts";
import { getInsights } from "@/lib/insights/store";
import { getConsensusStates } from "@/lib/insights/store";
import { PRODUCTS } from "@/lib/mock-data";
import { withResolvedStatuses } from "./status";
import type { MbpKpis, MbpTask } from "./types";

export function computeMbpKpis(tasks: MbpTask[]): MbpKpis {
  const resolved = withResolvedStatuses(tasks);
  const totalTasks = resolved.length;
  const completed = resolved.filter((t) => t.status === "completada").length;
  const overdueCount = resolved.filter((t) => t.status === "atrasada").length;
  const completedPct =
    totalTasks === 0 ? 0 : Math.round((completed / totalTasks) * 100);

  const pendingInsights = getInsights().filter(
    (i) => i.estado_aprobacion === "pendiente",
  ).length;

  const criticalAlerts = evaluateAlerts().alerts.filter(
    (a) => a.severity === "alta" && a.status === "open",
  ).length;

  const publishedCodes = new Set(
    getConsensusStates().filter((s) => s.published).map((s) => s.skuCode),
  );
  const forecastPublished = PRODUCTS.every((p) => publishedCodes.has(p.code));

  return {
    completedPct,
    overdueCount,
    pendingInsights,
    criticalAlerts,
    forecastPublished,
    totalTasks,
  };
}
