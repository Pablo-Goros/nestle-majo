import { evaluateAlerts } from "@/lib/alerts";
import { buildDashboardData } from "@/lib/dashboard";
import { buildFinancialDashboard, getFinancialSimulationParams } from "@/lib/financial";
import { selectBestModel } from "@/lib/forecasting";
import { formatImpactDisplay } from "@/lib/insights/consensus";
import { getInsights } from "@/lib/insights/store";
import { computeMbpKpis, getMbpState } from "@/lib/mbp";
import { withResolvedStatuses } from "@/lib/mbp/status";
import { getAllSkuChannelContexts, getHistoryActuals } from "@/lib/mockData";
import { DEMO_PRODUCTS } from "@/lib/mockData/catalog";
import { PRODUCTS } from "@/lib/mock-data";
import type {
  AlertSummary,
  FinancialSummary,
  ForecastSummary,
  InsightSummary,
  MbpSummary,
  RecommendedAction,
} from "./types";

export function getForecastSummary(productCode: string): ForecastSummary | null {
  const dash = buildDashboardData(productCode);
  const product = PRODUCTS.find((p) => p.code === productCode);
  if (!dash || !product) return null;

  const insights = getInsights().filter(
    (i) =>
      i.skuCode === productCode &&
      i.estado_aprobacion === "aprobado",
  );

  const topAdjustments = insights
    .slice(0, 4)
    .map((i) => `${i.area}: ${i.evento} (${formatImpactDisplay(i)})`);

  return {
    productName: product.name,
    demandBaseM1: dash.kpis.demandBaseM1,
    demandConsensusM1: dash.kpis.demandConsensusM1,
    consensusVsBasePct: dash.kpis.consensusVsBasePct,
    modelName: dash.kpis.modelName,
    mape: dash.kpis.mape,
    bias: dash.kpis.bias,
    topAdjustments,
  };
}

export function getAlertSummary(): AlertSummary {
  const alerts = evaluateAlerts().alerts;
  const critical = alerts.filter((a) => a.severity === "alta");
  const high = alerts.filter((a) => a.severity === "media");

  const skuMap = new Map<
    string,
    { sku: string; skuCode: string; count: number; topMessage: string }
  >();
  for (const a of alerts) {
    const prev = skuMap.get(a.skuCode) ?? {
      sku: a.sku,
      skuCode: a.skuCode,
      count: 0,
      topMessage: a.message,
    };
    prev.count += 1;
    if (a.severity === "alta") prev.topMessage = a.message;
    skuMap.set(a.skuCode, prev);
  }

  const bySku = [...skuMap.values()].sort((a, b) => b.count - a.count);

  return {
    critical,
    high,
    totalOpen: alerts.length,
    bySku,
  };
}

export function getFinancialSummary(): FinancialSummary {
  const fin = buildFinancialDashboard(getFinancialSimulationParams());
  const lowMarginSkus = [
    ...new Set(
      fin.rows
        .filter((r) => r.marginPercent < r.marginTarget)
        .map((r) => r.sku),
    ),
  ].slice(0, 5);

  return {
    grossMarginPercent: fin.kpis.grossMarginPercent,
    projectedRevenue: fin.kpis.projectedRevenue,
    financialImpact: fin.kpis.financialImpact,
    lowMarginSkus,
  };
}

export function getMBPSummary(): MbpSummary {
  const state = getMbpState();
  const tasks = withResolvedStatuses(state.tasks);
  const kpis = computeMbpKpis(tasks);

  const overdueTasks = tasks
    .filter((t) => t.status === "atrasada")
    .slice(0, 5)
    .map((t) => ({ title: t.title, owner: t.owner, week: t.week }));

  const nextMeetings = [...state.meetings]
    .filter((m) => m.status === "programada")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
    .map((m) => ({ title: m.title, date: m.date, time: m.time }));

  return {
    completedPct: kpis.completedPct,
    overdueCount: kpis.overdueCount,
    overdueTasks,
    nextMeetings,
  };
}

export function getInsightSummary(): InsightSummary {
  const all = getInsights();
  return {
    pending: all.filter((i) => i.estado_aprobacion === "pendiente"),
    approved: all.filter((i) => i.estado_aprobacion === "aprobado"),
    rejected: all.filter((i) => i.estado_aprobacion === "rechazado"),
  };
}

