import type {
  Channel,
  Product,
  ProductFinancials,
  ProductInsight,
  InventorySnapshot,
} from "./types";

export const DEMO_PRODUCTS: Product[] = [
  { code: "MIL3K", name: "Milo 3kg", category: "Bebidas en polvo" },
  { code: "NCT500", name: "Nescafé Tradición 500g", category: "Café" },
  { code: "NCG200", name: "Nescafé Gold 200g", category: "Café Premium" },
  { code: "KK40", name: "Kit Kat 40g", category: "Confitería" },
  { code: "MGSP", name: "Maggi Sopa Pollo", category: "Culinarios" },
  { code: "NSQ800", name: "Nesquik 800g", category: "Bebidas en polvo" },
];

export const DEMO_CHANNELS: Channel[] = [
  { key: "super", name: "Supermercados" },
  { key: "mayoristas", name: "Mayoristas" },
  { key: "distribuidores", name: "Distribuidores" },
  { key: "ecommerce", name: "E-commerce" },
  { key: "farmacias", name: "Farmacias" },
];

export const DEMO_INSIGHTS: ProductInsight[] = [
  {
    id: 1,
    sku: "Kit Kat 40g",
    skuCode: "KK40",
    channel: "E-commerce",
    area: "Marketing",
    owner: "Laura Pérez",
    type: "Hot Sale",
    impact: "+22%",
    status: "Aprobado",
    startDate: "2025-06-01",
    endDate: "2025-06-07",
    justification: "Campaña Hot Sale con 25% off + push paid media.",
  },
  {
    id: 2,
    sku: "Nescafé Gold 200g",
    skuCode: "NCG200",
    channel: "Supermercados",
    area: "Ventas",
    owner: "Diego Ruiz",
    type: "Traba comercial",
    impact: "-1200u",
    status: "Pendiente",
    startDate: "2025-06-05",
    endDate: "2025-06-30",
    justification: "Coto en negociación de listado, riesgo de pausar reposición.",
  },
  {
    id: 3,
    sku: "Milo 3kg",
    skuCode: "MIL3K",
    channel: "Todos",
    area: "Finanzas",
    owner: "Carla Mora",
    type: "Inflación",
    impact: "-3%",
    status: "Aprobado",
    startDate: "2025-06-01",
    endDate: "2025-06-30",
    justification: "Ajuste de precio +8% impacta elasticidad estimada.",
  },
  {
    id: 4,
    sku: "Nesquik 800g",
    skuCode: "NSQ800",
    channel: "Supermercados",
    area: "Marketing",
    owner: "Laura Pérez",
    type: "Vuelta a clases",
    impact: "+15%",
    status: "Aprobado",
    startDate: "2025-07-15",
    endDate: "2025-08-15",
    justification: "Activación BTL + descuento pack escolar.",
  },
  {
    id: 5,
    sku: "Maggi Sopa Pollo",
    skuCode: "MGSP",
    channel: "Mayoristas",
    area: "Ventas",
    owner: "Diego Ruiz",
    type: "Sell-in",
    impact: "+800u",
    status: "En revisión",
    startDate: "2025-06-10",
    endDate: "2025-06-20",
    justification: "Compra extraordinaria Maxiconsumo Córdoba.",
  },
];

/** SKUs marcados como críticos para reglas de alertas */
export const CRITICAL_SKU_CODES = new Set(["NCG200", "NSQ800", "MGSP"]);

const FINANCIAL_OVERRIDES: Record<string, Partial<ProductFinancials>> = {
  NCG200: { marginPercent: 18.2, marginTarget: 22, revenueForecast: 4_200_000 },
  NCT500: { marginPercent: 16.5, marginTarget: 20, revenueForecast: 8_100_000 },
  MIL3K: { marginPercent: 21.0, marginTarget: 20, revenueForecast: 5_600_000 },
  KK40: { marginPercent: 24.5, marginTarget: 22, revenueForecast: 3_800_000 },
  MGSP: { marginPercent: 19.8, marginTarget: 21, revenueForecast: 2_400_000 },
  NSQ800: { marginPercent: 17.1, marginTarget: 20, revenueForecast: 4_900_000 },
};

export function buildFinancials(product: Product): ProductFinancials {
  const seed = product.code.charCodeAt(0);
  const override = FINANCIAL_OVERRIDES[product.code];
  const costPerUnit = override?.costPerUnit ?? 120 + (seed % 40);
  const marginPercent = override?.marginPercent ?? 20 + (seed % 5);
  const unitPrice =
    override?.unitPrice ??
    Math.round(costPerUnit / Math.max(0.15, 1 - marginPercent / 100));
  return {
    skuCode: product.code,
    unitPrice,
    marginPercent,
    marginTarget: override?.marginTarget ?? 21,
    revenueForecast: override?.revenueForecast ?? 3_000_000 + seed * 10_000,
    costPerUnit,
  };
}

/** Cobertura por SKU×canal — valores bajos disparan alerta stockout */
export function buildInventory(
  product: Product,
  channels: Channel[],
): InventorySnapshot[] {
  const overrides: Record<string, Partial<Record<string, number>>> = {
    NCG200: { super: 4, ecommerce: 8 },
    NSQ800: { super: 6, distribuidores: 9 },
    MGSP: { distribuidores: 7 },
    KK40: { ecommerce: 5 },
  };

  const seed = product.code.charCodeAt(0);

  return channels.map((ch) => {
    const avgDaily = 80 + (seed % 30) + (ch.key === "super" ? 40 : 0);
    const coverageDays =
      overrides[product.code]?.[ch.key] ??
      12 + (seed % 8) + (ch.key === "ecommerce" ? -2 : 0);

    return {
      skuCode: product.code,
      channel: ch.name,
      onHandUnits: Math.round(avgDaily * coverageDays),
      avgDailyDemand: avgDaily,
      coverageDays,
    };
  });
}
