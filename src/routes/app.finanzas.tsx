import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, KPI, Badge, Semaforo } from "@/components/ui-bits";
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
  Legend,
} from "recharts";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildFinancialDashboard,
  formatCurrency,
  formatPct,
  getFinancialSimulationParams,
  saveFinancialSimulationParams,
  FINANCIAL_SIM_CHANGED_EVENT,
  type FinancialScenario,
  type FinancialSimulationParams,
} from "@/lib/financial";
import { INSIGHTS_CHANGED_EVENT } from "@/lib/insights/store";

export const Route = createFileRoute("/app/finanzas")({ component: Finanzas });

function Finanzas() {
  const [params, setParams] = useState<FinancialSimulationParams>(() =>
    getFinancialSimulationParams(),
  );
  const [refresh, setRefresh] = useState(0);

  const persist = useCallback((next: FinancialSimulationParams) => {
    setParams(next);
    saveFinancialSimulationParams(next);
  }, []);

  useEffect(() => {
    const onInsights = () => setRefresh((n) => n + 1);
    const onSim = () => setParams(getFinancialSimulationParams());
    window.addEventListener(INSIGHTS_CHANGED_EVENT, onInsights);
    window.addEventListener(FINANCIAL_SIM_CHANGED_EVENT, onSim);
    return () => {
      window.removeEventListener(INSIGHTS_CHANGED_EVENT, onInsights);
      window.removeEventListener(FINANCIAL_SIM_CHANGED_EVENT, onSim);
    };
  }, []);

  const data = useMemo(
    () => buildFinancialDashboard(params),
    [params, refresh],
  );

  const { kpis, rows, marginChart, dollarSeries, rawMaterialSeries, alerts } =
    data;

  const topAlert = alerts[0];

  const patch = (partial: Partial<FinancialSimulationParams>) => {
    persist({ ...params, ...partial });
  };

  const marginTone =
    kpis.grossMarginPercent >= 25
      ? "good"
      : kpis.grossMarginPercent >= 20
        ? "warn"
        : "bad";

  const impactTone = kpis.financialImpact >= 0 ? "good" : "bad";

  return (
    <div>
      <PageHeader
        title="Finanzas"
        subtitle="Dashboard financiero, escenarios y simulación"
      />

      <div className="grid md:grid-cols-4 gap-3 mb-6">
        <KPI
          label="Revenue proyectado"
          value={formatCurrency(kpis.projectedRevenue)}
          tone={impactTone}
        />
        <KPI
          label="Costo proyectado"
          value={formatCurrency(kpis.projectedCost)}
        />
        <KPI
          label="Margen bruto"
          value={formatCurrency(kpis.grossMargin)}
          hint={`${kpis.grossMarginPercent.toFixed(1)}%`}
          tone={marginTone}
        />
        <KPI
          label="Impacto ajustes"
          value={formatCurrency(kpis.financialImpact)}
          hint={formatPct(kpis.variationVsBaselinePct)}
          tone={impactTone}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-6">
        <KPI
          label="Margen %"
          value={`${kpis.grossMarginPercent.toFixed(1)}%`}
          hint="Promedio ponderado"
          tone={marginTone}
        />
        <KPI
          label="Variación vs baseline"
          value={formatPct(kpis.variationVsBaselinePct)}
          tone={kpis.variationVsBaselinePct >= 0 ? "good" : "bad"}
        />
        <KPI
          label="SKUs margen bajo"
          value={String(kpis.lowMarginSkuCount)}
          hint="Bajo target o crítico"
          tone={kpis.lowMarginSkuCount > 0 ? "warn" : "good"}
        />
      </div>

      <Card title="Escenarios" className="mb-6">
        <div className="flex gap-2">
          {(["optimista", "base", "pesimista"] as const).map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => patch({ scenario: e as FinancialScenario })}
              className={`px-4 py-2 rounded-md text-sm capitalize ${params.scenario === e ? "bg-nestle-red text-white" : "border"}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mt-4">
          <div>
            <SimSlider
              label="Variación dólar"
              value={params.dollarVariationPct}
              min={-20}
              max={30}
              onChange={(v) => patch({ dollarVariationPct: v })}
            />
          </div>
          <div>
            <SimSlider
              label="Inflación mensual"
              value={params.inflationPct}
              min={1}
              max={15}
              onChange={(v) => patch({ inflationPct: v })}
            />
          </div>
          <div>
            <SimSlider
              label="Ajuste precio"
              value={params.priceChangePct}
              min={-5}
              max={20}
              onChange={(v) => patch({ priceChangePct: v })}
            />
          </div>
          <div>
            <SimSlider
              label="Costo materia prima"
              value={params.rawMaterialCostPct}
              min={0}
              max={30}
              onChange={(v) => patch({ rawMaterialCostPct: v })}
            />
          </div>
          <div>
            <SimSlider
              label="Elasticidad consumo"
              value={params.demandElasticityPct}
              min={-30}
              max={10}
              onChange={(v) => patch({ demandElasticityPct: v })}
            />
          </div>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-6">
        <Card title="Margen por SKU">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={marginChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="sku" tick={{ fontSize: 11 }} />
              <YAxis unit="%" />
              <Tooltip />
              <Bar dataKey="margen" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="target" fill="#16a34a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Evolución del dólar oficial">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={dollarSeries}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mes" />
              <YAxis />
              <Tooltip />
              <Line dataKey="valor" stroke="#1f6fbf" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="Costo materias primas (índice base 100)" className="mb-6">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={rawMaterialSeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="mes" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line dataKey="cafe" name="Café" stroke="#8b4513" strokeWidth={2} />
            <Line dataKey="cacao" name="Cacao" stroke="#dc2626" strokeWidth={2} />
            <Line dataKey="leche" name="Leche" stroke="#1f6fbf" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
        {topAlert ? (
          <div className="mt-3 text-sm flex items-center gap-2 flex-wrap">
            <Badge tone={topAlert.severity === "alta" ? "bad" : "warn"}>
              Alerta financiera
            </Badge>
            <span className="text-muted-foreground">{topAlert.message}</span>
          </div>
        ) : (
          <div className="mt-3 text-sm text-muted-foreground">
            Sin alertas financieras activas con los parámetros actuales.
          </div>
        )}
      </Card>

      {alerts.length > 0 && (
        <Card title={`Alertas financieras (${alerts.length})`} className="mb-6">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="flex items-start gap-2 p-2 rounded-md border text-sm"
              >
                <Badge tone={a.severity === "alta" ? "bad" : "warn"}>
                  {a.severity}
                </Badge>
                <span>
                  {a.sku} · {a.channel}: {a.message}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Detalle por SKU y canal">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                {[
                  "SKU",
                  "Canal",
                  "Consenso",
                  "Precio",
                  "Costo",
                  "Margen %",
                  "Revenue",
                  "Estado",
                ].map((h) => (
                  <th key={h} className="py-2 px-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={`${r.skuCode}-${r.channel}`}
                  className="border-b last:border-0"
                >
                  <td className="py-2 px-2 font-medium">{r.sku}</td>
                  <td className="py-2 px-2">{r.channel}</td>
                  <td className="py-2 px-2">
                    {r.forecastConsensus.toLocaleString("es-AR")} u
                  </td>
                  <td className="py-2 px-2">
                    ${r.unitPrice.toLocaleString("es-AR")}
                  </td>
                  <td className="py-2 px-2">
                    ${r.unitCost.toLocaleString("es-AR")}
                  </td>
                  <td
                    className={`py-2 px-2 ${r.marginPercent < r.marginTarget ? "text-destructive" : "text-success"}`}
                  >
                    {r.marginPercent.toFixed(1)}%
                  </td>
                  <td className="py-2 px-2">{formatCurrency(r.revenue)}</td>
                  <td className="py-2 px-2">
                    <Semaforo estado={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function SimSlider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const display = `${value > 0 ? "+" : ""}${value}%`;
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        className="w-full"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="text-sm font-medium">{display}</div>
    </div>
  );
}

