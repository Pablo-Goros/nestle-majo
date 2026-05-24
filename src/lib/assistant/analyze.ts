import type { QuestionIntent } from "./types";

function norm(q: string): string {
  return q
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function analyzeQuestion(question: string): QuestionIntent {
  const q = norm(question);

  if (
    q.includes("accion") ||
    q.includes("recomend") ||
    q.includes("prioridad") ||
    q.includes("que hago")
  ) {
    return "actions";
  }

  if (
    q.includes("mbp") ||
    q.includes("tarea") && (q.includes("atras") || q.includes("reunion"))
  ) {
    return "mbp";
  }

  if (
    q.includes("margen") ||
    q.includes("finanz") ||
    q.includes("revenue") ||
    q.includes("costo")
  ) {
    return "financial";
  }

  if (
    q.includes("insight") ||
    q.includes("pendiente") && q.includes("aprob")
  ) {
    return "insights";
  }

  if (
    q.includes("canal") &&
    (q.includes("accuracy") ||
      q.includes("exactitud") ||
      q.includes("dpa") ||
      q.includes("peor"))
  ) {
    return "channel_accuracy";
  }

  if (q.includes("modelo") || q.includes("mape") || q.includes("sarima")) {
    return "model";
  }

  if (q.includes("stockout")) {
    return "stockout";
  }

  if (q.includes("bias")) {
    return "bias";
  }

  if (q.includes("alerta") || q.includes("critica")) {
    return "alerts";
  }

  if (
    (q.includes("forecast") || q.includes("consenso") || q.includes("baseline")) &&
    (q.includes("subio") ||
      q.includes("subió") ||
      q.includes("aument") ||
      q.includes("por que") ||
      q.includes("porqué"))
  ) {
    return "forecast_change";
  }

  if (
    q.includes("forecast") ||
    q.includes("consenso") ||
    q.includes("baseline") ||
    q.includes("demanda")
  ) {
    return "forecast";
  }

  if (
    q.includes("riesgo") ||
    q.includes("stockout") ||
    (q.includes("sku") &&
      (q.includes("mas") || q.includes("mayor") || q.includes("peor")))
  ) {
    return "risk";
  }

  return "general";
}
