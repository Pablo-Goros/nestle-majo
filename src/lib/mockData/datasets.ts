import {
  calculateBias,
  calculateDPALag3,
  calculateTrackingSignal,
} from "@/lib/analytics";
import {
  DEMO_CHANNELS,
  DEMO_INSIGHTS,
  DEMO_PRODUCTS,
  CRITICAL_SKU_CODES,
  buildFinancials,
  buildInventory,
} from "./catalog";
import {
  generateChannelForecasts,
  generateLag3Pairs,
  generateMonthlyHistory,
  generateWeeklyForecast,
} from "./generators";
import { getGeneratedDemand } from "@/lib/data";
import { getSkuCleaning } from "@/lib/cleaning";
import type {
  DemoCatalog,
  SkuChannelPlanningContext,
  SkuPlanningBundle,
} from "./types";

function mergeLoadedBundle(bundle: SkuPlanningBundle): SkuPlanningBundle {
  const loaded = getGeneratedDemand();
  const skuData = loaded?.bySku[bundle.product.code];
  const cleaned = getSkuCleaning(bundle.product.code);

  let merged: SkuPlanningBundle = bundle;

  if (skuData) {
    merged = {
      ...merged,
      monthlyHistory:
        skuData.monthlyHistory.length > 0
          ? skuData.monthlyHistory
          : merged.monthlyHistory,
      weeklyForecast:
        skuData.weeklyForecast.length > 0
          ? skuData.weeklyForecast
          : merged.weeklyForecast,
      channelForecasts: skuData.channelForecasts.some((c) => c.baseline > 0)
        ? skuData.channelForecasts
        : merged.channelForecasts,
    };
  }

  if (cleaned) {
    merged = {
      ...merged,
      monthlyHistory:
        cleaned.monthlyHistory.length > 0
          ? cleaned.monthlyHistory
          : merged.monthlyHistory,
      weeklyForecast:
        cleaned.weeklyForecast.length > 0
          ? cleaned.weeklyForecast
          : merged.weeklyForecast,
    };
  }

  return merged;
}

function skuChannelKey(skuCode: string, channelKey: string): string {
  return `${skuCode}::${channelKey}`;
}

function buildSkuBundle(product: (typeof DEMO_PRODUCTS)[number]): SkuPlanningBundle {
  const monthlyHistory = generateMonthlyHistory(product.code);
  const weeklyForecast = generateWeeklyForecast(product.code);
  const channelForecasts = generateChannelForecasts(product.code, DEMO_CHANNELS);
  const insights = DEMO_INSIGHTS.filter((i) => i.skuCode === product.code);

  return {
    product,
    monthlyHistory,
    weeklyForecast,
    channelForecasts,
    insights,
    financials: buildFinancials(product),
    inventory: buildInventory(product, DEMO_CHANNELS),
    isCriticalSku: CRITICAL_SKU_CODES.has(product.code),
  };
}

function buildSkuChannelContext(
  bundle: SkuPlanningBundle,
  channel: (typeof DEMO_CHANNELS)[number],
): SkuChannelPlanningContext {
  const channelForecast = bundle.channelForecasts.find(
    (c) => c.channelKey === channel.key,
  )!;
  const consensusVsBaselinePct =
    channelForecast.baseline === 0
      ? 0
      : ((channelForecast.consensus - channelForecast.baseline) /
          channelForecast.baseline) *
        100;

  const lag3Pairs = generateLag3Pairs(bundle.monthlyHistory);
  const inSamplePairs = bundle.monthlyHistory
    .filter((m): m is typeof m & { actual: number } => m.actual != null)
    .map((m) => ({ actual: m.actual, forecast: m.baseline }));

  const inventory =
    bundle.inventory.find((inv) => inv.channel === channel.name) ??
    bundle.inventory[0]!;

  return {
    product: bundle.product,
    channel,
    monthlyHistory: bundle.monthlyHistory,
    weeklyForecast: bundle.weeklyForecast,
    lag3Pairs,
    dpaLag3: calculateDPALag3(lag3Pairs),
    biasPercent: calculateBias(inSamplePairs),
    trackingSignal: calculateTrackingSignal(inSamplePairs),
    consensusVsBaselinePct,
    financials: bundle.financials,
    inventory,
    insights: bundle.insights.filter(
      (i) => i.channel === channel.name || i.channel === "Todos",
    ),
    isCriticalSku: bundle.isCriticalSku,
  };
}

let cachedCatalog: DemoCatalog | null = null;

/** Catálogo demo completo (lazy singleton) */
export function getDemoCatalog(): DemoCatalog {
  if (cachedCatalog) return cachedCatalog;

  const bySku: Record<string, SkuPlanningBundle> = {};
  const bySkuChannel: Record<string, SkuChannelPlanningContext> = {};

  for (const product of DEMO_PRODUCTS) {
    const bundle = buildSkuBundle(product);
    bySku[product.code] = bundle;

    for (const channel of DEMO_CHANNELS) {
      bySkuChannel[skuChannelKey(product.code, channel.key)] =
        buildSkuChannelContext(bundle, channel);
    }
  }

  cachedCatalog = {
    products: DEMO_PRODUCTS,
    channels: DEMO_CHANNELS,
    bySku,
    bySkuChannel,
  };

  return cachedCatalog;
}

export function getSkuBundle(skuCode: string): SkuPlanningBundle | undefined {
  const bundle = getDemoCatalog().bySku[skuCode];
  if (!bundle) return undefined;
  return mergeLoadedBundle(bundle);
}

export function getSkuChannelContext(
  skuCode: string,
  channelKey: string,
): SkuChannelPlanningContext | undefined {
  return getDemoCatalog().bySkuChannel[skuChannelKey(skuCode, channelKey)];
}

export function getAllSkuChannelContexts(): SkuChannelPlanningContext[] {
  return Object.values(getDemoCatalog().bySkuChannel);
}

/** Serie histórica numérica para modelos de forecasting */
export function getHistoryActuals(skuCode: string): number[] {
  const bundle = getSkuBundle(skuCode);
  if (!bundle) return [];
  return bundle.monthlyHistory
    .filter((m): m is typeof m & { actual: number } => m.actual != null)
    .map((m) => m.actual);
}
