import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Card, Badge, LockedNotice } from "@/components/ui-bits";
import { PRODUCTS, CHANNELS } from "@/lib/mock-data";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UploadCloud, Download, Database, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  REQUIRED_COLUMNS,
  parseUploadedFile,
  suggestColumnMapping,
  isMappingComplete,
  validateColumnMapping,
  mapRowsToOrders,
  buildParsePreview,
  generateDemandBase,
  downloadOrdersTemplate,
  exportOrdersCsv,
  ordersFromMock,
  persistDataPipeline,
  getStoredOrders,
  getColumnMapping,
  getDataSource,
  hasLoadedDemand,
  type ColumnMapping,
  type OrderRecord,
  type RawParseResult,
} from "@/lib/data";

export const Route = createFileRoute("/app/datos")({ component: Datos });

const STEPS = [
  "Cargar archivo",
  "Mapear columnas",
  "Validar datos",
  "Generar demanda base",
];

const COLUMN_LABELS: Record<string, string> = {
  fecha_emision: "Fecha emisión",
  tipo_canal: "Tipo canal",
  nombre_canal: "Cliente / canal",
  locacion: "Locación",
  producto_nombre: "Producto",
  producto_codigo: "Código SKU",
  cantidad: "Cantidad",
  fecha_entrega: "Fecha entrega",
  estado: "Estado",
};

