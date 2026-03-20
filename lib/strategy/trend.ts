import { Candle, TrendResult, Trend } from "@/types/trading";
import { sma } from "@/lib/utils/math";

/**
 * Detect trend using two methods:
 * 1. SMA alignment (fast vs slow)
 * 2. Swing high/low structure (higher highs + higher lows = bullish, etc.)
 *
 * Returns a combined trend verdict with a strength score.
 */
export function detectTrend(candles: Candle[]): TrendResult {
  if (candles.length < 50) {
    return { trend: "sideways", strength: 0 };
  }

  const closes = candles.map((c) => c.close);

  // --- Method 1: SMA alignment ---
  const fastSMA = sma(closes, 20);
  const slowSMA = sma(closes, 50);
  const smaTrend: Trend =
    fastSMA > slowSMA * 1.002
      ? "bullish"
      : fastSMA < slowSMA * 0.998
      ? "bearish"
      : "sideways";

  // --- Method 2: Swing structure (last 30 candles) ---
  const recent = candles.slice(-30);
  const swingHighs = findSwingHighs(recent);
  const swingLows = findSwingLows(recent);

  const swingTrend = analyzeSwings(swingHighs, swingLows);

  // --- Combine ---
  let votes = { bullish: 0, bearish: 0, sideways: 0 };
  votes[smaTrend] += 1;
  votes[swingTrend.trend] += swingTrend.weight;

  let trend: Trend;
  let strength: number;

  if (votes.bullish > votes.bearish && votes.bullish > votes.sideways) {
    trend = "bullish";
    strength = Math.min(votes.bullish / (votes.bullish + votes.bearish + 0.1), 1);
  } else if (votes.bearish > votes.bullish && votes.bearish > votes.sideways) {
    trend = "bearish";
    strength = Math.min(votes.bearish / (votes.bearish + votes.bullish + 0.1), 1);
  } else {
    trend = "sideways";
    strength = 0.3;
  }

  return { trend, strength };
}

function findSwingHighs(candles: Candle[]): number[] {
  const highs: number[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const h = candles[i].high;
    if (
      h > candles[i - 1].high &&
      h > candles[i - 2].high &&
      h > candles[i + 1].high &&
      h > candles[i + 2].high
    ) {
      highs.push(h);
    }
  }
  return highs;
}

function findSwingLows(candles: Candle[]): number[] {
  const lows: number[] = [];
  for (let i = 2; i < candles.length - 2; i++) {
    const l = candles[i].low;
    if (
      l < candles[i - 1].low &&
      l < candles[i - 2].low &&
      l < candles[i + 1].low &&
      l < candles[i + 2].low
    ) {
      lows.push(l);
    }
  }
  return lows;
}

function analyzeSwings(
  highs: number[],
  lows: number[]
): { trend: Trend; weight: number } {
  if (highs.length < 2 || lows.length < 2) {
    return { trend: "sideways", weight: 0.5 };
  }

  const lastTwoHighs = highs.slice(-2);
  const lastTwoLows = lows.slice(-2);

  const hhPattern = lastTwoHighs[1] > lastTwoHighs[0]; // higher high
  const hlPattern = lastTwoLows[1] > lastTwoLows[0]; // higher low
  const lhPattern = lastTwoHighs[1] < lastTwoHighs[0]; // lower high
  const llPattern = lastTwoLows[1] < lastTwoLows[0]; // lower low

  if (hhPattern && hlPattern) return { trend: "bullish", weight: 1.5 };
  if (lhPattern && llPattern) return { trend: "bearish", weight: 1.5 };
  if (hhPattern || hlPattern) return { trend: "bullish", weight: 0.8 };
  if (lhPattern || llPattern) return { trend: "bearish", weight: 0.8 };

  return { trend: "sideways", weight: 0.5 };
}