export function getBestModelForSku(productCode: string): {
  name: string;
  mape: number;
  bias: number;
} | null {
  const history = getHistoryActuals(productCode);
  if (history.length < 3) return null;
  const best = selectBestModel(history);
  return {
    name: best.modelName,
    mape: best.mape,
    bias: best.bias,
  };
}

export function getChannelAccuracyRanking(): {
  channel: string;
  avgDpa: number;
  avgBias: number;
}[] {
  const map = new Map<string, { dpa: number[]; bias: number[] }>();

  for (const ctx of getAllSkuChannelContexts()) {
    const prev = map.get(ctx.channel.name) ?? { dpa: [], bias: [] };
    prev.dpa.push(ctx.dpaLag3);
    prev.bias.push(ctx.biasPercent);
    map.set(ctx.channel.name, prev);
  }

  return [...map.entries()]
    .map(([channel, v]) => ({
      channel,
      avgDpa: v.dpa.reduce((a, b) => a + b, 0) / (v.dpa.length || 1),
      avgBias: v.bias.reduce((a, b) => a + b, 0) / (v.bias.length || 1),
    }))
    .sort((a, b) => a.avgDpa - b.avgDpa);
}

export function getRiskRanking(): {
  sku: string;
  skuCode: string;
  score: number;
  reasons: string[];
}[] {
  const alerts = getAlertSummary();
  const scores = new Map<
    string,
    { sku: string; skuCode: string; score: number; reasons: string[] }
  >();

  const add = (skuCode: string, sku: string, pts: number, reason: string) => {
    const prev = scores.get(skuCode) ?? { sku, skuCode, score: 0, reasons: [] };
    prev.score += pts;
    if (!prev.reasons.includes(reason)) prev.reasons.push(reason);
    scores.set(skuCode, prev);
  };

  for (const a of alerts.critical) {
    add(a.skuCode, a.sku, 3, a.message);
  }
  for (const a of alerts.high) {
    add(a.skuCode, a.sku, 1, a.message);
  }

  for (const p of DEMO_PRODUCTS) {
    const ctxs = getAllSkuChannelContexts().filter(
      (c) => c.product.code === p.code,
    );
    for (const ctx of ctxs) {
      if (ctx.inventory.coverageDays < 5) {
        add(p.code, p.name, 2, `Cobertura baja en ${ctx.channel.name}`);
      }
    }
  }

  return [...scores.values()].sort((a, b) => b.score - a.score);
}

export function getRecommendedActions(
  productCode?: string,
): RecommendedAction[] {
  const actions: RecommendedAction[] = [];
  const code = productCode ?? PRODUCTS[0]!.code;
  const alerts = getAlertSummary();
  const insights = getInsightSummary();
  const mbp = getMBPSummary();
  const fin = getFinancialSummary();

  for (const a of alerts.critical.slice(0, 3)) {
    actions.push({
      priority: "alta",
      text: `${a.sku} (${a.channel}): ${a.recommendation}`,
    });
  }

  if (insights.pending.length > 0) {
    actions.push({
      priority: "media",
      text: `Aprobar o rechazar ${insights.pending.length} insight(s) pendiente(s) antes del consenso.`,
    });
  }

  if (mbp.overdueCount > 0) {
    actions.push({
      priority: "alta",
      text: `Cerrar ${mbp.overdueCount} tarea(s) MBP atrasada(s).`,
    });
  }

  if (fin.lowMarginSkus.length > 0) {
    actions.push({
      priority: "media",
      text: `Revisar margen en: ${fin.lowMarginSkus.join(", ")}.`,
    });
  }

  const forecast = getForecastSummary(code);
  if (forecast && Math.abs(forecast.consensusVsBasePct) > 15) {
    actions.push({
      priority: "media",
      text: `Validar desvío consenso vs base (${forecast.consensusVsBasePct.toFixed(1)}%) en ${forecast.productName}.`,
    });
  }

  const outliers = insights.pending.filter((i) => i.area === "Ventas");
  if (outliers.length > 0) {
    actions.push({
      priority: "baja",
      text: "Coordinar con Ventas inputs comerciales pendientes.",
    });
  }

  if (actions.length === 0) {
    actions.push({
      priority: "baja",
      text: "Sin acciones urgentes. Continuar ciclo MBP y monitorear alertas.",
    });
  }

  return actions.slice(0, 6);
}
