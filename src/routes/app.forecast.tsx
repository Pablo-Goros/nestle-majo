import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, LockedNotice } from "@/components/ui-bits";
import { CLEANING_CHANGED_EVENT, hasCleanedDemand } from "@/lib/cleaning";
import { DATA_CHANGED_EVENT, hasLoadedDemand } from "@/lib/data";
import { getHistoryActuals, getSkuBundle } from "@/lib/mockData";
import {
  runAllModels,
  selectBestModel,
  type ForecastModelOptions,
  type ForecastModelResult,
} from "@/lib/forecasting";
import { generateFallbackSeries } from "@/lib/dataNormalization";
import { useProduct } from "@/lib/product-context";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from "recharts";
import { useAuth } from "@/lib/auth";
import {
  buildForecastExportContext,
  exportForecastCsv,
  exportForecastExcel,
  exportSapCsv,
  exportErpJson,
} from "@/lib/forecast";
import { Play, Download } from "lucide-react";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export const Route = createFileRoute("/app/forecast")({ component: Forecast });

function shortModelName(name: string): string {
  return name.split(" ").slice(0, 2).join(" ");
}

function runForecastPipeline(
  productCode: string,
  options?: ForecastModelOptions,
): { results: ForecastModelResult[]; best: ForecastModelResult } | null {
  const bundle = getSkuBundle(productCode);
  if (!bundle) return null;

  const historyActuals = getHistoryActuals(productCode);
  const baselineHistory = historyActuals.length >= 3
    ? historyActuals
    : bundle.monthlyHistory
        .map((m) => (m.actual != null ? m.actual : m.baseline))
        .filter(Number.isFinite);

  const history = baselineHistory.length >= 3
    ? baselineHistory
    : generateFallbackSeries(baselineHistory, 3);

  const results = runAllModels(history, options);
  const best = selectBestModel(history, options);

  console.info("Forecast pipeline:", {
    productCode,
    historyLength: history.length,
    selectedModel: best.modelName,
  });

  return { results, best };
}

