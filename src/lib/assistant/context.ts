import { hasCleanedDemand } from "@/lib/cleaning";
import { hasLoadedDemand } from "@/lib/data";
import { evaluateAlerts } from "@/lib/alerts";
import { getInsights } from "@/lib/insights/store";
import { PRODUCTS } from "@/lib/mock-data";
import type { AssistantContext } from "./types";

export function buildAssistantContext(productCode?: string): AssistantContext {
  const product =
    PRODUCTS.find((p) => p.code === productCode) ?? PRODUCTS[0]!;

  return {
    productCode: product.code,
    productName: product.name,
    usingLoadedDemand: hasLoadedDemand(),
    usingCleanedSeries: hasCleanedDemand(product.code),
    alerts: evaluateAlerts().alerts,
    insights: getInsights(),
  };
}

export function dataDisclaimer(ctx: AssistantContext): string {
  if (ctx.usingLoadedDemand || ctx.usingCleanedSeries) return "";
  return "\n\n_No hay datos cargados todavía. Estoy usando datos demo para generar esta recomendación._";
}
