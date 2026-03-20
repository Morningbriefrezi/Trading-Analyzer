import { Candle } from "@/types/trading";
import { round, pricePrecision } from "@/lib/utils/math";

export interface FibLevels {
  swingHigh: number;
  swingLow: number;
  retracements: { ratio: number; price: number }[];
  nearLevel: number | null; // nearest fib level within 1% of current price
}

/**
 * Fibonacci Retracement Levels
 *
 * Widely applied across all major technical analysis schools.
 * Referenced extensively in:
 *   - John Murphy — "Technical Analysis of the Financial Markets"
 *   - Stan Weinstein — "Secrets For Profiting in Bull and Bear Markets"
 *   - John Carter — "Mastering the Trade"
 *
 * Calculates key retracement levels from the swing high/low
 * of the last 50 candles. When price is near a fib level that also
 * coincides with a S/R zone, confluence is very high.
 */
export function calculateFibLevels(candles: Candle[]): FibLevels {
  const lookback = candles.slice(-50);
  const highs = lookback.map((c) => c.high);
  const lows = lookback.map((c) => c.low);

  const swingHigh = Math.max(...highs);
  const swingLow = Math.min(...lows);
  const range = swingHigh - swingLow;

  const precision = pricePrecision(swingHigh);

  // Standard Fibonacci ratios (23.6% often considered minor, 61.8% = "golden ratio")
  const ratios = [0.236, 0.382, 0.5, 0.618, 0.786];
  const retracements = ratios.map((ratio) => ({
    ratio,
    price: round(swingHigh - range * ratio, precision),
  }));

  const currentPrice = candles[candles.length - 1].close;

  // Find nearest fib level within 1% of current price
  let nearLevel: number | null = null;
  let minDist = Infinity;
  for (const { price } of retracements) {
    const dist = (Math.abs(currentPrice - price) / currentPrice) * 100;
    if (dist < 1.0 && dist < minDist) {
      minDist = dist;
      nearLevel = price;
    }
  }

  return { swingHigh, swingLow, retracements, nearLevel };
}
