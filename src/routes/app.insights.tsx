import { createFileRoute } from "@tanstack/react-router";
import {
  PageHeader,
  Badge,
  LockedNotice,
  TabBar,
  FormField,
  FormSelect,
  FormInput,
  FormTextarea,
} from "@/components/ui-bits";
import { DEMO_CHANNELS, DEMO_PRODUCTS } from "@/lib/mockData";
import {
  useInsights,
  formatImpactDisplay,
  canApproveReject,
  canCreateInsight,
  canDeleteInsight,
  canEditInsight,
  getRoleArea,
  isForecastPublished,
  isReadOnlyRole,
  parseImpactInput,
  type CollaborativeInsight,
  type InsightArea,
  type InsightFormInput,
} from "@/lib/insights";
import { useAuth } from "@/lib/auth";
import { useMemo, useState } from "react";
import {
  Plus,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app/insights")({ component: Insights });

const TIPOS_POR_AREA: Record<InsightArea, string[]> = {
  Marketing: [
    "Campaña",
    "Share",
    "Sell-out",
    "Hot Sale",
    "Cyber Week",
    "Vuelta a clases",
  ],
  Ventas: [
    "Stock cliente",
    "Sell-in",
    "Traba comercial",
    "Deuda",
    "Pedido postergado",
  ],
  Finanzas: ["Margen", "Costo MP", "Dólar", "Inflación", "Precio"],
};

const CLIENTES = [
  "Todos los clientes",
  "Coto",
  "Carrefour",
  "Mercado Libre",
  "Maxiconsumo",
  "Farmacity",
];

type Tab = "todos" | InsightArea;

function areaBadgeTone(area: InsightArea): "info" | "good" | "warn" {
  if (area === "Marketing") return "info";
  if (area === "Ventas") return "good";
  return "warn";
}

function statusTone(
  s: CollaborativeInsight["estado_aprobacion"],
): "good" | "warn" | "bad" {
  if (s === "aprobado") return "good";
  if (s === "rechazado") return "bad";
  return "warn";
}

function statusLabel(s: CollaborativeInsight["estado_aprobacion"]): string {
  if (s === "aprobado") return "Aprobado";
  if (s === "rechazado") return "Rechazado";
  return "Pendiente";
}

function Insights() {
  const { user, canEdit } = useAuth();
  const {
    insights,
    createInsight,
    updateInsight,
    deleteInsight,
    approveInsight,
    rejectInsight,
  } = useInsights();

  const [tab, setTab] = useState<Tab>("todos");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CollaborativeInsight | null>(null);

  const role = user?.role ?? "marketing";
  const readOnly = isReadOnlyRole(role);
  const moduleEditable = canEdit("insights");
  const canApprove = canApproveReject(role);
  const userArea = getRoleArea(role);
  const defaultArea: InsightArea = userArea ?? "Marketing";

  const filtered = useMemo(() => {
    if (tab === "todos") return insights;
    return insights.filter((i) => i.area === tab);
  }, [insights, tab]);

  const canAdd =
    moduleEditable &&
    !readOnly &&
    (role === "demand_planner" ||
      (userArea ? canCreateInsight(role, userArea) : false));

  const saveInsight = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const f = new FormData(e.currentTarget);
    const skuName = String(f.get("sku") ?? "");
    const product = DEMO_PRODUCTS.find((p) => p.name === skuName);
    const impacto_tipo = String(f.get("impacto_tipo")) as "porcentaje" | "unidades";
    const area = (
      role === "demand_planner" ? String(f.get("area")) : defaultArea
    ) as InsightArea;

    if (!product?.code) {
      toast.error("Seleccioná un SKU válido de la lista.");
      return;
    }

    const input: InsightFormInput = {
      area,
      responsable: user.name,
      sku: skuName,
      skuCode: product.code,
      channel: String(f.get("channel") ?? "Todos"),
      cliente: String(f.get("cliente") ?? ""),
      fecha_inicio: String(f.get("fecha_inicio") ?? ""),
      fecha_fin: String(f.get("fecha_fin") ?? ""),
      impacto_tipo,
      impacto_valor: parseImpactInput(
        impacto_tipo,
        String(f.get("impacto_valor") ?? "0"),
      ),
      justificacion: String(f.get("justificacion") ?? ""),
      evento: String(f.get("evento") ?? ""),
      tipo_evento: String(f.get("tipo_evento")) as "estructural" | "coyuntural",
    };

    if (editing) {
      if (!canEditInsight(role, editing)) {
        toast.error("No tenés permiso para editar este insight.");
        return;
      }
      updateInsight(editing.id, input, user.name);
      toast.success("Insight actualizado");
    } else {
      if (!canCreateInsight(role, area, input.skuCode)) {
        toast.error(
          isForecastPublished(input.skuCode)
            ? "Forecast publicado: solo Demand Planner puede agregar insights."
            : "No tenés permiso para crear en esta área.",
        );
        return;
      }
      createInsight(input, user.name);
      toast.success("Insight cargado");
    }

    setShowForm(false);
    setEditing(null);
  };

  const openCreate = () => {
    setEditing(null);
    setShowForm(true);
  };

  const openEdit = (it: CollaborativeInsight) => {
    if (!canEditInsight(role, it)) {
      toast.error("No tenés permiso para editar.");
      return;
    }
    setEditing(it);
    setShowForm(true);
  };

  const onDelete = (it: CollaborativeInsight) => {
    if (!user || !canDeleteInsight(role, it)) {
      toast.error("No tenés permiso para eliminar.");
      return;
    }
    deleteInsight(it.id, user.name);
    toast.success("Insight eliminado");
  };

  const onApprove = (it: CollaborativeInsight) => {
    if (!user || !canApprove) return;
    approveInsight(it.id, user.name);
    toast.success("Insight aprobado");
  };

  const onReject = (it: CollaborativeInsight) => {
    if (!user || !canApprove) return;
    rejectInsight(it.id, user.name);
    toast.error("Insight rechazado");
  };

  const formArea = editing?.area ?? defaultArea;

  return (
    <div>
      <PageHeader
        title="Insights colaborativos"
        subtitle="Inputs de Marketing, Ventas y Finanzas que ajustan el forecast"
        actions={
          canAdd ? (
            <button
              onClick={openCreate}
              className="h-9 px-3 rounded-md bg-nestle-red text-white text-sm flex items-center gap-2"
            >
              <Plus className="size-4" />
              Cargar insight
            </button>
          ) : undefined
        }
      />
      {!moduleEditable && (
        <div className="mb-4">
          <LockedNotice feature="insights" />
        </div>
      )}
      {readOnly && (
        <div className="mb-4 text-sm text-muted-foreground">
          Vista de solo lectura (Dirección).
        </div>
      )}

      <TabBar
        tabs={[
          { id: "todos", label: "Todos" },
          { id: "Marketing", label: "Marketing" },
          { id: "Ventas", label: "Ventas" },
          { id: "Finanzas", label: "Finanzas" },
        ]}
        active={tab}
        onChange={(id) => setTab(id as Tab)}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {filtered.map((it) => {
          const positivo = it.impacto_valor >= 0;
          const impactLabel = formatImpactDisplay(it);
          return (
            <div
              key={it.id}
              className="rounded-lg border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Badge tone={areaBadgeTone(it.area)}>{it.area}</Badge>
                  <div className="font-medium text-sm mt-2">{it.sku}</div>
                  <div className="text-xs text-muted-foreground">
                    {it.channel} · {it.cliente}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {it.fecha_inicio} → {it.fecha_fin}
                  </div>
                </div>
                <div
                  className={`flex items-center gap-1 font-semibold shrink-0 ${
                    positivo ? "text-success" : "text-destructive"
                  }`}
                >
                  {positivo ? (
                    <TrendingUp className="size-4" />
                  ) : (
                    <TrendingDown className="size-4" />
                  )}
                  {impactLabel}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">{it.justificacion}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <span className="text-xs">
                  {it.evento} · {it.tipo_evento}
                </span>
                <Badge tone={statusTone(it.estado_aprobacion)}>
                  {statusLabel(it.estado_aprobacion)}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                por {it.responsable}
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {canEditInsight(role, it) && (
                  <button
                    onClick={() => openEdit(it)}
                    className="h-7 px-2 rounded border text-xs flex items-center gap-1"
                  >
                    <Pencil className="size-3" /> Editar
                  </button>
                )}
                {canDeleteInsight(role, it) && (
                  <button
                    onClick={() => onDelete(it)}
                    className="h-7 px-2 rounded border text-xs flex items-center gap-1 text-destructive"
                  >
                    <Trash2 className="size-3" /> Eliminar
                  </button>
                )}
                {canApprove && it.estado_aprobacion === "pendiente" && (
                  <>
                    <button
                      onClick={() => onApprove(it)}
                      className="h-7 px-2 rounded bg-success text-white text-xs flex items-center gap-1"
                    >
                      <Check className="size-3" /> Aprobar
                    </button>
                    <button
                      onClick={() => onReject(it)}
                      className="h-7 px-2 rounded bg-destructive text-white text-xs flex items-center gap-1"
                    >
                      <X className="size-3" /> Rechazar
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showForm && (
        <div
          className="fixed inset-0 bg-black/50 grid place-items-center p-4 z-50"
          onClick={() => {
            setShowForm(false);
            setEditing(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-lg border shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-semibold text-lg mb-1">
              {editing ? "Editar insight" : "Nuevo insight"}
            </h3>
            <p className="text-sm text-muted-foreground mb-5">{formArea}</p>
            <form onSubmit={saveInsight} className="space-y-4 text-sm">
              {role === "demand_planner" && (
                <FormField label="Área" required>
                  <FormSelect name="area" defaultValue={formArea}>
                    <option value="Marketing">Marketing</option>
                    <option value="Ventas">Ventas</option>
                    <option value="Finanzas">Finanzas</option>
                  </FormSelect>
                </FormField>
              )}
              <div className="grid grid-cols-2 gap-3">
                <label>
                  SKU
                  <select
                    name="sku"
                    defaultValue={editing?.sku}
                    className="mt-1 w-full h-9 px-2 rounded border"
                    required
                  >
                    {DEMO_PRODUCTS.map((p) => (
                      <option key={p.code} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Canal
                  <select
                    name="channel"
                    defaultValue={editing?.channel ?? "Todos"}
                    className="mt-1 w-full h-9 px-2 rounded border"
                  >
                    <option>Todos</option>
                    {DEMO_CHANNELS.map((c) => (
                      <option key={c.key} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cliente
                  <select
                    name="cliente"
                    defaultValue={editing?.cliente}
                    className="mt-1 w-full h-9 px-2 rounded border"
                  >
                    {CLIENTES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Evento
                  <select
                    name="evento"
                    defaultValue={editing?.evento}
                    className="mt-1 w-full h-9 px-2 rounded border"
                  >
                    {TIPOS_POR_AREA[formArea].map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Fecha inicio
                  <input
                    name="fecha_inicio"
                    type="date"
                    defaultValue={editing?.fecha_inicio}
                    className="mt-1 w-full h-9 px-2 rounded border"
                    required
                  />
                </label>
                <label>
                  Fecha fin
                  <input
                    name="fecha_fin"
                    type="date"
                    defaultValue={editing?.fecha_fin}
                    className="mt-1 w-full h-9 px-2 rounded border"
                    required
                  />
                </label>
                <label>
                  Tipo impacto
                  <select
                    name="impacto_tipo"
                    defaultValue={editing?.impacto_tipo ?? "porcentaje"}
                    className="mt-1 w-full h-9 px-2 rounded border"
                  >
                    <option value="porcentaje">Porcentaje</option>
                    <option value="unidades">Unidades</option>
                  </select>
                </label>
                <label>
                  Valor impacto
                  <input
                    name="impacto_valor"
                    type="number"
                    step="any"
                    defaultValue={editing?.impacto_valor}
                    placeholder="22 o -1200"
                    className="mt-1 w-full h-9 px-2 rounded border"
                    required
                  />
                </label>
                <label>
                  Tipo evento
                  <select
                    name="tipo_evento"
                    defaultValue={editing?.tipo_evento ?? "coyuntural"}
                    className="mt-1 w-full h-9 px-2 rounded border"
                  >
                    <option value="coyuntural">Coyuntural</option>
                    <option value="estructural">Estructural</option>
                  </select>
                </label>
              </div>
              <label className="block">
                Justificación
                <textarea
                  name="justificacion"
                  defaultValue={editing?.justificacion}
                  className="mt-1 w-full px-2 py-1 rounded border"
                  rows={3}
                  required
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                  className="h-9 px-3 rounded border"
                >
                  Cancelar
                </button>
                <button className="h-9 px-3 rounded bg-nestle-red text-white">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
