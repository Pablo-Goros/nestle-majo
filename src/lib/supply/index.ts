import { applyInsightAdjustments } from "@/lib/dashboard/insights";
import { getInsights } from "@/lib/insights/store";
import { DEMO_PRODUCTS } from "@/lib/mockData/catalog";
import { getSkuBundle } from "@/lib/mockData/datasets";
import type { Alert } from "@/lib/alerts/types";

export type SupplyInputAvailability = "Alto" | "Suficiente" | "Bajo";
export type SupplyRiskStatus = "No hay riesgo" | "Riesgo medio" | "Riesgo alto";

export interface SupplySkuData {
  skuCode: string;
  skuName: string;
  salesChannel: string;
  plant: string;
  consensusForecast: number;
  availableStock: number;
  productionCapacity: number;
  canProduceForecast: boolean;
  inputsAvailability: SupplyInputAvailability;
  importLeadTimeDays: number;
  truckCapacity: number;
  requiredTrucks: number;
  stockoutRiskPct: number;
  riskStatus: SupplyRiskStatus;
  suggestedAction: string;
  supermarketThreeWeekDemand: number;
  supermarketProjectedStock: number;
  isCriticalSku: boolean;
}

interface SupplyProfile {
  plant: string;
  salesChannel: string;
  stockFactor: number;
  productionFactor: number;
  inputsAvailability: SupplyInputAvailability;
  importLeadTimeDays: number;
  truckCapacity: number;
  supermarketStockFactor: number;
}

const DEFAULT_PROFILE: SupplyProfile = {
  plant: "Córdoba",
  salesChannel: "Supermercados",
  stockFactor: 0.38,
  productionFactor: 0.82,
  inputsAvailability: "Suficiente",
  importLeadTimeDays: 0,
  truckCapacity: 12,
  supermarketStockFactor: 1,
};

const SUPPLY_PROFILES: Record<string, Partial<SupplyProfile>> = {
  MIL3K: {
    salesChannel: "Mayoristas",
    stockFactor: 0.42,
    productionFactor: 0.76,
    inputsAvailability: "Suficiente",
    truckCapacity: 14,
  },
  NCT500: {
    stockFactor: 0.55,
    productionFactor: 1.04,
    inputsAvailability: "Alto",
    truckCapacity: 18,
  },
  NCG200: {
    stockFactor: 0.2,
    productionFactor: 0.58,
    inputsAvailability: "Bajo",
    importLeadTimeDays: 45,
    truckCapacity: 7,
    supermarketStockFactor: 0.75,
  },
  KK40: {
    salesChannel: "E-commerce",
    stockFactor: 0.34,
    productionFactor: 0.9,
    inputsAvailability: "Suficiente",
    importLeadTimeDays: 15,
    truckCapacity: 11,
  },
  MGSP: {
    salesChannel: "Distribuidores",
    stockFactor: 0.27,
    productionFactor: 0.7,
    inputsAvailability: "Suficiente",
    importLeadTimeDays: 21,
    truckCapacity: 8,
  },
  NSQ800: {
    stockFactor: 0.18,
    productionFactor: 0.64,
    inputsAvailability: "Bajo",
    importLeadTimeDays: 30,
    truckCapacity: 7,
    supermarketStockFactor: 0.8,
  },
};

let supplyAlertCounter = 0;

