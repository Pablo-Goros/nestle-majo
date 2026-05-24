export type {
  Product,
  Channel,
  MonthlyDemandPoint,
  WeeklyDemandPoint,
  ChannelForecastPoint,
  ProductInsight,
  ProductFinancials,
  InventorySnapshot,
  SkuChannelPlanningContext,
  DemoCatalog,
  SkuPlanningBundle,
} from "./types";

export {
  DEMO_PRODUCTS,
  DEMO_CHANNELS,
  DEMO_INSIGHTS,
  CRITICAL_SKU_CODES,
  buildFinancials,
  buildInventory,
} from "./catalog";

export {
  seedFromCode,
  generateMonthlyHistory,
  generateWeeklyForecast,
  generateChannelForecasts,
  generateLag3Pairs,
} from "./generators";

export {
  getDemoCatalog,
  getSkuBundle,
  getSkuChannelContext,
  getAllSkuChannelContexts,
  getHistoryActuals,
} from "./datasets";
