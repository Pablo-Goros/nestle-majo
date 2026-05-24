import type { SkuChannelPlanningContext } from "@/lib/mockData";
import type { Alert, AlertRuleThresholds } from "./types";

export const DEFAULT_THRESHOLDS: AlertRuleThresholds = {
  consensusDeviationPct: 20,
  dpaLag3Min: 70,
  biasMin: -10,
  biasMax: 10,
  trackingSignalMin: -4,
  trackingSignalMax: 4,
  stockoutCoverageDays: 5,
  marginGapPoints: 2,
};

let alertCounter = 0;

function nextId(): string {
  alertCounter += 1;
  return `ALT-${Date.now()}-${alertCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

type RuleEvaluator = (
  ctx: SkuChannelPlanningContext,
  thresholds: AlertRuleThresholds,
) => Alert | null;

const ruleConsensusDeviation: RuleEvaluator = (ctx, t) => {
  const pct = Math.abs(ctx.consensusVsBaselinePct);
  if (pct <= t.consensusDeviationPct) return null;

  return {
    id: nextId(),
    type: "consensus_deviation",
    severity: pct > 30 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `Desvío consenso vs baseline de ${pct.toFixed(1)}% (umbral ${t.consensusDeviationPct}%).`,
    recommendation:
      "Revisar insights de áreas y validar ajustes antes del consenso S&OP.",
    owner: "Demand Planner",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleDpaLag3: RuleEvaluator = (ctx, t) => {
  if (ctx.dpaLag3 >= t.dpaLag3Min) return null;

  return {
    id: nextId(),
    type: "dpa_lag3_low",
    severity: ctx.dpaLag3 < 60 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `DPA Lag-3 en ${ctx.dpaLag3.toFixed(1)}% (mínimo ${t.dpaLag3Min}%).`,
    recommendation:
      "Revisar limpieza de outliers y recalibrar baseline estadístico.",
    owner: "Demand Planner",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleBias: RuleEvaluator = (ctx, t) => {
  if (ctx.biasPercent >= t.biasMin && ctx.biasPercent <= t.biasMax) return null;

  const direction = ctx.biasPercent > 0 ? "sobreestimación" : "subestimación";

  return {
    id: nextId(),
    type: "bias_out_of_range",
    severity: Math.abs(ctx.biasPercent) > 15 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `Bias de ${ctx.biasPercent.toFixed(1)}% (${direction}; rango [${t.biasMin}, ${t.biasMax}]).`,
    recommendation:
      "Evaluar cambio de modelo o incorporar insights de demanda.",
    owner: "Demand Planner",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleTrackingSignal: RuleEvaluator = (ctx, t) => {
  const ts = ctx.trackingSignal;
  if (ts >= t.trackingSignalMin && ts <= t.trackingSignalMax) return null;

  return {
    id: nextId(),
    type: "tracking_signal",
    severity: Math.abs(ts) > 6 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `Tracking Signal en ${ts.toFixed(2)} (rango [${t.trackingSignalMin}, ${t.trackingSignalMax}]).`,
    recommendation:
      "Sesgo sistemático detectado. Revisar ajustes del modelo o reglas de consenso.",
    owner: "Demand Planner",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleStockout: RuleEvaluator = (ctx, t) => {
  if (ctx.inventory.coverageDays >= t.stockoutCoverageDays) return null;

  return {
    id: nextId(),
    type: "stockout_risk",
    severity: ctx.inventory.coverageDays < 4 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `Riesgo de stockout: cobertura proyectada de ${ctx.inventory.coverageDays} días.`,
    recommendation: `Acelerar reposición en ${ctx.channel.name}. Revisar stock cliente y pedidos abiertos.`,
    owner: "Ventas",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleMargin: RuleEvaluator = (ctx, t) => {
  const gap = ctx.financials.marginTarget - ctx.financials.marginPercent;
  if (gap < t.marginGapPoints) return null;

  return {
    id: nextId(),
    type: "margin_below_target",
    severity: gap > 5 ? "alta" : "media",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `Margen ${ctx.financials.marginPercent}% vs target ${ctx.financials.marginTarget}% (${gap.toFixed(1)} pp bajo).`,
    recommendation:
      "Evaluar ajuste de precio, mix de canal o revisión de costos de materia prima.",
    owner: "Finanzas",
    status: "open",
    createdAt: nowIso(),
  };
};

const ruleCriticalNoInsights: RuleEvaluator = (ctx) => {
  if (!ctx.isCriticalSku) return null;
  const hasActiveInsight = ctx.insights.some(
    (i) => i.status === "Aprobado" || i.status === "En revisión",
  );
  if (hasActiveInsight) return null;

  return {
    id: nextId(),
    type: "critical_sku_no_insights",
    severity: "baja",
    sku: ctx.product.name,
    skuCode: ctx.product.code,
    channel: ctx.channel.name,
    message: `SKU crítico sin insights activos en ${ctx.channel.name}.`,
    recommendation:
      "Solicitar input a Marketing, Ventas o Finanzas antes del consenso.",
    owner: "Ventas",
    status: "open",
    createdAt: nowIso(),
  };
};

export const ALERT_RULES: RuleEvaluator[] = [
  ruleConsensusDeviation,
  ruleDpaLag3,
  ruleBias,
  ruleTrackingSignal,
  ruleStockout,
  ruleMargin,
  ruleCriticalNoInsights,
];

export function evaluateContext(
  ctx: SkuChannelPlanningContext,
  thresholds: AlertRuleThresholds = DEFAULT_THRESHOLDS,
): Alert[] {
  return ALERT_RULES.map((rule) => rule(ctx, thresholds)).filter(
    (a): a is Alert => a != null,
  );
}

/** Reinicia contador de IDs (útil en tests) */
export function resetAlertIdCounter(): void {
  alertCounter = 0;
}
