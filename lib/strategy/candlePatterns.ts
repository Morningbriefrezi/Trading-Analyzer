import { Candle } from "@/types/trading";

export type CandlePatternName =
  | "hammer"
  | "shooting_star"
  | "bullish_engulfing"
  | "bearish_engulfing"
  | "doji"
  | "pin_bar_bull"
  | "pin_bar_bear"
  | "inside_bar"
  | "morning_star"
  | "evening_star"
  | "none";

export interface CandlePatternResult {
  pattern: CandlePatternName;
  bias: "bullish" | "bearish" | "neutral";
  strength: number; // 0–1
}

const bodySize = (c: Candle) => Math.abs(c.close - c.open);
const totalRange = (c: Candle) => c.high - c.low;
const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;
const isBullish = (c: Candle) => c.close > c.open;
const isBearish = (c: Candle) => c.close < c.open;

/**
 * Detect candlestick patterns from the last 3 candles.
 *
 * Reference: Steve Nison — "Japanese Candlestick Charting Techniques" (1991)
 * Patterns are evaluated most-specific first (3-candle > 2-candle > 1-candle).
 */
export function detectCandlePattern(candles: Candle[]): CandlePatternResult {
  if (candles.length < 3) return { pattern: "none", bias: "neutral", strength: 0 };

  const c0 = candles[candles.length - 1]; // current (most recent)
  const c1 = candles[candles.length - 2]; // previous
  const c2 = candles[candles.length - 3]; // two back

  // ── 3-candle patterns ────────────────────────────────────────────────────

  // Morning Star — strong bullish reversal after downtrend
  if (
    isBearish(c2) &&
    bodySize(c2) > totalRange(c2) * 0.6 &&
    bodySize(c1) < totalRange(c1) * 0.3 && // small indecision body
    isBullish(c0) &&
    bodySize(c0) > totalRange(c0) * 0.5 &&
    c0.close > (c2.open + c2.close) / 2
  ) {
    return { pattern: "morning_star", bias: "bullish", strength: 0.9 };
  }

  // Evening Star — strong bearish reversal after uptrend
  if (
    isBullish(c2) &&
    bodySize(c2) > totalRange(c2) * 0.6 &&
    bodySize(c1) < totalRange(c1) * 0.3 &&
    isBearish(c0) &&
    bodySize(c0) > totalRange(c0) * 0.5 &&
    c0.close < (c2.open + c2.close) / 2
  ) {
    return { pattern: "evening_star", bias: "bearish", strength: 0.9 };
  }

  // ── 2-candle patterns ────────────────────────────────────────────────────

  // Bullish Engulfing — current bullish candle fully engulfs prior bearish
  if (
    isBearish(c1) &&
    isBullish(c0) &&
    c0.open < c1.close &&
    c0.close > c1.open &&
    bodySize(c0) > bodySize(c1)
  ) {
    return { pattern: "bullish_engulfing", bias: "bullish", strength: 0.85 };
  }

  // Bearish Engulfing — current bearish candle fully engulfs prior bullish
  if (
    isBullish(c1) &&
    isBearish(c0) &&
    c0.open > c1.close &&
    c0.close < c1.open &&
    bodySize(c0) > bodySize(c1)
  ) {
    return { pattern: "bearish_engulfing", bias: "bearish", strength: 0.85 };
  }

  // Inside Bar (Harami) — compression, potential breakout incoming
  if (c0.high < c1.high && c0.low > c1.low) {
    const bias = isBullish(c1) ? "bullish" : isBearish(c1) ? "bearish" : "neutral";
    return { pattern: "inside_bar", bias, strength: 0.6 };
  }

  // ── Single-candle patterns ───────────────────────────────────────────────

  const range = totalRange(c0);
  if (range === 0) return { pattern: "none", bias: "neutral", strength: 0 };

  const body = bodySize(c0);
  const upper = upperWick(c0);
  const lower = lowerWick(c0);

  // Doji — indecision (body < 8% of range)
  if (body < range * 0.08) {
    return { pattern: "doji", bias: "neutral", strength: 0.5 };
  }

  // Hammer — small body, long lower wick, small upper wick (bullish reversal)
  if (lower > range * 0.55 && upper < range * 0.15 && body < range * 0.35) {
    return { pattern: "hammer", bias: "bullish", strength: 0.8 };
  }

  // Shooting Star — small body, long upper wick, small lower wick (bearish reversal)
  if (upper > range * 0.55 && lower < range * 0.15 && body < range * 0.35) {
    return { pattern: "shooting_star", bias: "bearish", strength: 0.8 };
  }

  // Bull Pin Bar — long lower wick dominates (Al Brooks / Chris Capre)
  if (lower > range * 0.65 && isBullish(c0)) {
    return { pattern: "pin_bar_bull", bias: "bullish", strength: 0.75 };
  }

  // Bear Pin Bar — long upper wick dominates
  if (upper > range * 0.65 && isBearish(c0)) {
    return { pattern: "pin_bar_bear", bias: "bearish", strength: 0.75 };
  }

  return { pattern: "none", bias: "neutral", strength: 0 };
}

export const PATTERN_LABELS: Record<CandlePatternName, string> = {
  hammer: "Hammer",
  shooting_star: "Shooting Star",
  bullish_engulfing: "Bullish Engulfing",
  bearish_engulfing: "Bearish Engulfing",
  doji: "Doji",
  pin_bar_bull: "Bull Pin Bar",
  pin_bar_bear: "Bear Pin Bar",
  inside_bar: "Inside Bar",
  morning_star: "Morning Star",
  evening_star: "Evening Star",
  none: "No Pattern",
};
