import { evaluateAlertsForSku } from "@/lib/alerts";
import type { Role } from "@/lib/mock-data";
import type { CollaborativeInsight } from "./types";

export interface PublishValidationResult {
  canPublish: boolean;
  blockers: string[];
  warnings: string[];
}

function pendingForSku(
  insights: CollaborativeInsight[],
  skuCode: string,
): CollaborativeInsight[] {
  return insights.filter(
    (i) => i.skuCode === skuCode && i.estado_aprobacion === "pendiente",
  );
}

export function validatePublishReadiness(
  skuCode: string,
  insights: CollaborativeInsight[],
  options?: { override?: boolean; role?: Role },
): PublishValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const { alerts } = evaluateAlertsForSku(skuCode);
  const criticalOpen = alerts.filter(
    (a) => a.severity === "alta" && a.status === "open",
  );
  if (criticalOpen.length > 0) {
    blockers.push(
      `${criticalOpen.length} alerta(s) crítica(s) abierta(s): ${criticalOpen
        .slice(0, 2)
        .map((a) => a.type)
        .join(", ")}${criticalOpen.length > 2 ? "…" : ""}`,
    );
  }

  const pending = pendingForSku(insights, skuCode);
  if (pending.length > 0) {
    blockers.push(
      `${pending.length} insight(s) pendiente(s) de aprobación relevante(s) para este SKU`,
    );
  }

  const mediaOpen = alerts.filter(
    (a) => a.severity === "media" && a.status === "open",
  );
  if (mediaOpen.length > 0) {
    warnings.push(`${mediaOpen.length} alerta(s) de severidad media abiertas`);
  }

  const canOverride = options?.role === "demand_planner" && options?.override === true;
  const canPublish =
    blockers.length === 0 || canOverride;

  return { canPublish, blockers, warnings };
}

export function canOverridePublishBlockers(role: Role): boolean {
  return role === "demand_planner";
}
