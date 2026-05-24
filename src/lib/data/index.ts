export type {
  RequiredColumn,
  OrderStatus,
  ColumnMapping,
  OrderRecord,
  ColumnValidation,
  ParsePreview,
  DemandSignals,
  WeeklyDemandAggregate,
  SkuDemandBundle,
  GeneratedDemandStore,
  DataSource,
} from "./types";

export { REQUIRED_COLUMNS } from "./types";
export { VALID_CHANNELS, VALID_STATUSES, COLUMN_ALIASES } from "./constants";

export {
  parseUploadedFile,
  suggestColumnMapping,
  isMappingComplete,
  type RawParseResult,
} from "./parse";

export {
  validateColumnMapping,
  mapRowsToOrders,
  validateOrders,
  buildParsePreview,
} from "./validate";

export { generateDemandBase, buildWeeklyAggregates } from "./demand";

export {
  getStoredOrders,
  saveOrders,
  getColumnMapping,
  saveColumnMapping,
  getGeneratedDemand,
  saveGeneratedDemand,
  getDataSource,
  setDataSource,
  hasLoadedDemand,
  clearLoadedData,
  persistDataPipeline,
  DATA_CHANGED_EVENT,
} from "./store";

export { downloadOrdersTemplate } from "./template";
export { exportOrdersCsv } from "./export";
export { ordersFromMock } from "./demo";

export {
  normalizeUploadedData,
  validateDataset,
  fillMissingPeriods,
  aggregateDemand,
  generateFallbackSeries,
} from "../dataNormalization";
