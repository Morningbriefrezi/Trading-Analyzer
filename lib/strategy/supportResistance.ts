import { Candle, Levels } from "@/types/trading";
import { round, pricePrecision } from "@/lib/utils/math";

/**
 * Identify support and resistance levels from swing points.
 * Uses last 100 candles, clusters nearby levels to remove noise.
 */
export function detectLevels(candles: Candle[]): Levels {
  const lookback = candles.slice(-100);
  const precision = pricePrecision(candles[candles.length - 1].close);

  const rawResistance = findSwingHighs(lookback);
  const rawSupport = findSwingLows(lookback);

  const resistanceLevels = clusterLevels(rawResistance, precision)
    .sort((a, b) => a - b)
    .slice(-5); // top 5 resistance levels

  const supportLevels = clusterLevels(rawSupport, precision)
    .sort((a, b) => a - b)
    .slice(-5); // top 5 support levels

  return { supportLevels, resistanceLevels };
}

function findSwingHighs(candles: Candle[]): number[] {
  const highs: number[] = [];
  for (let i = 3; i < candles.length - 3; i++) {
    const h = candles[i].high;
    const isSwing =
      h > candles[i - 1].high &&
      h > candles[i - 2].high &&
      h > candles[i - 3].high &&
      h > candles[i + 1].high &&
      h > candles[i + 2].high &&
      h > candles[i + 3].high;
    if (isSwing) highs.push(h);
  }
  return highs;
}

function findSwingLows(candles: Candle[]): number[] {
  const lows: number[] = [];
  for (let i = 3; i < candles.length - 3; i++) {
    const l = candles[i].low;
    const isSwing =
      l < candles[i - 1].low &&
      l < candles[i - 2].low &&
      l < candles[i - 3].low &&
      l < candles[i + 1].low &&
      l < candles[i + 2].low &&
      l < candles[i + 3].low;
    if (isSwing) lows.push(l);
  }
  return lows;
}

/**
 * Cluster nearby price levels together.
 * Levels within 0.3% of each other are merged into their average.
 */
function clusterLevels(levels: number[], precision: number): number[] {
  if (levels.length === 0) return [];

  const sorted = [...levels].sort((a, b) => a - b);
  const clusters: number[][] = [];
  let current: number[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const pctDiff = Math.abs(sorted[i] - sorted[i - 1]) / sorted[i - 1];
    if (pctDiff < 0.003) {
      current.push(sorted[i]);
    } else {
      clusters.push(current);
      current = [sorted[i]];
    }
  }
  clusters.push(current);

  return clusters.map((cluster) => {
    const avg = cluster.reduce((a, b) => a + b, 0) / cluster.length;
    return round(avg, precision);
  });
}

/**
 * Get the nearest support level below the current price.
 */
export function nearestSupport(
  price: number,
  levels: number[]
): number | null {
  const below = levels.filter((l) => l < price);
  if (below.length === 0) return null;
  return Math.max(...below);
}

/**
 * Get the nearest resistance level above the current price.
 */
export function nearestResistance(
  price: number,
  levels: number[]
): number | null {
  const above = levels.filter((l) => l > price);
  if (above.length === 0) return null;
  return Math.min(...above);
}