function Forecast() {
  const { product } = useProduct();
  const { canEdit } = useAuth();
  const editable = canEdit("forecast");

  const horizonRef = useRef<HTMLInputElement>(null);
  const trainingRef = useRef<HTMLInputElement>(null);

  const [modelResults, setModelResults] = useState<ForecastModelResult[]>([]);
  const [bestModel, setBestModel] = useState<ForecastModelResult | null>(null);
  const [activeModel, setActiveModel] = useState<ForecastModelResult | null>(null);
  const [dataTick, setDataTick] = useState(0);

  useEffect(() => {
    const refresh = () => setDataTick((t) => t + 1);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener(CLEANING_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener(CLEANING_CHANGED_EVENT, refresh);
    };
  }, []);

  const bundle = useMemo(
    () => getSkuBundle(product.code),
    [product.code, dataTick],
  );

  const readOptions = useCallback((): ForecastModelOptions => {
    const horizonRaw = Number(horizonRef.current?.value);
    const horizon = Number.isFinite(horizonRaw) && horizonRaw > 0
      ? Math.min(Math.round(horizonRaw), 12)
      : 3;
    const trainingRaw = Number(trainingRef.current?.value);
    const seasonLength =
      Number.isFinite(trainingRaw) && trainingRaw >= 12
        ? 12
        : 12;
    return { horizon, seasonLength };
  }, []);

  const executeModels = useCallback(
    (showToast = false) => {
      const pipeline = runForecastPipeline(product.code, readOptions());
      if (!pipeline) {
        toast.error("Datos históricos insuficientes para correr modelos.");
        return;
      }
      setModelResults(pipeline.results);
      setBestModel(pipeline.best);
      setActiveModel(pipeline.best);
      if (showToast) {
        toast.success(`Corriendo ${pipeline.results.length} modelos…`);
      }
    },
    [product.code, readOptions, dataTick],
  );

  useEffect(() => {
    executeModels(false);
  }, [executeModels]);

  const comparisonData = useMemo(
    () =>
      modelResults.map((m) => ({
        name: shortModelName(m.modelName),
        mape: Number(m.mape.toFixed(1)),
        isBest: m.modelName === bestModel?.modelName,
      })),
    [modelResults, bestModel],
  );

  const exportCtx = useMemo(
    () =>
      buildForecastExportContext(
        product.code,
        product.name,
        activeModel?.modelName ?? bestModel?.modelName,
      ),
    [product.code, product.name, activeModel, bestModel, dataTick],
  );

  const handleExport = (type: "csv" | "excel" | "sap" | "erp") => {
    if (!exportCtx) {
      toast.error("No hay datos de forecast para exportar.");
      return;
    }
    try {
      if (type === "csv") exportForecastCsv(exportCtx);
      else if (type === "excel") exportForecastExcel(exportCtx);
      else if (type === "sap") exportSapCsv(exportCtx);
      else exportErpJson(exportCtx);
      const labels = { csv: "CSV", excel: "Excel", sap: "SAP", erp: "ERP JSON" };
      toast.success(`Exportado a ${labels[type]}`);
    } catch {
      toast.error("Error al exportar el forecast.");
    }
  };

  const residualData = useMemo(() => {
    if (!bundle || !activeModel) return [];
    return bundle.monthlyHistory
      .map((m, i) => {
        if (m.actual == null) return null;
        const fitted = activeModel.fittedValues[i];
        if (fitted == null || !Number.isFinite(fitted)) return null;
        return {
          mes: m.month,
          residual: Math.round(m.actual - fitted),
        };
      })
      .filter((r): r is { mes: string; residual: number } => r != null);
  }, [bundle, activeModel]);

  return (
    <div>
      <PageHeader
        title="Forecast"
        subtitle={`Comparación de modelos · ${product.name}${hasLoadedDemand() ? " · datos cargados" : ""}${hasCleanedDemand(product.code) ? " · serie limpia" : ""}`}
        actions={
          <>
            {activeModel && (
              <Badge tone="info">Modelo activo: {activeModel.modelName}</Badge>
            )}
            <button
              disabled={!editable}
              onClick={() => executeModels(true)}
              className="h-9 px-3 rounded-md bg-nestle-red text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Play className="size-4" />
              Correr todos
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="h-9 px-3 rounded-md border text-sm flex items-center gap-2"
            >
              <Download className="size-4" />
              Excel
            </button>
            <button
              onClick={() => handleExport("csv")}
              className="h-9 px-3 rounded-md border text-sm"
            >
              CSV
            </button>
            <button
              onClick={() => handleExport("sap")}
              className="h-9 px-3 rounded-md border text-sm"
            >
              SAP
            </button>
            <button
              onClick={() => handleExport("erp")}
              className="h-9 px-3 rounded-md border text-sm"
            >
              ERP
            </button>
          </>
        }
      />

      {!editable && (
        <div className="mb-4">
          <LockedNotice feature="forecast" />
        </div>
      )}

      <Card title="Parámetros" className="mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <label className="text-sm">
            Horizonte (semanas)
            <input
              ref={horizonRef}
              type="number"
              defaultValue={13}
              className="mt-1 w-full h-9 px-2 rounded border"
            />
          </label>
          <label className="text-sm">
            Intervalo de confianza
            <select className="mt-1 w-full h-9 px-2 rounded border">
              <option>80%</option>
              <option>90%</option>
              <option>95%</option>
            </select>
          </label>
          <label className="text-sm">
            Ventana entrenamiento (meses)
            <input
              ref={trainingRef}
              type="number"
              defaultValue={24}
              className="mt-1 w-full h-9 px-2 rounded border"
            />
          </label>
        </div>
      </Card>

      {modelResults.length === 0 ? (
        <Card title="Modelos estadísticos" className="mb-6">
          <p className="text-sm text-muted-foreground">
            Cargando modelos o sin datos históricos para {product.name}.
          </p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {modelResults.map((m) => {
            const isBest = m.modelName === bestModel?.modelName;
            const isActive = m.modelName === activeModel?.modelName;
            return (
              <button
                key={m.modelName}
                type="button"
                onClick={() => setActiveModel(m)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  isBest
                    ? "border-nestle-red ring-1 ring-nestle-red/40 bg-nestle-red/5"
                    : isActive
                      ? "border-nestle-blue ring-1 ring-nestle-blue/30"
                      : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium text-sm">{m.modelName}</div>
                  <div className="flex items-center gap-1 shrink-0">
                    {isBest && <Badge tone="bad">Mejor</Badge>}
                    {isActive && !isBest && <Badge tone="info">Activo</Badge>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">MAPE</div>
                    <div className="font-semibold">{m.mape.toFixed(1)}%</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">MAD</div>
                    <div className="font-semibold">{Math.round(m.mad)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">RMSE</div>
                    <div className="font-semibold">{Math.round(m.rmse)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bias</div>
                    <div className="font-semibold">{m.bias.toFixed(1)}%</div>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-2">
                  {m.recommendation}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Comparación de modelos (MAPE %)"
          actions={
            bestModel ? (
              <span className="text-xs text-muted-foreground">
                Mejor: {bestModel.modelName}
              </span>
            ) : undefined
          }
        >
          {comparisonData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                />
                <YAxis />
                <Tooltip formatter={(v: number) => [`${v}%`, "MAPE"]} />
                <Bar dataKey="mape" radius={[4, 4, 0, 0]}>
                  {comparisonData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.isBest ? "#dc2626" : "#94a3b8"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">Sin datos de comparación.</p>
          )}
        </Card>
        <Card
          title="Residuales"
          actions={
            activeModel ? (
              <span className="text-xs text-muted-foreground">{activeModel.modelName}</span>
            ) : undefined
          }
        >
          {residualData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={residualData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <ReferenceLine y={0} stroke="#999" />
                <Line dataKey="residual" stroke="#1f6fbf" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground">
              Seleccioná un modelo para ver residuales.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
