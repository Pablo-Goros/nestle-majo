import type { Alert } from "@/lib/alerts";
import type { CollaborativeInsight } from "@/lib/insights";

export type QuestionIntent =
  | "risk"
  | "forecast"
  | "forecast_change"
  | "alerts"
  | "model"
  | "channel_accuracy"
  | "bias"
  | "stockout"
  | "insights"
  | "financial"
  | "mbp"
  | "actions"
  | "general";

export interface AssistantContext {
  productCode: string;
  productName: string;
  usingLoadedDemand: boolean;
  usingCleanedSeries: boolean;
  alerts: Alert[];
  insights: CollaborativeInsight[];
}

export interface ForecastSummary {
  productName: string;
  demandBaseM1: number;
  demandConsensusM1: number;
  consensusVsBasePct: number;
  modelName: string;
  mape: number;
  bias: number;
  topAdjustments: string[];
}

export interface AlertSummary {
  critical: Alert[];
  high: Alert[];
  totalOpen: number;
  bySku: { sku: string; skuCode: string; count: number; topMessage: string }[];
}

export interface FinancialSummary {
  grossMarginPercent: number;
  projectedRevenue: number;
  financialImpact: number;
  lowMarginSkus: string[];
}

export interface MbpSummary {
  completedPct: number;
  overdueCount: number;
  overdueTasks: { title: string; owner: string; week: number }[];
  nextMeetings: { title: string; date: string; time: string }[];
}

export interface InsightSummary {
  pending: CollaborativeInsight[];
  approved: CollaborativeInsight[];
  rejected: CollaborativeInsight[];
}

export interface RecommendedAction {
  priority: "alta" | "media" | "baja";
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
