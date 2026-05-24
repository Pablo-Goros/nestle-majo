import type { MonthlyDemandPoint, WeeklyDemandPoint } from "@/lib/mockData";

export const EVENT_OPTIONS = [
  "Promoción",
  "Hot Sale",
  "Cyber Week",
  "Vuelta a clases",
  "Cierre de trimestre",
  "Traba comercial",
  "Falso stock",
  "Quiebre de stock",
  "Evento macroeconómico",
  "Otro",
] as const;

export type EventLabel = (typeof EVENT_OPTIONS)[number];

export type EventKind = "estructural" | "coyuntural";

export type OutlierTreatment =
  | "excluir"
  | "suavizar"
  | "mantener"
  | "mediana";

export interface DemandPoint {
  id: string;
  week: string;
  skuCode: string;
  skuName: string;
  channel: string;
  originalDemand: number;
}

export interface CleaningRow {
  id: string;
  week: string;
  skuCode: string;
  skuName: string;
  channel: string;
  originalDemand: number;
  cleanDemand: number;
  zScore: number;
  isOutlier: boolean;
  expected: number;
  status: "OK" | "Outlier" | "Limpiado";
  eventLabel: EventLabel | "";
  eventKind: EventKind;
  treatment: OutlierTreatment;
}

export interface CleaningKpis {
  outlierCount: number;
  affectedPct: number;
  peakZ: number;
  valleyZ: number;
  unclassifiedCount: number;
  baselineImpactPct: number;
}

export interface CleaningSummary {
  kpis: CleaningKpis;
  chart: { period: string; original: number; limpio: number }[];
}

export interface SkuCleaningStore {
  skuCode: string;
  cleanedAt: string;
  threshold: number;
  rows: CleaningRow[];
  monthlyHistory: MonthlyDemandPoint[];
  weeklyForecast: WeeklyDemandPoint[];
}

export interface CleaningPersistedState {
  version: 1;
  bySku: Record<string, SkuCleaningStore>;
}
