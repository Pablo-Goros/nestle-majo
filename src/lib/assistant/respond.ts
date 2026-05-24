import { evaluateAlerts } from "@/lib/alerts";
import { buildAssistantContext, dataDisclaimer } from "./context";
import { analyzeQuestion } from "./analyze";
import { PRODUCTS } from "@/lib/mock-data";
import {
  getAlertSummary,
  getBestModelForSku,
  getChannelAccuracyRanking,
  getFinancialSummary,
  getForecastSummary,
  getInsightSummary,
  getMBPSummary,
  getRecommendedActions,
  getRiskRanking,
} from "./summaries";
import type { QuestionIntent } from "./types";

function fmtUnits(n: number): string {
  return `${n.toLocaleString("es-AR")} u`;
}

function fmtPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function respondRisk(ctx: ReturnType<typeof buildAssistantContext>): string {
  const ranking = getRiskRanking();
  const alerts = getAlertSummary();

  if (ranking.length === 0) {
    return `No detecto SKUs con riesgo elevado en este momento.${dataDisclaimer(ctx)}`;
  }

  const top = ranking[0]!;
  const lines = [
    `**${top.sku}** concentra el mayor riesgo operativo hoy.`,
    "",
    "Motivos principales:",
    ...top.reasons.slice(0, 3).map((r) => `• ${r}`),
    "",
    `Hay **${alerts.critical.length} alerta(s) crítica(s)** y **${alerts.totalOpen} alerta(s) abiertas** en total.`,
  ];

  if (ranking[1]) {
    lines.push(
      "",
      `Siguientes en riesgo: **${ranking[1].sku}**, **${ranking[2]?.sku ?? "—"}**.`,
    );
  }

  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondForecast(
  ctx: ReturnType<typeof buildAssistantContext>,
  change: boolean,
): string {
  const f = getForecastSummary(ctx.productCode);
  if (!f) {
    return `No hay historia suficiente para **${ctx.productName}**. Cargá datos en Datos o elegí otro SKU.${dataDisclaimer(ctx)}`;
  }

  if (change) {
    const dir = f.consensusVsBasePct >= 0 ? "subió" : "bajó";
    const lines = [
      `El consenso M+1 de **${f.productName}** ${dir} **${fmtPct(Math.abs(f.consensusVsBasePct))}** vs baseline (${fmtUnits(f.demandBaseM1)} → ${fmtUnits(f.demandConsensusM1)}).`,
      "",
      "Principales drivers:",
    ];
    if (f.topAdjustments.length > 0) {
      lines.push(...f.topAdjustments.map((a) => `• ${a}`));
    } else {
      lines.push("• Sin insights aprobados que expliquen el delta; revisar baseline estadístico.");
    }
    lines.push("", `Modelo activo: **${f.modelName}** (MAPE ${f.mape.toFixed(1)}%).`);
    return lines.join("\n") + dataDisclaimer(ctx);
  }

  return [
    `**Forecast · ${f.productName}**`,
    `• Baseline M+1: ${fmtUnits(f.demandBaseM1)}`,
    `• Consenso M+1: ${fmtUnits(f.demandConsensusM1)} (${fmtPct(f.consensusVsBasePct)} vs base)`,
    `• Modelo: ${f.modelName} · MAPE ${f.mape.toFixed(1)}% · Bias ${fmtPct(f.bias)}`,
    f.topAdjustments.length > 0
      ? `• Ajustes por insights: ${f.topAdjustments.join("; ")}`
      : "• Sin ajustes aprobados en insights.",
  ].join("\n") + dataDisclaimer(ctx);
}

function respondStockout(ctx: ReturnType<typeof buildAssistantContext>): string {
  const stockouts = evaluateAlerts()
    .alerts.filter((a) => a.type === "stockout_risk");
  if (stockouts.length === 0) {
    return `No hay alertas de stockout activas.${dataDisclaimer(ctx)}`;
  }
  const lines = [
    `**${stockouts.length} alerta(s) de stockout** detectadas:`,
    ...stockouts.slice(0, 5).map(
      (a) => `• **${a.sku}** · ${a.channel}: ${a.message}`,
    ),
  ];
  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondBias(ctx: ReturnType<typeof buildAssistantContext>): string {
  const ranked = PRODUCTS.map((p) => {
    const f = getForecastSummary(p.code);
    return { name: p.name, bias: f?.bias ?? 0, mape: f?.mape ?? 0 };
  }).sort((a, b) => Math.abs(b.bias) - Math.abs(a.bias));

  const lines = [
    "**SKUs con mayor |Bias| (forecast vs real):**",
    ...ranked.slice(0, 5).map(
      (r, i) =>
        `${i + 1}. **${r.name}** — Bias ${fmtPct(r.bias)} · MAPE ${r.mape.toFixed(1)}%`,
    ),
  ];
  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondAlerts(ctx: ReturnType<typeof buildAssistantContext>): string {
  const a = getAlertSummary();
  if (a.totalOpen === 0) {
    return `No hay alertas activas. El motor no reporta incidencias abiertas.${dataDisclaimer(ctx)}`;
  }

  const lines = [
    `**${a.critical.length} alerta(s) crítica(s)** y **${a.high.length} media(s)** (${a.totalOpen} en total).`,
    "",
    "Prioridad inmediata:",
  ];

  const top = [...a.critical, ...a.high].slice(0, 5);
  for (const alert of top) {
    lines.push(
      `• [${alert.severity.toUpperCase()}] **${alert.sku}** · ${alert.channel}: ${alert.message}`,
    );
  }

  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondModel(ctx: ReturnType<typeof buildAssistantContext>): string {
  const best = getBestModelForSku(ctx.productCode);
  const f = getForecastSummary(ctx.productCode);

  if (!best) {
    return `No puedo recomendar modelo: historia insuficiente para **${ctx.productName}**.${dataDisclaimer(ctx)}`;
  }

  return [
    `Para **${ctx.productName}**, conviene **${best.name}**.`,
    `• MAPE: **${best.mape.toFixed(1)}%**`,
    `• Bias: **${fmtPct(best.bias)}**`,
    f
      ? `• Alineado con el dashboard (modelo activo: ${f.modelName}).`
      : "",
    "",
    "Sugerencia: validar con holdout antes de cerrar consenso S&OP.",
  ]
    .filter(Boolean)
    .join("\n") + dataDisclaimer(ctx);
}

function respondChannel(ctx: ReturnType<typeof buildAssistantContext>): string {
  const rank = getChannelAccuracyRanking();
  if (rank.length === 0) {
    return `Sin datos por canal para comparar accuracy.${dataDisclaimer(ctx)}`;
  }

  const worst = rank[0]!;
  const best = rank[rank.length - 1]!;

  return [
    "**Ranking de canales (DPA Lag-3 promedio):**",
    `• Peor accuracy: **${worst.channel}** (DPA ${worst.avgDpa.toFixed(1)}%, bias ${fmtPct(worst.avgBias)})`,
    `• Mejor accuracy: **${best.channel}** (DPA ${best.avgDpa.toFixed(1)}%)`,
    "",
    "Recomendación: revisar limpieza de outliers y calibrar baseline en el canal débil.",
  ].join("\n") + dataDisclaimer(ctx);
}

function respondInsights(ctx: ReturnType<typeof buildAssistantContext>): string {
  const ins = getInsightSummary();

  const lines = [
    `**Insights · estado actual**`,
    `• Pendientes: **${ins.pending.length}**`,
    `• Aprobados: **${ins.approved.length}**`,
    `• Rechazados: **${ins.rejected.length}**`,
  ];

  if (ins.pending.length > 0) {
    lines.push("", "Pendientes de acción:");
    for (const i of ins.pending.slice(0, 4)) {
      lines.push(`• ${i.area} · ${i.sku} · ${i.evento}`);
    }
  }

  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondFinancial(ctx: ReturnType<typeof buildAssistantContext>): string {
  const fin = getFinancialSummary();

  const lines = [
    "**Resumen financiero (simulación actual):**",
    `• Margen bruto: **${fin.grossMarginPercent.toFixed(1)}%**`,
    `• Revenue proyectado: **$${(fin.projectedRevenue / 1_000_000).toFixed(1)}M**`,
    `• Impacto ajustes vs baseline: **$${(fin.financialImpact / 1_000_000).toFixed(2)}M**`,
  ];

  if (fin.lowMarginSkus.length > 0) {
    lines.push(
      "",
      `SKUs bajo objetivo: **${fin.lowMarginSkus.join("**, **")}**.`,
    );
  } else {
    lines.push("", "Todos los SKUs demo están en línea con el target de margen.");
  }

  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondMbp(ctx: ReturnType<typeof buildAssistantContext>): string {
  const mbp = getMBPSummary();

  const lines = [
    "**MBP · estado del ciclo:**",
    `• Avance: **${mbp.completedPct}%** tareas completadas`,
    `• Atrasadas: **${mbp.overdueCount}**`,
  ];

  if (mbp.overdueTasks.length > 0) {
    lines.push("", "Tareas atrasadas:");
    for (const t of mbp.overdueTasks) {
      lines.push(`• S${t.week} · ${t.title} (${t.owner})`);
    }
  }

  if (mbp.nextMeetings.length > 0) {
    lines.push("", "Próximas reuniones:");
    for (const m of mbp.nextMeetings) {
      lines.push(`• ${m.title} — ${m.date} ${m.time}`);
    }
  }

  return lines.join("\n") + dataDisclaimer(ctx);
}

function respondActions(ctx: ReturnType<typeof buildAssistantContext>): string {
  const actions = getRecommendedActions(ctx.productCode);
  return [
    "**Acciones recomendadas (priorizadas):**",
    ...actions.map(
      (a, i) => `${i + 1}. [${a.priority.toUpperCase()}] ${a.text}`,
    ),
  ].join("\n") + dataDisclaimer(ctx);
}

function respondGeneral(ctx: ReturnType<typeof buildAssistantContext>): string {
  const f = getForecastSummary(ctx.productCode);
  const a = getAlertSummary();

  return [
    "Puedo ayudarte con **riesgo**, **forecast**, **alertas**, **modelos**, **finanzas**, **insights** y **MBP**.",
    "",
    f
      ? `Contexto actual (${ctx.productName}): consenso ${fmtPct(f.consensusVsBasePct)} vs base · ${a.critical.length} alertas críticas.`
      : `SKU activo: **${ctx.productName}**.`,
    "",
    "Probá los chips de sugerencias o preguntá en lenguaje natural.",
  ].join("\n") + dataDisclaimer(ctx);
}

const HANDLERS: Record<
  QuestionIntent,
  (ctx: ReturnType<typeof buildAssistantContext>) => string
> = {
  risk: respondRisk,
  forecast: (ctx) => respondForecast(ctx, false),
  forecast_change: (ctx) => respondForecast(ctx, true),
  alerts: respondAlerts,
  model: respondModel,
  channel_accuracy: respondChannel,
  bias: respondBias,
  stockout: respondStockout,
  insights: respondInsights,
  financial: respondFinancial,
  mbp: respondMbp,
  actions: respondActions,
  general: respondGeneral,
};

export function generateAssistantResponse(
  question: string,
  productCode?: string,
): string {
  const ctx = buildAssistantContext(productCode);
  const intent = analyzeQuestion(question);
  return HANDLERS[intent](ctx);
}

export const QUICK_SUGGESTIONS = [
  "Ver alertas críticas",
  "Explicar forecast",
  "Revisar margen",
  "Próximas tareas MBP",
  "SKUs con mayor Bias",
  "Riesgo de stockout",
] as const;
