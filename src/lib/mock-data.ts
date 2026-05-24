export const PRODUCTS = [
  { code: "MIL3K", name: "Milo 3kg", category: "Bebidas en polvo" },
  { code: "NCT500", name: "Nescafé Tradición 500g", category: "Café" },
  { code: "NCG200", name: "Nescafé Gold 200g", category: "Café Premium" },
  { code: "KK40", name: "Kit Kat 40g", category: "Confitería" },
  { code: "MGSP", name: "Maggi Sopa Pollo", category: "Culinarios" },
  { code: "NSQ800", name: "Nesquik 800g", category: "Bebidas en polvo" },
];

export const CHANNELS = [
  { key: "super", name: "Supermercados" },
  { key: "mayoristas", name: "Mayoristas" },
  { key: "distribuidores", name: "Distribuidores" },
  { key: "ecommerce", name: "E-commerce" },
  { key: "farmacias", name: "Farmacias" },
];

export const DEMO_USERS = [
  { username: "jgarcia", password: "dp2024", name: "Juan García", role: "demand_planner", roleLabel: "Demand Planner" },
  { username: "lperez", password: "mkt2024", name: "Laura Pérez", role: "marketing", roleLabel: "Marketing" },
  { username: "druiz", password: "sal2024", name: "Diego Ruiz", role: "ventas", roleLabel: "Ventas" },
  { username: "cmora", password: "fin2024", name: "Carla Mora", role: "finanzas", roleLabel: "Finanzas" },
  { username: "mgomez", password: "dir2024", name: "Mariano Gómez", role: "direccion", roleLabel: "Dirección" },
];

export type Role = "demand_planner" | "marketing" | "ventas" | "finanzas" | "direccion";

export const ROLE_ACCESS: Record<Role, { canEdit: string[]; canView: string[] }> = {
  demand_planner: {
    canView: ["dashboard","direccion","datos","limpieza","forecast","insights","consenso","control-tower","finanzas","mbp","ai","usuarios"],
    canEdit: ["datos","limpieza","forecast","insights","consenso","control-tower","mbp","usuarios"],
  },
  marketing: {
    canView: ["dashboard","datos","forecast","insights","consenso","mbp","ai"],
    canEdit: ["insights"],
  },
  ventas: {
    canView: ["dashboard","datos","forecast","insights","consenso","mbp","ai"],
    canEdit: ["insights"],
  },
  finanzas: {
    canView: ["dashboard","forecast","insights","consenso","finanzas","mbp","ai"],
    canEdit: ["insights","finanzas"],
  },
  direccion: {
    canView: ["dashboard","direccion","forecast","consenso","control-tower","finanzas","mbp","ai"],
    canEdit: [],
  },
};

// Genera serie temporal: histórico, baseline y consenso por producto
export function getDemandSeries(productCode: string) {
  const seed = productCode.charCodeAt(0) + productCode.charCodeAt(1);
  const base = 4000 + (seed % 9) * 800;
  const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return months.map((m, i) => {
    const season = 1 + 0.18 * Math.sin((i / 12) * Math.PI * 2 + seed);
    const noise = 1 + ((Math.sin(seed + i * 3.1) + 1) / 2 - 0.5) * 0.12;
    const real = i < 9 ? Math.round(base * season * noise) : null;
    const baseline = Math.round(base * season);
    const consenso = Math.round(base * season * (1 + (i > 5 ? 0.06 : 0.02)));
    return { mes: m, real, baseline, consenso };
  });
}

export function getWeeklyForecast(productCode: string) {
  const seed = productCode.charCodeAt(0);
  const base = 900 + (seed % 7) * 120;
  return Array.from({ length: 13 }, (_, i) => {
    const wk = i + 1;
    const baseDem = Math.round(base * (1 + 0.1 * Math.sin(i / 3 + seed)));
    const ajuste = Math.round(baseDem * (i % 4 === 0 ? 0.08 : i % 3 === 0 ? -0.04 : 0.02));
    const consenso = baseDem + ajuste;
    const real = i < 3 ? Math.round(baseDem * (1 + ((i % 2 ? -1 : 1) * 0.05))) : null;
    const vsBase = ((consenso - baseDem) / baseDem) * 100;
    const estado = Math.abs(vsBase) > 7 ? "Atención" : Math.abs(vsBase) > 3 ? "Revisar" : "OK";
    return { semana: `S${wk}`, real, baseDem, ajuste, consenso, vsBase, estado };
  });
}

