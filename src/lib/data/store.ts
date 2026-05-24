import { loadJson, removeStorageItem, saveJson, setStorageItem } from "@/lib/storage";
import type {
  ColumnMapping,
  DataSource,
  GeneratedDemandStore,
  OrderRecord,
} from "./types";

const ORDERS_KEY = "nestle_orders";
const MAPPING_KEY = "nestle_column_mapping";
const DEMAND_KEY = "nestle_generated_demand";
const SOURCE_KEY = "nestle_data_source";

export const DATA_CHANGED_EVENT = "nestle-data-changed";

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DATA_CHANGED_EVENT));
  }
}

function persistJson<T>(key: string, value: T): void {
  saveJson(key, value);
  emitChange();
}

export function getStoredOrders(): OrderRecord[] {
  return loadJson<OrderRecord[]>(ORDERS_KEY, []);
}

export function saveOrders(orders: OrderRecord[]): void {
  persistJson(ORDERS_KEY, orders);
}

export function getColumnMapping(): ColumnMapping {
  return loadJson<ColumnMapping>(MAPPING_KEY, {});
}

export function saveColumnMapping(mapping: ColumnMapping): void {
  persistJson(MAPPING_KEY, mapping);
}

export function getGeneratedDemand(): GeneratedDemandStore | null {
  return loadJson<GeneratedDemandStore | null>(DEMAND_KEY, null);
}

export function saveGeneratedDemand(demand: GeneratedDemandStore): void {
  persistJson(DEMAND_KEY, demand);
}

export function getDataSource(): DataSource {
  return loadJson<DataSource>(SOURCE_KEY, null);
}

export function setDataSource(source: DataSource): void {
  if (source == null) removeStorageItem(SOURCE_KEY);
  else setStorageItem(SOURCE_KEY, source);
  emitChange();
}

export function hasLoadedDemand(): boolean {
  const d = getGeneratedDemand();
  return d != null && Object.keys(d.bySku).length > 0;
}

export function clearLoadedData(): void {
  removeStorageItem(ORDERS_KEY);
  removeStorageItem(MAPPING_KEY);
  removeStorageItem(DEMAND_KEY);
  removeStorageItem(SOURCE_KEY);
  emitChange();
}

export function persistDataPipeline(
  orders: OrderRecord[],
  mapping: ColumnMapping,
  demand: GeneratedDemandStore,
): void {
  saveOrders(orders);
  saveColumnMapping(mapping);
  saveGeneratedDemand(demand);
  setDataSource(demand.source);
}
