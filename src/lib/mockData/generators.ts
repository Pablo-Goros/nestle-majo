import type {
  ChannelForecastPoint,
  MonthlyDemandPoint,
  WeeklyDemandPoint,
} from "./types";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const CHANNEL_WEIGHTS = [0.42, 0.18, 0.15, 0.16, 0.09];

export function seedFromCode(code: string): number {
  return code.charCodeAt(0) + (code.charCodeAt(1) ?? 0);
}

export function generateMonthlyHistory(
  productCode: string,
  historyMonths = 9,
): MonthlyDemandPoint[] {
  const seed = seedFromCode(productCode);
  const base = 4000 + (seed % 9) * 800;

  return MONTHS.map((month, i) => {
    const season = 1 + 0.18 * Math.sin((i / 12) * Math.PI * 2 + seed);
    const noise = 1 + ((Math.sin(seed + i * 3.1) + 1) / 2 - 0.5) * 0.12;
    const baseline = Math.round(base * season);
    const consensus = Math.round(
      base * season * (1 + (i > 5 ? 0.06 : 0.02)),
    );
    const actual =
      i < historyMonths
        ? Math.round(base * season * noise)
        : null;
    return { month, actual, baseline, consensus };
  });
}

export function generateWeeklyForecast(
  productCode: string,
): WeeklyDemandPoint[] {
  const seed = productCode.charCodeAt(0);
  const base = 900 + (seed % 7) * 120;

  return Array.from({ length: 13 }, (_, i) => {
    const week = `S${i + 1}`;
    const baseline = Math.round(base * (1 + 0.1 * Math.sin(i / 3 + seed)));
    const adjustment = Math.round(
      baseline * (i % 4 === 0 ? 0.08 : i % 3 === 0 ? -0.04 : 0.02),
    );
    const consensus = baseline + adjustment;
    const actual =
      i < 3
        ? Math.round(baseline * (1 + ((i % 2 ? -1 : 1) * 0.05)))
        : null;
    return { week, actual, baseline, consensus };
  });
}

export function generateChannelForecasts(
  productCode: string,
  channels: { key: string; name: string }[],
): ChannelForecastPoint[] {
  const seed = seedFromCode(productCode);
  const total = 12000 + (seed % 8) * 1500;

  return channels.map((ch, i) => {
    const baseline = Math.round(total * (CHANNEL_WEIGHTS[i] ?? 0.1));
    const consensus = Math.round(
      baseline * (1 + (i % 2 ? 0.04 : -0.02)),
    );
    return {
      channel: ch.name,
      channelKey: ch.key,
      baseline,
      consensus,
    };
  });
}

export function generateLag3Pairs(
  monthly: MonthlyDemandPoint[],
  lag = 3,
): { actual: number; forecast: number; period: string }[] {
  const pairs: { actual: number; forecast: number; period: string }[] = [];

  for (let i = lag; i < monthly.length; i++) {
    const current = monthly[i]!;
    if (current.actual == null) continue;
    const lagPoint = monthly[i - lag]!;
    pairs.push({
      actual: current.actual,
      forecast: lagPoint.baseline,
      period: current.month,
    });
  }

  return pairs;
}