function nextSupplyAlertId(): string {
  supplyAlertCounter += 1;
  return `SUP-${Date.now()}-${supplyAlertCounter}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getProfile(skuCode: string): SupplyProfile {
  return {
    ...DEFAULT_PROFILE,
    ...SUPPLY_PROFILES[skuCode],
  };
}

function riskStatus(
  availableStock: number,
  productionCapacity: number,
  consensusForecast: number,
  inputsAvailability: SupplyInputAvailability,
  truckCapacity: number,
  requiredTrucks: number,
): SupplyRiskStatus {
  if (availableStock + productionCapacity < consensusForecast) {
    return "Riesgo alto";
  }
  if (
    inputsAvailability === "Bajo" ||
    truckCapacity < requiredTrucks ||
    availableStock + productionCapacity < consensusForecast * 1.1
  ) {
    return "Riesgo medio";
  }
  return "No hay riesgo";
}

function stockoutRiskPct(
  status: SupplyRiskStatus,
  availableStock: number,
  productionCapacity: number,
  consensusForecast: number,
  inputsAvailability: SupplyInputAvailability,
): number {
  if (consensusForecast <= 0) return 0;
  const gapPct = Math.max(
    0,
    ((consensusForecast - availableStock - productionCapacity) / consensusForecast) * 100,
  );
  if (status === "Riesgo alto") return Math.min(95, Math.round(62 + gapPct));
  if (status === "Riesgo medio") {
    return inputsAvailability === "Bajo" ? 48 : 32;
  }
  return 8;
}

function suggestedAction(data: {
  availableStock: number;
  productionCapacity: number;
  consensusForecast: number;
  inputsAvailability: SupplyInputAvailability;
  importLeadTimeDays: number;
  truckCapacity: number;
  requiredTrucks: number;
}): string {
  if (data.inputsAvailability === "Bajo" && data.importLeadTimeDays > 0) {
    return "Revisar importaciones";
  }
  if (data.productionCapacity < data.consensusForecast) {
    return "Priorizar esta producción";
  }
  if (data.availableStock < data.consensusForecast * 0.25) {
    return "Reasignar stock desde CD";
  }
  if (data.truckCapacity < data.requiredTrucks) {
    return "Reservar camiones adicionales";
  }
  return "Sin acción requerida";
}

export function buildSupplyData(skuCode: string): SupplySkuData | null {
  const bundle = getSkuBundle(skuCode);
  if (!bundle) return null;

  const profile = getProfile(skuCode);
  const insights = getInsights();
  const baselineForecast = bundle.weeklyForecast.reduce((sum, week) => sum + week.baseline, 0);
  const consensusForecast = applyInsightAdjustments(baselineForecast, insights, skuCode);

  const availableStock = Math.round(consensusForecast * profile.stockFactor);
  const productionCapacity = Math.round(consensusForecast * profile.productionFactor);
  const requiredTrucks = Math.max(1, Math.ceil(consensusForecast / 1_200));
  const status = riskStatus(
    availableStock,
    productionCapacity,
    consensusForecast,
    profile.inputsAvailability,
    profile.truckCapacity,
    requiredTrucks,
  );

  const supermarketForecast = bundle.channelForecasts.find((c) => c.channel === "Supermercados");
  const supermarketConsensus = applyInsightAdjustments(
    supermarketForecast?.baseline ?? Math.round(consensusForecast * 0.42),
    insights,
    skuCode,
    "Supermercados",
  );
  const supermarketInventory = bundle.inventory.find((i) => i.channel === "Supermercados");
  const supermarketProjectedStock = Math.round(
    (supermarketInventory?.onHandUnits ?? availableStock * 0.42) * profile.supermarketStockFactor,
  );

  return {
    skuCode,
    skuName: bundle.product.name,
    salesChannel: profile.salesChannel,
    plant: profile.plant,
    consensusForecast,
    availableStock,
    productionCapacity,
    canProduceForecast: productionCapacity >= consensusForecast,
    inputsAvailability: profile.inputsAvailability,
    importLeadTimeDays: profile.importLeadTimeDays,
    truckCapacity: profile.truckCapacity,
    requiredTrucks,
    stockoutRiskPct: stockoutRiskPct(
      status,
      availableStock,
      productionCapacity,
      consensusForecast,
      profile.inputsAvailability,
    ),
    riskStatus: status,
    suggestedAction: suggestedAction({
      availableStock,
      productionCapacity,
      consensusForecast,
      inputsAvailability: profile.inputsAvailability,
      importLeadTimeDays: profile.importLeadTimeDays,
      truckCapacity: profile.truckCapacity,
      requiredTrucks,
    }),
    supermarketThreeWeekDemand: Math.round(supermarketConsensus * (3 / 13)),
    supermarketProjectedStock,
    isCriticalSku: bundle.isCriticalSku,
  };
}

export function buildAllSupplyData(): SupplySkuData[] {
  return DEMO_PRODUCTS.map((p) => buildSupplyData(p.code)).filter(
    (row): row is SupplySkuData => row != null,
  );
}

export function resetSupplyAlertCounter(): void {
  supplyAlertCounter = 0;
}

export function evaluateSupplyAlerts(rows: SupplySkuData[] = buildAllSupplyData()): Alert[] {
  resetSupplyAlertCounter();
  const alerts: Alert[] = [];

  for (const row of rows) {
    if (!row.canProduceForecast) {
      alerts.push({
        id: nextSupplyAlertId(),
        type: "supply_capacity_gap",
        severity: row.riskStatus === "Riesgo alto" ? "alta" : "media",
        sku: row.skuName,
        skuCode: row.skuCode,
        channel: "Todos",
        message: "Forecast consenso supera la capacidad productiva disponible en planta Córdoba",
        recommendation: "Priorizar esta producción o revisar turnos de planta.",
        owner: "Supply Planning",
        status: "open",
        createdAt: nowIso(),
      });
    }

    if (row.supermarketProjectedStock < row.supermarketThreeWeekDemand) {
      alerts.push({
        id: nextSupplyAlertId(),
        type: "supply_supermarket_stock_shortage",
        severity: "alta",
        sku: row.skuName,
        skuCode: row.skuCode,
        channel: "Supermercados",
        message:
          "Stock proyectado insuficiente para cubrir demanda de supermercados en las próximas 3 semanas",
        recommendation: "Reasignar stock desde CD o reservar camiones adicionales.",
        owner: "Supply Planning",
        status: "open",
        createdAt: nowIso(),
      });
    }

    if (row.isCriticalSku && row.riskStatus === "Riesgo alto") {
      alerts.push({
        id: nextSupplyAlertId(),
        type: "supply_critical_stockout_risk",
        severity: "alta",
        sku: row.skuName,
        skuCode: row.skuCode,
        channel: row.salesChannel,
        message:
          "Riesgo de quiebre alto en SKU crítico: priorizar producción o reasignar stock desde CD.",
        recommendation: row.suggestedAction,
        owner: "Supply Planning",
        status: "open",
        createdAt: nowIso(),
      });
    }
  }

  return alerts;
}
