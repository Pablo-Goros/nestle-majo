import type {
  CollaborativeInsight,
  ConsensusBreakdown,
  ImpactType,
} from "./types";

export function computeInsightDelta(
  insight: CollaborativeInsight,
  baseline: number,
): number {
  if (insight.impacto_tipo === "porcentaje") {
    return baseline * (insight.impacto_valor / 100);
  }
  return insight.impacto_valor;
}

export function formatImpactDisplay(insight: CollaborativeInsight): string {
  const sign = insight.impacto_valor >= 0 ? "+" : "";
  if (insight.impacto_tipo === "porcentaje") {
    return `${sign}${insight.impacto_valor}%`;
  }
  return `${sign}${insight.impacto_valor}u`;
}

export function parseImpactInput(
  tipo: ImpactType,
  raw: string | number,
): number {
  const n = typeof raw === "number" ? raw : parseFloat(String(raw).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function matchesSku(insight: CollaborativeInsight, skuCode: string, skuName: string): boolean {
  return insight.skuCode === skuCode || insight.sku === skuName;
}

function matchesChannel(insight: CollaborativeInsight, channel?: string): boolean {
  if (!channel) return true;
  return insight.channel === "Todos" || insight.channel === channel;
}

export function computeConsensusBreakdown(
  baseline: number,
  insights: CollaborativeInsight[],
  skuCode: string,
  skuName: string,
  channel?: string,
): ConsensusBreakdown {
  const forSku = insights.filter(
    (i) => matchesSku(i, skuCode, skuName) && matchesChannel(i, channel),
  );

  const approved = forSku.filter((i) => i.estado_aprobacion === "aprobado");
  const pending = forSku.filter((i) => i.estado_aprobacion === "pendiente");

  let marketing = 0;
  let ventas = 0;
  let finanzas = 0;

  for (const ins of approved) {
    const delta = computeInsightDelta(ins, baseline);
    if (ins.area === "Marketing") marketing += delta;
    else if (ins.area === "Ventas") ventas += delta;
    else finanzas += delta;
  }

  const final = Math.round(baseline + marketing + ventas + finanzas);
  const diffVsBaseline = final - baseline;
  const diffPct = baseline === 0 ? 0 : (diffVsBaseline / baseline) * 100;

  return {
    baseline: Math.round(baseline),
    marketing: Math.round(marketing),
    ventas: Math.round(ventas),
    finanzas: Math.round(finanzas),
    final,
    diffVsBaseline: Math.round(diffVsBaseline),
    diffPct,
    approved,
    pending,
  };
}

/** Insights que impactan consenso (aprobados) */
export function getApprovedInsights(
  insights: CollaborativeInsight[],
  skuCode?: string,
): CollaborativeInsight[] {
  return insights.filter((i) => {
    if (i.estado_aprobacion !== "aprobado") return false;
    if (skuCode && i.skuCode !== skuCode) return false;
    return true;
  });
}