function Datos() {
  const { canEdit } = useAuth();
  const editable = canEdit("datos");
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const [raw, setRaw] = useState<RawParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(() => getColumnMapping());
  const [orders, setOrders] = useState<OrderRecord[]>(() => getStoredOrders());
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [filtro, setFiltro] = useState({
    estado: "todos",
    canal: "todos",
    producto: "todos",
    cliente: "todos",
    fechaDesde: "",
    fechaHasta: "",
  });

  const dataSource = getDataSource();

  useEffect(() => {
    if (orders.length > 0 && hasLoadedDemand()) setStep(3);
    else if (orders.length > 0 && isMappingComplete(mapping)) setStep(2);
    else if (raw) setStep(1);
  }, []);

  const columnValidations = useMemo(
    () => validateColumnMapping(mapping),
    [mapping],
  );

  const preview = useMemo(() => {
    if (orders.length === 0) return null;
    return buildParsePreview(orders);
  }, [orders]);

  const productOptions = useMemo(() => {
    const codes = new Set(orders.map((o) => o.producto_codigo));
    return PRODUCTS.filter((p) => codes.has(p.code));
  }, [orders]);

  const clientOptions = useMemo(
    () => [...new Set(orders.map((o) => o.nombre_canal))].sort(),
    [orders],
  );

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filtro.estado !== "todos" && o.estado !== filtro.estado) return false;
      if (filtro.canal !== "todos" && o.tipo_canal !== filtro.canal) return false;
      if (filtro.producto !== "todos" && o.producto_codigo !== filtro.producto)
        return false;
      if (filtro.cliente !== "todos" && o.nombre_canal !== filtro.cliente)
        return false;
      if (filtro.fechaDesde && o.fecha_emision < filtro.fechaDesde) return false;
      if (filtro.fechaHasta && o.fecha_emision > filtro.fechaHasta) return false;
      return true;
    });
  }, [orders, filtro]);

  const processFile = useCallback(
    async (file: File) => {
      if (!editable) return;
      try {
        const parsed = await parseUploadedFile(file);
        setRaw(parsed);
        const suggested = suggestColumnMapping(parsed.headers);
        setMapping(suggested);
        setValidationErrors([]);
        setStep(1);
        toast.success(`Archivo "${file.name}" cargado (${parsed.rows.length} filas)`);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al leer archivo");
      }
    },
    [editable],
  );

  const applyMappingAndValidate = useCallback(() => {
    if (!raw) return;
    const { orders: mapped, errors } = mapRowsToOrders(raw.rows, mapping);
    setValidationErrors(errors.slice(0, 8));
    if (mapped.length === 0) {
      toast.error("No hay filas válidas. Revisá mapeo y datos.");
      return;
    }
    setOrders(mapped);
    setStep(2);
    if (errors.length > 0) {
      toast.warning(`${mapped.length} pedidos OK · ${errors.length} filas con error`);
    } else {
      toast.success(`${mapped.length} pedidos validados`);
    }
  }, [raw, mapping]);

  const handleGenerateDemand = useCallback(() => {
    if (!editable || orders.length === 0) return;
    
    // Determinar la fuente: si fue cargado desde archivo, es "upload"; si es demo, es "demo"
    const isDemo = raw === null && dataSource === "demo";
    const source = isDemo ? "demo" : "upload";
    
    const demand = generateDemandBase(orders, source);
    persistDataPipeline(orders, mapping, demand);
    setStep(3);
    
    const skuCount = Object.keys(demand.bySku).length;
    const totalRecords = orders.length;
    const channels = [...new Set(orders.map(o => o.tipo_canal))].length;
    const dateFrom = Math.min(...orders.map(o => new Date(o.fecha_emision).getTime()));
    const dateTo = Math.max(...orders.map(o => new Date(o.fecha_emision).getTime()));
    
    console.info("Demanda base generada:", {
      skuCount,
      totalRecords,
      channels,
      dateFrom: new Date(dateFrom).toISOString().split('T')[0],
      dateTo: new Date(dateTo).toISOString().split('T')[0],
      source,
    });
    
    toast.success(
      `✓ Demanda base generada: ${skuCount} SKUs, ${totalRecords} registros, ${channels} canales`
    );
  }, [editable, orders, mapping, dataSource, raw]);

  const loadDemo = useCallback(() => {
    if (!editable) return;
    const demoOrders = ordersFromMock();
    const demoMapping = Object.fromEntries(
      REQUIRED_COLUMNS.map((c) => [c, c]),
    ) as ColumnMapping;
    const demand = generateDemandBase(demoOrders, "demo");
    persistDataPipeline(demoOrders, demoMapping, demand);
    setOrders(demoOrders);
    setMapping(demoMapping);
    setRaw(null);
    setValidationErrors([]);
    setStep(3);
    toast.success("Datos demo cargados y demanda generada");
  }, [editable]);

  return (
    <div>
      <PageHeader
        title="Datos"
        subtitle="Carga, validación y generación de demanda base"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                downloadOrdersTemplate();
                toast.success("Plantilla Excel descargada");
              }}
              className="h-9 px-3 rounded-md border text-sm flex items-center gap-2"
            >
              <Download className="size-4" />
              Plantilla Excel
            </button>
            <button
              type="button"
              disabled={!editable}
              onClick={loadDemo}
              className="h-9 px-3 rounded-md bg-nestle-blue text-white text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <Database className="size-4" />
              Cargar datos demo
            </button>
          </>
        }
      />

      {!editable && (
        <div className="mb-4">
          <LockedNotice feature="la carga de datos" />
        </div>
      )}

      {hasLoadedDemand() && (
        <div className="mb-4 text-sm flex items-center gap-2">
          <Badge tone="good">Demanda cargada</Badge>
          <span className="text-muted-foreground">
            Fuente: {dataSource === "demo" ? "Demo" : "Archivo"} · Forecast y
            Dashboard usan estos datos.
          </span>
        </div>
      )}

      <Card className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 shrink-0">
              <div
                className={`size-7 rounded-full grid place-items-center text-xs font-semibold ${i <= step ? "bg-nestle-red text-white" : "bg-muted text-muted-foreground"}`}
              >
                {i < step ? <CheckCircle2 className="size-4" /> : i + 1}
              </div>
              <span
                className={`text-sm ${i <= step ? "font-medium" : "text-muted-foreground"}`}
              >
                {s}
              </span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Subir archivo (Excel/CSV)" className="mb-6">
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void processFile(f);
            e.target.value = "";
          }}
        />
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f && editable) void processFile(f);
          }}
          className={`rounded-lg border-2 border-dashed p-10 text-center transition-colors ${drag ? "border-nestle-red bg-nestle-red/5" : "border-border"}`}
        >
          <UploadCloud className="size-10 mx-auto text-muted-foreground" />
          <div className="mt-3 font-medium">Arrastrá tu archivo aquí</div>
          <div className="text-sm text-muted-foreground">o</div>
          <button
            type="button"
            disabled={!editable}
            onClick={() => fileRef.current?.click()}
            className="mt-2 h-9 px-4 rounded-md bg-nestle-red text-white text-sm disabled:opacity-50"
          >
            Seleccionar archivo
          </button>
          <div className="text-xs text-muted-foreground mt-3">
            Formatos: .csv, .xlsx, .xls · Columnas requeridas:{" "}
            {REQUIRED_COLUMNS.join(", ")}
          </div>
          {raw && (
            <div className="text-xs mt-2 text-success">
              Archivo: {raw.fileName} ({raw.rows.length} filas)
            </div>
          )}
        </div>
      </Card>

      {step >= 1 && raw && (
        <Card title="Mapeo de columnas" className="mb-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {columnValidations.map((v) => (
              <div key={v.column} className="border rounded-md p-3">
                <div className="text-xs text-muted-foreground">
                  {COLUMN_LABELS[v.column] ?? v.column}
                </div>
                <select
                  value={mapping[v.column] ?? ""}
                  disabled={!editable}
                  onChange={(e) =>
                    setMapping((m) => ({
                      ...m,
                      [v.column]: e.target.value || undefined,
                    }))
                  }
                  className="mt-1 w-full h-8 px-2 rounded border text-sm"
                >
                  <option value="">— sin mapear —</option>
                  {raw.headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <div className="mt-2">
                  <Badge
                    tone={
                      v.status === "ok"
                        ? "good"
                        : v.status === "missing"
                          ? "warn"
                          : "bad"
                    }
                  >
                    {v.status === "ok" ? "OK" : v.status === "missing" ? "Faltante" : "Inválido"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!editable || !isMappingComplete(mapping)}
            onClick={applyMappingAndValidate}
            className="mt-4 h-9 px-4 rounded-md bg-nestle-red text-white text-sm disabled:opacity-50"
          >
            Validar datos
          </button>
        </Card>
      )}

      {step >= 2 && preview && (
        <>
          <Card title="Vista previa" className="mb-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Registros</div>
                <div className="font-semibold">{preview.totalRows}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">SKUs</div>
                <div className="font-semibold">{preview.skuCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Canales</div>
                <div className="font-semibold">{preview.channelCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Desde</div>
                <div className="font-semibold">{preview.dateFrom ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Hasta</div>
                <div className="font-semibold">{preview.dateTo ?? "—"}</div>
              </div>
            </div>
            {validationErrors.length > 0 && (
              <div className="mb-3 text-xs text-destructive space-y-1">
                {validationErrors.map((e) => (
                  <div key={e}>{e}</div>
                ))}
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground border-b">
                  <tr>
                    {[
                      "Fecha",
                      "Canal",
                      "Cliente",
                      "Producto",
                      "SKU",
                      "Cant.",
                      "Entrega",
                      "Estado",
                    ].map((h) => (
                      <th key={h} className="py-2 px-2 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.previewRows.map((o) => (
                    <tr key={o.id} className="border-b last:border-0">
                      <td className="py-2 px-2">{o.fecha_emision}</td>
                      <td className="py-2 px-2">{o.tipo_canal}</td>
                      <td className="py-2 px-2">{o.nombre_canal}</td>
                      <td className="py-2 px-2">{o.producto_nombre}</td>
                      <td className="py-2 px-2 font-mono text-xs">{o.producto_codigo}</td>
                      <td className="py-2 px-2">{o.cantidad}</td>
                      <td className="py-2 px-2">{o.fecha_entrega}</td>
                      <td className="py-2 px-2">
                        <Badge
                          tone={
                            o.estado === "entregado"
                              ? "good"
                              : o.estado === "cancelado"
                                ? "bad"
                                : o.estado === "postergado"
                                  ? "warn"
                                  : "info"
                          }
                        >
                          {o.estado}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {orders.length > 0 && step === 2 && (
            <Card title="Siguiente paso" className="mb-6 bg-nestle-red/5 border-nestle-red/20">
              <div className="space-y-3">
                <p className="text-sm">
                  Los datos han sido cargados y validados correctamente. Ahora generá la demanda base para que Forecast y Dashboard puedan procesarla.
                </p>
                <button
                  type="button"
                  disabled={!editable || orders.length === 0}
                  onClick={handleGenerateDemand}
                  className="w-full h-10 rounded-md bg-nestle-red text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Database className="size-5" />
                  Generar demanda base
                </button>
              </div>
            </Card>
          )}
        </>
      )}

      <Card
        title="Pedidos"
        actions={
          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={filtro.estado}
              onChange={(e) => setFiltro((f) => ({ ...f, estado: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="entregado">Entregado</option>
              <option value="postergado">Postergado</option>
              <option value="cancelado">Cancelado</option>
            </select>
            <select
              value={filtro.canal}
              onChange={(e) => setFiltro((f) => ({ ...f, canal: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
            >
              <option value="todos">Todos los canales</option>
              {CHANNELS.map((c) => (
                <option key={c.key} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={filtro.producto}
              onChange={(e) => setFiltro((f) => ({ ...f, producto: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
            >
              <option value="todos">Todos los productos</option>
              {productOptions.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            <select
              value={filtro.cliente}
              onChange={(e) => setFiltro((f) => ({ ...f, cliente: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
            >
              <option value="todos">Todos los clientes</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={filtro.fechaDesde}
              onChange={(e) => setFiltro((f) => ({ ...f, fechaDesde: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
              title="Fecha desde"
            />
            <input
              type="date"
              value={filtro.fechaHasta}
              onChange={(e) => setFiltro((f) => ({ ...f, fechaHasta: e.target.value }))}
              className="h-8 px-2 rounded border text-sm"
              title="Fecha hasta"
            />
            <button
              type="button"
              onClick={() => {
                exportOrdersCsv(filtered, "pedidos_filtrados.csv");
                toast.success(`${filtered.length} filas exportadas`);
              }}
              className="h-8 px-3 rounded border text-sm flex items-center gap-1.5"
            >
              <Download className="size-3.5" />
              Exportar
            </button>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground border-b">
              <tr>
                {[
                  "OC",
                  "Fecha emisión",
                  "Canal",
                  "Cliente",
                  "Locación",
                  "Producto",
                  "Cantidad",
                  "Entrega",
                  "Estado",
                ].map((h) => (
                  <th key={h} className="py-2 px-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">
                    {orders.length === 0
                      ? "Cargá un archivo o usá datos demo para ver pedidos."
                      : "Sin resultados para los filtros aplicados."}
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 15).map((o) => (
                  <tr key={o.id} className="border-b last:border-0">
                    <td className="py-2 px-2 font-mono text-xs">{o.id}</td>
                    <td className="py-2 px-2">{o.fecha_emision}</td>
                    <td className="py-2 px-2">{o.tipo_canal}</td>
                    <td className="py-2 px-2">{o.nombre_canal}</td>
                    <td className="py-2 px-2">{o.locacion}</td>
                    <td className="py-2 px-2">{o.producto_nombre}</td>
                    <td className="py-2 px-2">{o.cantidad}</td>
                    <td className="py-2 px-2">{o.fecha_entrega}</td>
                    <td className="py-2 px-2">
                      <Badge
                        tone={
                          o.estado === "entregado"
                            ? "good"
                            : o.estado === "cancelado"
                              ? "bad"
                              : o.estado === "postergado"
                                ? "warn"
                                : "info"
                        }
                      >
                        {o.estado}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="text-xs text-muted-foreground mt-2">
            Mostrando {Math.min(15, filtered.length)} de {filtered.length} pedidos
          </div>
        </div>
      </Card>
    </div>
  );
}
