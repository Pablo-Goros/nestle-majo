import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, KPI, LockedNotice } from "@/components/ui-bits";
import { useProduct } from "@/lib/product-context";
import { getSkuBundle } from "@/lib/mockData";
import { buildDashboardData } from "@/lib/dashboard/compute";
import {
  buildForecastExportContext,
  exportForecastCsv,
  exportForecastExcel,
  exportSapCsv,
  exportErpJson,
} from "@/lib/forecast";
import {
  useInsights,
  computeConsensusBreakdown,
  computeInsightDelta,
  formatImpactDisplay,
  canApproveReject,
  canPublishForecast,
  canEditPublishedForecast,
  canOverridePublishBlockers,
  validatePublishReadiness,
} from "@/lib/insights";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, Send, History, Download } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/app/consenso")({ component: Consenso });

function formatAuditTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function Consenso() {
  const { product } = useProduct();
  const { user, canEdit } = useAuth();
  const role = user?.role ?? "marketing";
  const editable = canEdit("consenso");
  const canApprove = canApproveReject(role);
  const canPublish = canPublishForecast(role);
  const canEditPublished = canEditPublishedForecast(role);
  const canOverride = canOverridePublishBlockers(role);

  const [publishOpen, setPublishOpen] = useState(false);
  const [overrideBlockers, setOverrideBlockers] = useState(false);

  const {
    insights,
    auditLog,
    approveInsight,
    rejectInsight,
    publishForecast,
    getPublishState,
    getPublishedVersions,
    isForecastPublished,
  } = useInsights();

  const bundle = useMemo(() => getSkuBundle(product.code), [product.code]);
  const dashboard = useMemo(
    () => buildDashboardData(product.code),
    [product.code, insights],
  );

  const baseline = useMemo(() => {
    if (!bundle) return 0;
    return bundle.weeklyForecast.reduce((acc, w) => acc + w.baseline, 0);
  }, [bundle]);

  const breakdown = useMemo(
    () =>
      computeConsensusBreakdown(
        baseline,
        insights,
        product.code,
        product.name,
      ),
    [baseline, insights, product.code, product.name],
  );

  const publishState = getPublishState(product.code);
  const published = isForecastPublished(product.code);
  const versions = getPublishedVersions(product.code);
  const isLocked = published && !canEditPublished;

  const publishValidation = useMemo(
    () =>
      validatePublishReadiness(product.code, insights, {
        role,
        override: overrideBlockers,
      }),
    [product.code, insights, role, overrideBlockers],
  );

  const skuAudit = useMemo(
    () =>
      auditLog.filter((a) => !a.skuCode || a.skuCode === product.code),
    [auditLog, product.code],
  );

  const exportCtx = useMemo(
    () =>
      buildForecastExportContext(
        product.code,
        product.name,
        dashboard?.kpis.modelName,
      ),
    [product.code, product.name, dashboard?.kpis.modelName, insights, publishState],
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

  const handleApprove = (id: string) => {
    if (!user || !canApprove || isLocked) return;
    approveInsight(id, user.name);
    toast.success("Aprobado");
  };

  const handleReject = (id: string) => {
    if (!user || !canApprove || isLocked) return;
    rejectInsight(id, user.name);
    toast.error("Rechazado");
  };

  const handleConfirmPublish = () => {
    if (!user || !canPublish) return;
    if (!publishValidation.canPublish) {
      toast.error(publishValidation.blockers[0] ?? "No se puede publicar");
      return;
    }

    const result = publishForecast(
      {
        skuCode: product.code,
        skuName: product.name,
        canal: "Todos",
        usuario: user.name,
        baseline: breakdown.baseline,
        ajustesMarketing: breakdown.marketing,
        ajustesVentas: breakdown.ventas,
        ajustesFinanzas: breakdown.finanzas,
        forecastFinal: breakdown.final,
        modeloUsado: dashboard?.kpis.modelName ?? "Baseline estadístico",
        override: overrideBlockers,
      },
      role,
    );

    setPublishOpen(false);
    setOverrideBlockers(false);

    if (!result.ok) {
      toast.error(result.errors[0] ?? "No se pudo publicar");
      return;
    }

    toast.success(
      `Forecast ${result.state.version} publicado · ${user.name} · ${formatAuditTime(result.state.publishedAt ?? "")}`,
    );
  };

  const fmtDelta = (n: number) =>
    n >= 0 ? `+${n.toLocaleString("es-AR")}` : n.toLocaleString("es-AR");

  return (
    <div>
      <PageHeader
        title="Consenso S&OP"
        subtitle={`Versión activa: ${publishState?.version ?? "v3.2"} · ${product.name}`}
        actions={
          <>
            {published && (
              <Badge tone="good">
                Publicado · {publishState?.publishedBy} ·{" "}
                {publishState?.publishedAt
                  ? formatAuditTime(publishState.publishedAt)
                  : ""}
              </Badge>
            )}
            <button
              onClick={() => handleExport("csv")}
              className="h-9 px-3 rounded-md border text-sm flex items-center gap-2"
            >
              <Download className="size-4" />
              CSV
            </button>
            <button
              onClick={() => handleExport("excel")}
              className="h-9 px-3 rounded-md border text-sm"
            >
              Excel
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
            <button
              disabled={!editable || !canPublish}
              onClick={() => setPublishOpen(true)}
              className="h-9 px-3 rounded-md bg-nestle-green text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="size-4" />
              Publish Forecast
            </button>
          </>
        }
      />
      {!editable && (
        <div className="mb-4">
          <LockedNotice feature="consenso" />
        </div>
      )}
      {isLocked && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Forecast publicado — edición bloqueada. Solo Demand Planner puede modificar esta versión.
        </div>
      )}

      <Card title="Fórmula del consenso" className="mb-6">
        <div className="rounded-md bg-muted p-4 font-mono text-sm text-center">
          Forecast final = baseline + Δ marketing + Δ ventas + Δ finanzas
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
          <KPI label="Baseline" value={breakdown.baseline.toLocaleString("es-AR")} />
          <KPI
            label="Δ Marketing"
            value={fmtDelta(breakdown.marketing)}
            tone={breakdown.marketing >= 0 ? "good" : "warn"}
          />
          <KPI
            label="Δ Ventas"
            value={fmtDelta(breakdown.ventas)}
            tone={breakdown.ventas >= 0 ? "good" : "warn"}
          />
          <KPI
            label="Δ Finanzas"
            value={fmtDelta(breakdown.finanzas)}
            tone={breakdown.finanzas >= 0 ? "good" : "warn"}
          />
          <KPI
            label="Consenso final"
            value={breakdown.final.toLocaleString("es-AR")}
            tone="good"
            hint={`${breakdown.diffPct >= 0 ? "+" : ""}${breakdown.diffPct.toFixed(1)}% vs baseline`}
          />
        </div>
      </Card>

      <Card title="Trazabilidad — ajustes aprobados" className="mb-6">
        {breakdown.approved.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No hay insights aprobados para este SKU.
          </p>
        ) : (
          <div className="space-y-2">
            {breakdown.approved.map((ins) => {
              const delta = Math.round(computeInsightDelta(ins, baseline));
              return (
                <div
                  key={ins.id}
                  className="flex items-center justify-between p-3 rounded-md border text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Badge
                      tone={
                        ins.area === "Marketing"
                          ? "info"
                          : ins.area === "Ventas"
                            ? "good"
                            : "warn"
                      }
                    >
                      {ins.area}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {ins.evento} · {ins.sku}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ins.channel} · {ins.cliente} · {formatImpactDisplay(ins)} →{" "}
                        {fmtDelta(delta)} u
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {ins.responsable}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Ajustes pendientes de aprobación" className="mb-6">
        {breakdown.pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ajustes pendientes.</p>
        ) : (
          <div className="space-y-2">
            {breakdown.pending.map((ins) => (
              <div
                key={ins.id}
                className="flex items-center justify-between p-3 rounded-md border"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    tone={
                      ins.area === "Marketing"
                        ? "info"
                        : ins.area === "Ventas"
                          ? "good"
                          : "warn"
                    }
                  >
                    {ins.area}
                  </Badge>
                  <div>
                    <div className="text-sm font-medium">
                      {ins.evento} · {ins.sku}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Impacto: {formatImpactDisplay(ins)} · {ins.justificacion}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={!editable || !canApprove || isLocked}
                    onClick={() => handleApprove(ins.id)}
                    className="h-8 px-3 rounded bg-success text-white text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                    Aprobar
                  </button>
                  <button
                    disabled={!editable || !canApprove || isLocked}
                    onClick={() => handleReject(ins.id)}
                    className="h-8 px-3 rounded bg-destructive text-white text-xs flex items-center gap-1 disabled:opacity-50"
                  >
                    <X className="size-3.5" />
                    Rechazar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Versiones del forecast">
          <div className="space-y-2">
            <div className="flex items-start justify-between p-2 rounded border">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {publishState?.version ?? "v3.2"}
                  <Badge tone={published ? "good" : "warn"}>
                    {published ? "Publicado" : "Borrador"}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Consenso con insights aprobados
                </div>
                <div className="text-xs text-muted-foreground">
                  {publishState?.publishedBy ?? "—"} ·{" "}
                  {publishState?.publishedAt
                    ? formatAuditTime(publishState.publishedAt)
                    : "Pendiente de publicación"}
                </div>
              </div>
            </div>
            {versions.slice(0, 5).map((v) => (
              <div
                key={v.id}
                className="flex items-start justify-between p-2 rounded border opacity-80"
              >
                <div>
                  <div className="font-medium text-sm">
                    {v.version} · {v.estado}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {v.usuario} · {formatAuditTime(v.fecha)} · {v.canal}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Final: {v.forecastFinal.toLocaleString("es-AR")} u · {v.modeloUsado}
                  </div>
                </div>
              </div>
            ))}
            {skuAudit
              .filter((a) => a.action === "publicacion")
              .slice(0, 3)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex items-start justify-between p-2 rounded border opacity-80"
                >
                  <div>
                    <div className="font-medium text-sm">{a.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.user} · {formatAuditTime(a.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </Card>
        <Card
          title="Audit log"
          actions={<History className="size-4 text-muted-foreground" />}
        >
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {skuAudit.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin eventos registrados.</p>
            ) : (
              skuAudit.map((a) => (
                <div key={a.id} className="text-sm border-l-2 border-nestle-red pl-3">
                  <div className="text-xs text-muted-foreground">
                    {formatAuditTime(a.timestamp)} · {a.user}
                  </div>
                  <div>{a.description}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <AlertDialog open={publishOpen} onOpenChange={setPublishOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publicar forecast consenso</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-left">
                <p>
                  Se publicará la versión <strong>{publishState?.version ?? "nueva"}</strong> de{" "}
                  <strong>{product.name}</strong> con forecast final de{" "}
                  <strong>{breakdown.final.toLocaleString("es-AR")} u</strong>.
                </p>
                {publishValidation.blockers.length > 0 && (
                  <ul className="text-destructive text-sm list-disc pl-4 space-y-1">
                    {publishValidation.blockers.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                )}
                {publishValidation.warnings.length > 0 && (
                  <ul className="text-amber-700 text-sm list-disc pl-4 space-y-1">
                    {publishValidation.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                )}
                {canOverride && publishValidation.blockers.length > 0 && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideBlockers}
                      onChange={(e) => setOverrideBlockers(e.target.checked)}
                    />
                    Override como Demand Planner (publicar de todos modos)
                  </label>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!publishValidation.canPublish}
              onClick={handleConfirmPublish}
              className="bg-nestle-green hover:bg-nestle-green/90"
            >
              Confirmar publicación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
