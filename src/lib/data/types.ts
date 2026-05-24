import type {
  ChannelForecastPoint,
  MonthlyDemandPoint,
  WeeklyDemandPoint,
} from "@/lib/mockData";

export const REQUIRED_COLUMNS = [
  "fecha_emision",
  "tipo_canal",
  "nombre_canal",
  "locacion",
  "producto_nombre",
  "producto_codigo",
  "cantidad",
  "fecha_entrega",
  "estado",
] as const;

export type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

export type OrderStatus = "pendiente" | "entregado" | "postergado" | "cancelado";

export type ColumnMapping = Partial<Record<RequiredColumn, string>>;

export interface OrderRecord {
  id: string;
  fecha_emision: string;
  tipo_canal: string;
  nombre_canal: string;
  locacion: string;
  producto_nombre: string;
  producto_codigo: string;
  cantidad: number;
  fecha_entrega: string;
  estado: OrderStatus;
}

export interface ColumnValidation {
  column: RequiredColumn;
  mapped: boolean;
  sourceHeader?: string;
  status: "ok" | "missing" | "invalid";
  message?: string;
}

export interface ParsePreview {
  totalRows: number;
  skuCount: number;
  channelCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  previewRows: OrderRecord[];
}

export interface DemandSignals {
  pendingQty: number;
  postponedQty: number;
  deliveredQty: number;
}

export interface WeeklyDemandAggregate {
  week: string;
  skuCode: string;
  skuName: string;
  channel: string;
  client: string;
  deliveredQty: number;
  pendingQty: number;
  postponedQty: number;
}

export interface SkuDemandBundle {
  monthlyHistory: MonthlyDemandPoint[];
  weeklyForecast: WeeklyDemandPoint[];
  channelForecasts: ChannelForecastPoint[];
  signals: DemandSignals;
}

export interface GeneratedDemandStore {
  generatedAt: string;
  source: "upload" | "demo";
  aggregates: WeeklyDemandAggregate[];
  bySku: Record<string, SkuDemandBundle>;
}

export type DataSource = "upload" | "demo" | null;
