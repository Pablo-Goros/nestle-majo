import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, KPI, LockedNotice } from "@/components/ui-bits";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { useAuth } from "@/lib/auth";
import { useProduct } from "@/lib/product-context";
import { DATA_CHANGED_EVENT, hasLoadedDemand } from "@/lib/data";
import {
  EVENT_OPTIONS,
  buildCleaningSummary,
  buildDemandPointsForSku,
  detectOutliers,
  recomputeRowCleanDemand,
  saveSkuCleaning,
  getSkuCleaning,
  CLEANING_CHANGED_EVENT,
  type CleaningRow,
  type EventKind,
  type EventLabel,
  type OutlierTreatment,
} from "@/lib/cleaning";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/limpieza")({ component: Limpieza });

const TREATMENTS: { value: OutlierTreatment; label: string }[] = [
  { value: "excluir", label: "Excluir del baseline" },
  { value: "suavizar", label: "Suavizar (MA)" },
  { value: "mantener", label: "Mantener real" },
  { value: "mediana", label: "Mediana histórica" },
];

function Limpieza() {
  const { canEdit } = useAuth();
  const editable = canEdit("limpieza");
  const { product } = useProduct();

  const [threshold, setThreshold] = useState(3);
  const [dataTick, setDataTick] = useState(0);
  const [rows, setRows] = useState<CleaningRow[]>([]);

  useEffect(() => {
    const points = buildDemandPointsForSku(product.code);
    if (points.length === 0) {
      setRows([]);
      return;
    }
    const stored = getSkuCleaning(product.code);
    if (stored) {
      setThreshold(stored.threshold);
      setRows(stored.rows);
      return;
    }
    setRows(detectOutliers(points, threshold));
  }, [product.code, dataTick]);

  useEffect(() => {
    const refresh = () => setDataTick((t) => t + 1);
    window.addEventListener(DATA_CHANGED_EVENT, refresh);
    window.addEventListener(CLEANING_CHANGED_EVENT, refresh);
    return () => {
      window.removeEventListener(DATA_CHANGED_EVENT, refresh);
      window.removeEventListener(CLEANING_CHANGED_EVENT, refresh);
    };
  }, []);

  const summary = useMemo(() => buildCleaningSummary(rows), [rows]);
  const { kpis, chart } = summary;

  const chartData = chart.map((c) => ({
    mes: c.period,
    original: c.original,
    limpio: c.limpio,
  }));

  const updateRow = (id: string, patch: Partial<CleaningRow>) => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === id ? { ...r, ...patch } : r));
      return next.map((r) => recomputeRowCleanDemand(r, next));
    });
  };

  const onThresholdChange = (value: number) => {
    setThreshold(value);
    const points = buildDemandPointsForSku(product.code);
    if (points.length > 0) setRows(detectOutliers(points, value));
  };

  const runDetection = () => {
    const points = buildDemandPointsForSku(product.code);
    if (points.length === 0) {
      toast.error("No hay serie de demanda para este SKU.");
      return;
    }
    setRows(detectOutliers(points, threshold));
    toast.success(`Detección con |Z| > ${threshold}`);
  };

  const applyCleaning = () => {
    if (!editable || rows.length === 0) return;
    saveSkuCleaning(product.code, threshold, rows);
    toast.success("Serie limpia guardada · Forecast y Dashboard actualizados");
  };

  return (
    <div>
      <PageHeader
        title="Limpieza de outliers"
        subtitle={`Detección estadística (Z-score) · ${product.name}${hasLoadedDemand() ? " · datos cargados" : " · mockData"}`}
      />
      {!editable && (
        <div className="mb-4">
          <LockedNotice feature="la limpieza de datos" />
        </div>
      )}

      <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <KPI label="Outliers" value={String(kpis.outlierCount)} tone="warn" />
        <KPI
          label="% afectado"
          value={`${kpis.affectedPct.toFixed(1)}%`}
          tone={kpis.affectedPct > 10 ? "bad" : "default"}
        />
        <KPI label="Mayor pico (Z)" value={kpis.peakZ.toFixed(1)} tone="bad" />
        <KPI label="Mayor valle (Z)" value={kpis.valleyZ.toFixed(1)} tone="warn" />
        <KPI
          label="Sin clasificar"
          value={String(kpis.unclassifiedCount)}
          tone={kpis.unclassifiedCount > 0 ? "warn" : "good"}
        />
        <KPI
          label="Impacto baseline"
          value={`${kpis.baselineImpactPct.toFixed(1)}%`}
          hint="vs original"
          tone="default"
        />
      </div>

      <Card className="mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Umbral Z-score (2 – 4)
            </div>
            <input
              type="range"
              min={2}
              max={4}
              step={0.1}
              value={threshold}
              disabled={!editable}
              onChange={(e) => onThresholdChange(parseFloat(e.target.value))}
              className="w-48"
            />
            <div className="text-sm font-medium mt-1">{threshold.toFixed(1)}</div>
          </div>
          <button
            type="button"
            disabled={!editable}
            onClick={runDetection}
            className="h-9 px-4 rounded-md border text-sm disabled:opacity-50"
          >
            Redetectar outliers
          </button>
          <button
            type="button"
            disabled={!editable || rows.length === 0}
            onClick={applyCleaning}
            className="h-9 px-4 rounded-md bg-nestle-green text-white text-sm disabled:opacity-50"
          >
            Guardar serie limpia
          </button>
        </div>
      </Card>

      <Card title="Antes / después de limpieza" className="mb-6">
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin puntos de demanda. Cargá datos en Datos o elegí otro SKU.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                dataKey="original"
                name="Original (con outliers)"
                stroke="#dc2626"
                strokeWidth={2}
              />
              <Line
                dataKey="limpio"
                name="Limpio"
                stroke="#16a34a"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        <div className="text-xs text-muted-foreground mt-2">
          Z = (demanda − promedio) / desviación estándar. Se marca outlier si |Z| &gt;{" "}
          {threshold.toFixed(1)}.
        </div>
      </Card>

      <Card title="Detalle por semana, SKU y canal">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                {[
                  "Semana",
                  "SKU",
                  "Canal",
                  "Original",
                  "Limpia",
                  "Z-score",
                  "Estado",
                  "Evento",
                  "Tipo",
                  "Tratamiento",
                ].map((h) => (
                  <th key={h} className="py-2 px-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="py-6 text-center text-muted-foreground"
                  >
                    No hay registros para analizar.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="py-2 px-2 font-medium">{r.week}</td>
                    <td className="py-2 px-2">{r.skuName}</td>
                    <td className="py-2 px-2">{r.channel}</td>
                    <td className="py-2 px-2">{r.originalDemand}</td>
                    <td className="py-2 px-2 font-medium">{r.cleanDemand}</td>
                    <td className="py-2 px-2">
                      <Badge
                        tone={
                          Math.abs(r.zScore) > threshold
                            ? "bad"
                            : Math.abs(r.zScore) > 2
                              ? "warn"
                              : "good"
                        }
                      >
                        {r.zScore.toFixed(1)}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <Badge
                        tone={
                          r.status === "OK"
                            ? "good"
                            : r.status === "Limpiado"
                              ? "info"
                              : "warn"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={!editable || !r.isOutlier}
                        value={r.eventLabel}
                        onChange={(e) =>
                          updateRow(r.id, {
                            eventLabel: e.target.value as EventLabel | "",
                          })
                        }
                        className="h-7 text-xs border rounded px-1 max-w-[140px] disabled:opacity-50"
                      >
                        <option value="">—</option>
                        {EVENT_OPTIONS.map((ev) => (
                          <option key={ev} value={ev}>
                            {ev}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={!editable || !r.isOutlier}
                        value={r.eventKind}
                        onChange={(e) =>
                          updateRow(r.id, {
                            eventKind: e.target.value as EventKind,
                          })
                        }
                        className="h-7 text-xs border rounded px-1 disabled:opacity-50"
                      >
                        <option value="estructural">Estructural</option>
                        <option value="coyuntural">Coyuntural</option>
                      </select>
                    </td>
                    <td className="py-2 px-2">
                      <select
                        disabled={!editable || !r.isOutlier}
                        value={r.treatment}
                        onChange={(e) =>
                          updateRow(r.id, {
                            treatment: e.target.value as OutlierTreatment,
                          })
                        }
                        className="h-7 text-xs border rounded px-1 max-w-[160px] disabled:opacity-50"
                      >
                        {TREATMENTS.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
