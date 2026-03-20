import { Candle } from "@/types/trading";

export interface VolumeResult {
  trend: "increasing" | "decreasing" | "neutral";
  confirmsDirection: boolean;
}

/**
 * Wyckoff Volume Analysis
 *
 * Reference: Richard D. Wyckoff — "The Richard D. Wyckoff Method of Trading and Investing in Stocks"
 *
 * Core principle: Volume must confirm price movement.
 *   - Rising price + expanding volume   → healthy trend, confirms direction
 *   - Rising price + contracting volume → weak rally, divergence warning
 *   - Falling price + expanding volume  → heavy distribution, confirms direction
 *   - Falling price + contracting volume → weak selling, possible accumulation
 *
 * Expanding volume = current 5-bar avg > prior 15-bar avg by >15%
 * Contracting volume = current 5-bar avg < prior 15-bar avg by >15%
 */
export function analyzeVolume(candles: Candle[]): VolumeResult {
  if (candles.length < 20) {
    return { trend: "neutral", confirmsDirection: false };
  }

  const recent5 = candles.slice(-5);
  const prior15 = candles.slice(-20, -5);

  const recentAvg =
    recent5.reduce((s, c) => s + c.volume, 0) / recent5.length;
  const priorAvg =
    prior15.reduce((s, c) => s + c.volume, 0) / prior15.length;

  const ratio = recentAvg / (priorAvg || 1);

  const trend: VolumeResult["trend"] =
    ratio > 1.15 ? "increasing" : ratio < 0.85 ? "decreasing" : "neutral";

  // "Confirms direction" = volume is expanding (move has conviction behind it)
  const confirmsDirection = trend === "increasing";

  return { trend, confirmsDirection };
}
