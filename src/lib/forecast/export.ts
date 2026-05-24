import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { ForecastExportContext } from "./buildExport";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function safeFilename(code: string, ext: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `forecast_${code}_${stamp}.${ext}`;
}

export function exportForecastCsv(ctx: ForecastExportContext): void {
  const rows = ctx.weeklyRows.map((r) => ({
    semana: r.semana,
    sku: r.sku,
    sku_codigo: r.skuCode,
    canal: r.canal,
    baseline: r.baseline,
    forecast_final: r.forecastFinal,
    version: ctx.version,
  }));
  const csv = Papa.unparse(rows);
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    safeFilename(ctx.productCode, "csv"),
  );
}

export function exportSapCsv(ctx: ForecastExportContext): void {
  const rows = ctx.weeklyRows.map((r) => ({
    MATERIAL: r.skuCode,
    PLANT: "AR01",
    CUSTOMER: r.canal,
    PERIOD: r.semana,
    FORECAST_QTY: r.forecastFinal,
    UOM: "EA",
    VERSION: ctx.version,
  }));
  const csv = Papa.unparse(rows);
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    `sap_forecast_${ctx.productCode}_${new Date().toISOString().slice(0, 10)}.csv`,
  );
}

export function exportForecastExcel(ctx: ForecastExportContext): void {
  const wb = XLSX.utils.book_new();

  const forecastSheet = XLSX.utils.json_to_sheet(
    ctx.weeklyRows.map((r) => ({
      Semana: r.semana,
      SKU: r.sku,
      Codigo: r.skuCode,
      Canal: r.canal,
      Baseline: r.baseline,
      "Forecast final": r.forecastFinal,
      Version: ctx.version,
    })),
  );
  XLSX.utils.book_append_sheet(wb, forecastSheet, "Forecast final");

  const kpiRows = ctx.kpis
    ? [
        { Metrica: "Demanda base M+1", Valor: ctx.kpis.demandBaseM1 },
        { Metrica: "Demanda consenso M+1", Valor: ctx.kpis.demandConsensusM1 },
        { Metrica: "Consenso vs base %", Valor: ctx.kpis.consensusVsBasePct },
        { Metrica: "MAPE", Valor: ctx.kpis.mape },
        { Metrica: "MAD", Valor: ctx.kpis.mad },
        { Metrica: "RMSE", Valor: ctx.kpis.rmse },
        { Metrica: "Bias %", Valor: ctx.kpis.bias },
        { Metrica: "DPA Lag-3", Valor: ctx.kpis.dpaLag3 },
        { Metrica: "Accuracy", Valor: ctx.kpis.forecastAccuracy },
        { Metrica: "FVA", Valor: ctx.kpis.fva },
        { Metrica: "Tracking signal", Valor: ctx.kpis.trackingSignal },
        { Metrica: "Modelo", Valor: ctx.kpis.modelName },
      ]
    : [{ Metrica: "Sin KPIs", Valor: 0 }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpiRows), "KPIs");

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ctx.alerts.map((a) => ({
        ID: a.id,
        Tipo: a.type,
        Severidad: a.severity,
        Canal: a.channel,
        Mensaje: a.message,
        Recomendacion: a.recommendation,
        Responsable: a.owner,
        Estado: a.status,
      })),
    ),
    "Alertas",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ctx.approvedInsights.map((i) => ({
        Area: i.area,
        Evento: i.evento,
        Canal: i.channel,
        Impacto: `${i.impacto_valor}${i.impacto_tipo === "porcentaje" ? "%" : " u"}`,
        Responsable: i.responsable,
        Inicio: i.fecha_inicio,
        Fin: i.fecha_fin,
      })),
    ),
    "Insights aprobados",
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      ctx.financialRows.length > 0
        ? ctx.financialRows.map((r) => ({
            SKU: r.sku,
            Canal: r.channel,
            "Forecast base": r.forecastBase,
            "Forecast consenso": r.forecastConsensus,
            Ingresos: r.revenue,
            "Impacto financiero": r.financialImpact,
            Margen: r.marginPercent,
            Estado: r.status,
          }))
        : [
            {
              SKU: ctx.productName,
              "Impacto total": ctx.financialKpis.financialImpact,
              "Ingresos proyectados": ctx.financialKpis.projectedRevenue,
              "Margen bruto": ctx.financialKpis.grossMargin,
            },
          ],
    ),
    "Impacto financiero",
  );

  XLSX.writeFile(wb, safeFilename(ctx.productCode, "xlsx"));
}

export function exportErpJson(ctx: ForecastExportContext): void {
  const payload = {
    metadata: {
      exportedAt: new Date().toISOString(),
      sku: ctx.productName,
      skuCode: ctx.productCode,
      version: ctx.version,
      model: ctx.modelName,
      published: ctx.publishState?.published ?? false,
      publishedAt: ctx.publishState?.publishedAt,
      publishedBy: ctx.publishState?.publishedBy,
    },
    forecast: {
      breakdown: {
        baseline: ctx.breakdown.baseline,
        marketing: ctx.breakdown.marketing,
        ventas: ctx.breakdown.ventas,
        finanzas: ctx.breakdown.finanzas,
        final: ctx.breakdown.final,
      },
      weekly: ctx.weeklyRows,
    },
    kpis: ctx.kpis,
    alerts: ctx.alerts,
    financialImpact: {
      aggregate: ctx.financialKpis,
      byChannel: ctx.financialRows,
    },
    version: ctx.versions[0] ?? {
      version: ctx.version,
      estado: ctx.publishState?.published ? "publicado" : "borrador",
    },
  };

  const json = JSON.stringify(payload, null, 2);
  downloadBlob(
    new Blob([json], { type: "application/json;charset=utf-8;" }),
    safeFilename(ctx.productCode, "json"),
  );
}

export function exportAllFormats(ctx: ForecastExportContext): void {
  exportForecastCsv(ctx);
  exportForecastExcel(ctx);
  exportSapCsv(ctx);
  exportErpJson(ctx);
}
