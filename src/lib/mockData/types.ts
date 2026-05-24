export interface Product {
  code: string;
  name: string;
  category: string;
}

export interface Channel {
  key: string;
  name: string;
}

export interface MonthlyDemandPoint {
  month: string;
  actual: number | null;
  baseline: number;
  consensus: number;
}

export interface WeeklyDemandPoint {
  week: string;
  actual: number | null;
  baseline: number;
  consensus: number;
}

export interface ChannelForecastPoint {
  channel: string;
  channelKey: string;
  baseline: number;
  consensus: number;
}

export interface ProductInsight {
  id: number;
  sku: string;
  skuCode: string;
  channel: string;
  area: "Marketing" | "Ventas" | "Finanzas";
  owner: string;
  type: string;
  impact: string;
  status: "Aprobado" | "Pendiente" | "En revisión";
  startDate: string;
  endDate: string;
  justification: string;
}

export interface ProductFinancials {
  skuCode: string;
  unitPrice: number;
  marginPercent: number;
  marginTarget: number;
  revenueForecast: number;
  costPerUnit: number;
}

export interface InventorySnapshot {
  skuCode: string;
  channel: string;
  onHandUnits: number;
  avgDailyDemand: number;
  /** Días de cobertura proyectados */
  coverageDays: number;
}

export interface SkuChannelPlanningContext {
  product: Product;
  channel: Channel;
  monthlyHistory: MonthlyDemandPoint[];
  weeklyForecast: WeeklyDemandPoint[];
  /** Pares actual vs forecast a lag 3 para DPA */
  lag3Pairs: { actual: number; forecast: number; period: string }[];
  dpaLag3: number;
  biasPercent: number;
  trackingSignal: number;
  consensusVsBaselinePct: number;
  financials: ProductFinancials;
  inventory: InventorySnapshot;
  insights: ProductInsight[];
  isCriticalSku: boolean;
}

export interface DemoCatalog {
  products: Product[];
  channels: Channel[];
  bySku: Record<string, SkuPlanningBundle>;
  bySkuChannel: Record<string, SkuChannelPlanningContext>;
}

export interface SkuPlanningBundle {
  product: Product;
  monthlyHistory: MonthlyDemandPoint[];
  weeklyForecast: WeeklyDemandPoint[];
  channelForecasts: ChannelForecastPoint[];
  insights: ProductInsight[];
  financials: ProductFinancials;
  inventory: InventorySnapshot[];
  isCriticalSku: boolean;
}