export function getChannelForecast(productCode: string) {
  const seed = productCode.charCodeAt(0);
  const total = 12000 + (seed % 8) * 1500;
  const weights = [0.42, 0.18, 0.15, 0.16, 0.09];
  return CHANNELS.map((c, i) => ({
    canal: c.name,
    forecast: Math.round(total * weights[i]),
    consenso: Math.round(total * weights[i] * (1 + (i % 2 ? 0.04 : -0.02))),
  }));
}

export const MODELS = [
  { name: "Promedio Móvil 3", mape: 12.4, mad: 320, rmse: 410, bias: 1.2 },
  { name: "Promedio Móvil 6", mape: 11.8, mad: 305, rmse: 395, bias: 0.8 },
  { name: "Suavización Exp.", mape: 10.2, mad: 280, rmse: 360, bias: -0.4 },
  { name: "Holt-Winters", mape: 8.6, mad: 240, rmse: 310, bias: 0.2 },
  { name: "ARIMA", mape: 9.1, mad: 255, rmse: 325, bias: -0.6 },
  { name: "SARIMA", mape: 7.8, mad: 225, rmse: 295, bias: 0.1 },
  { name: "ETS", mape: 8.9, mad: 248, rmse: 318, bias: 0.4 },
  { name: "Prophet", mape: 8.2, mad: 232, rmse: 302, bias: -0.3 },
];

export const MOCK_ORDERS = Array.from({ length: 40 }, (_, i) => {
  const prod = PRODUCTS[i % PRODUCTS.length];
  const chan = CHANNELS[i % CHANNELS.length];
  const estados = ["pendiente","entregado","postergado","cancelado"];
  return {
    id: `OC-${10240 + i}`,
    fecha_emision: `2025-05-${String((i % 28) + 1).padStart(2,"0")}`,
    tipo_canal: chan.name,
    nombre_canal: ["Coto","Carrefour","Día","DIA Mayorista","Maxiconsumo","Mercado Libre","Farmacity"][i % 7],
    locacion: ["CABA","Córdoba","Rosario","Mendoza","Tucumán"][i % 5],
    producto_nombre: prod.name,
    producto_codigo: prod.code,
    cantidad: 100 + ((i * 37) % 900),
    fecha_entrega: `2025-06-${String((i % 28) + 1).padStart(2,"0")}`,
    estado: estados[i % 4],
  };
});

export const MOCK_OUTLIERS = [
  { fecha: "2024-11-25", producto: "Kit Kat 40g", valor: 8200, esperado: 3100, zscore: 4.2, evento: "Cyber Week", tipo: "coyuntural" },
  { fecha: "2025-01-15", producto: "Nesquik 800g", valor: 5800, esperado: 4200, zscore: 2.8, evento: "Vuelta a clases", tipo: "estructural" },
  { fecha: "2024-09-30", producto: "Nescafé Gold 200g", valor: 1200, esperado: 3800, zscore: -3.5, evento: "Quiebre de stock", tipo: "coyuntural" },
  { fecha: "2025-03-31", producto: "Maggi Sopa Pollo", valor: 6200, esperado: 3900, zscore: 3.1, evento: "Cierre de trimestre", tipo: "coyuntural" },
  { fecha: "2024-12-20", producto: "Milo 3kg", valor: 9100, esperado: 5200, zscore: 3.7, evento: "Promoción", tipo: "coyuntural" },
];

