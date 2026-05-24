import type { Role } from "@/lib/mock-data";
import { isForecastPublished } from "./consensusState";
import type { CollaborativeInsight, InsightArea } from "./types";

const ROLE_AREA: Partial<Record<Role, InsightArea>> = {
  marketing: "Marketing",
  ventas: "Ventas",
  finanzas: "Finanzas",
};

export function getRoleArea(role: Role): InsightArea | null {
  return ROLE_AREA[role] ?? null;
}

export function isReadOnlyRole(role: Role): boolean {
  return role === "direccion";
}

export function canModifySkuWhenPublished(role: Role, skuCode: string): boolean {
  if (!skuCode.trim()) return false;
  if (!isForecastPublished(skuCode)) return true;
  return canEditPublishedForecast(role);
}

export function canCreateInsight(
  role: Role,
  area: InsightArea,
  skuCode?: string,
): boolean {
  if (isReadOnlyRole(role)) return false;
  if (skuCode && !canModifySkuWhenPublished(role, skuCode)) return false;
  if (role === "demand_planner") return true;
  return getRoleArea(role) === area;
}

export function canEditInsight(
  role: Role,
  insight: CollaborativeInsight,
): boolean {
  if (isReadOnlyRole(role)) return false;
  if (!canModifySkuWhenPublished(role, insight.skuCode)) return false;
  if (role === "demand_planner") return true;
  if (insight.estado_aprobacion !== "pendiente") return false;
  return getRoleArea(role) === insight.area;
}

export function canDeleteInsight(
  role: Role,
  insight: CollaborativeInsight,
): boolean {
  if (isReadOnlyRole(role)) return false;
  if (!canModifySkuWhenPublished(role, insight.skuCode)) return false;
  if (role === "demand_planner") return true;
  if (insight.estado_aprobacion !== "pendiente") return false;
  return getRoleArea(role) === insight.area;
}

export function canApproveReject(role: Role): boolean {
  return role === "demand_planner";
}

export function canPublishForecast(role: Role): boolean {
  return role === "demand_planner";
}

/** Solo Demand Planner puede editar un forecast ya publicado */
export function canEditPublishedForecast(role: Role): boolean {
  return role === "demand_planner";
}