export const MOCK_INSIGHTS = [
  { id: 1, area: "Marketing", responsable: "Laura Pérez", sku: "Kit Kat 40g", canal: "E-commerce", inicio: "2025-06-01", fin: "2025-06-07", impacto: "+22%", tipo: "Hot Sale", estado: "Aprobado", justificacion: "Campaña Hot Sale con 25% off + push paid media." },
  { id: 2, area: "Ventas", responsable: "Diego Ruiz", sku: "Nescafé Gold 200g", canal: "Supermercados", inicio: "2025-06-05", fin: "2025-06-30", impacto: "-1200u", tipo: "Traba comercial", estado: "Pendiente", justificacion: "Coto en negociación de listado, riesgo de pausar reposición." },
  { id: 3, area: "Finanzas", responsable: "Carla Mora", sku: "Milo 3kg", canal: "Todos", inicio: "2025-06-01", fin: "2025-06-30", impacto: "-3%", tipo: "Inflación", estado: "Aprobado", justificacion: "Ajuste de precio +8% impacta elasticidad estimada." },
  { id: 4, area: "Marketing", responsable: "Laura Pérez", sku: "Nesquik 800g", canal: "Supermercados", inicio: "2025-07-15", fin: "2025-08-15", impacto: "+15%", tipo: "Vuelta a clases", estado: "Aprobado", justificacion: "Activación BTL + descuento pack escolar." },
  { id: 5, area: "Ventas", responsable: "Diego Ruiz", sku: "Maggi Sopa Pollo", canal: "Mayoristas", inicio: "2025-06-10", fin: "2025-06-20", impacto: "+800u", tipo: "Sell-in", estado: "En revisión", justificacion: "Compra extraordinaria Maxiconsumo Córdoba." },
];

export const MOCK_ALERTS = [
  { id: 1, sku: "Nescafé Gold 200g", canal: "Supermercados", tipo: "Stockout proyectado", severidad: "alta", recomendacion: "Acelerar reposición desde CD Pilar. Cobertura proyectada: 4 días.", responsable: "Demand Planner" },
  { id: 2, sku: "Kit Kat 40g", canal: "E-commerce", tipo: "Desvío consenso vs baseline > 20%", severidad: "media", recomendacion: "Revisar insight de Hot Sale, validar con Marketing.", responsable: "Marketing" },
  { id: 3, sku: "Milo 3kg", canal: "Mayoristas", tipo: "Bias fuera de rango", severidad: "media", recomendacion: "Modelo sobreestimando. Considerar Holt-Winters.", responsable: "Demand Planner" },
  { id: 4, sku: "Nesquik 800g", canal: "Todos", tipo: "DPA bajo umbral (78%)", severidad: "alta", recomendacion: "Revisar limpieza de outliers de marzo.", responsable: "Demand Planner" },
  { id: 5, sku: "Maggi Sopa Pollo", canal: "Distribuidores", tipo: "SKU crítico sin insight cargado", severidad: "baja", recomendacion: "Solicitar input a Ventas antes del consenso.", responsable: "Ventas" },
  { id: 6, sku: "Nescafé Tradición 500g", canal: "Todos", tipo: "Margen bajo target", severidad: "media", recomendacion: "Evaluar ajuste de precio o mix de canal.", responsable: "Finanzas" },
];

export const MBP_TASKS = [
  { semana: 1, titulo: "Limpieza de datos y baseline", tareas: [
    { t: "Carga de pedidos SAP", resp: "Demand Planner", done: true },
    { t: "Detección de outliers", resp: "Demand Planner", done: true },
    { t: "Generación baseline estadístico", resp: "Demand Planner", done: false },
  ]},
  { semana: 2, titulo: "Inputs de Ventas, Marketing y Finanzas", tareas: [
    { t: "Insights de Marketing (campañas, Hot Sale)", resp: "Marketing", done: true },
    { t: "Insights de Ventas (stock cliente, sell-in)", resp: "Ventas", done: false },
    { t: "Inputs financieros (precio, costo, FX)", resp: "Finanzas", done: false },
  ]},
  { semana: 3, titulo: "Consenso", tareas: [
    { t: "Reunión de consenso S&OP", resp: "Demand Planner", done: false },
    { t: "Aprobación de ajustes", resp: "Dirección", done: false },
  ]},
  { semana: 4, titulo: "Publicación y revisión ejecutiva", tareas: [
    { t: "Publish forecast a ERP/SAP", resp: "Demand Planner", done: false },
    { t: "Revisión Dirección y cierre MBP", resp: "Dirección", done: false },
  ]},
];
