import {
  Candle,
  Levels,
  Setup,
  TrendResult,
  TradeSignal,
  CandlePatternResult,
  IndicatorResult,
  VolumeResult,
  FibLevels,
} from "@/types/trading";
import { atr, clamp, round, pricePrecision } from "@/lib/utils/math";
import {
  nearestSupport,
  nearestResistance,
} from "@/lib/strategy/supportResistance";
import { PATTERN_LABELS } from "@/lib/strategy/candlePatterns";

const MIN_RR = 2.0;

/**
 * Generate a complete trade signal from setup + all confluence signals.
 *
 * Confidence scoring applies bonuses/penalties from:
 *   - Trend alignment (existing)
 *   - RSI momentum (Wilder)
 *   - MACD (Murphy/Appel)
 *   - Candlestick pattern (Nison)
 *   - Volume confirmation (Wyckoff)
 *   - Fibonacci confluence (Murphy, Carter)
 */
export function generateTrade(
  candles: Candle[],
  trendResult: TrendResult,
  levels: Levels,
  setup: Setup,
  candlePattern: CandlePatternResult,
  indicators: IndicatorResult,
  volume: VolumeResult,
  fibLevels: FibLevels
): TradeSignal {
  const currentPrice = candles[candles.length - 1].close;
  const precision = pricePrecision(currentPrice);

  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const closes = candles.map((c) => c.close);
  const volatility = atr(highs, lows, closes, 14);

  if (setup.direction === "NO TRADE") {
    return noTrade(
      currentPrice,
      trendResult,
      levels,
      precision,
      candlePattern,
      indicators,
      volume,
      fibLevels
    );
  }

  const direction = setup.direction;
  let confidence = setup.confidence;
  let entry: number;
  let stopLoss: number;
  let takeProfit: number;

  if (direction === "LONG") {
    entry = round(currentPrice, precision);

    const support = nearestSupport(currentPrice, levels.supportLevels);
    if (support) {
      stopLoss = round(support - volatility * 0.5, precision);
      confidence += 10; // clear support level
    } else {
      stopLoss = round(entry - volatility * 2, precision);
    }

    const risk = entry - stopLoss;
    takeProfit = round(entry + risk * MIN_RR, precision);

    // Trend alignment bonus (existing logic)
    if (trendResult.trend === "bullish") confidence += 10;

    // RSI — Wilder
    if (indicators.rsiSignal === "oversold") confidence += 8;
    else if (indicators.rsiSignal === "overbought") confidence -= 8; // momentum divergence

    // MACD — Murphy/Appel
    if (indicators.macdSignal === "bullish") confidence += 7;
    else if (indicators.macdSignal === "bearish") confidence -= 5;

    // Candlestick pattern — Nison
    if (candlePattern.bias === "bullish") {
      confidence += Math.round(candlePattern.strength * 10);
    } else if (candlePattern.bias === "bearish") {
      confidence -= 8;
    }

    // Volume — Wyckoff
    if (volume.confirmsDirection) confidence += 5;
    else if (volume.trend === "decreasing") confidence -= 5;

    // Fibonacci confluence
    if (fibLevels.nearLevel !== null) confidence += 5;
  } else {
    // SHORT
    entry = round(currentPrice, precision);

    const resistance = nearestResistance(currentPrice, levels.resistanceLevels);
    if (resistance) {
      stopLoss = round(resistance + volatility * 0.5, precision);
      confidence += 10;
    } else {
      stopLoss = round(entry + volatility * 2, precision);
    }

    const risk = stopLoss - entry;
    takeProfit = round(entry - risk * MIN_RR, precision);

    if (trendResult.trend === "bearish") confidence += 10;

    // RSI — Wilder
    if (indicators.rsiSignal === "overbought") confidence += 8;
    else if (indicators.rsiSignal === "oversold") confidence -= 8;

    // MACD — Murphy/Appel
    if (indicators.macdSignal === "bearish") confidence += 7;
    else if (indicators.macdSignal === "bullish") confidence -= 5;

    // Candlestick pattern — Nison
    if (candlePattern.bias === "bearish") {
      confidence += Math.round(candlePattern.strength * 10);
    } else if (candlePattern.bias === "bullish") {
      confidence -= 8;
    }

    // Volume — Wyckoff
    if (volume.confirmsDirection) confidence += 5;
    else if (volume.trend === "decreasing") confidence -= 5;

    // Fibonacci confluence
    if (fibLevels.nearLevel !== null) confidence += 5;
  }

  const risk = Math.abs(entry - stopLoss);
  const reward = Math.abs(takeProfit - entry);
  const riskReward = round(reward / risk, 2);

  confidence = clamp(confidence, 10, 92);

  const explanation = buildExplanation(
    direction,
    trendResult,
    setup,
    candlePattern,
    indicators,
    volume,
    fibLevels,
    riskReward,
    confidence
  );

  return {
    direction,
    entry,
    stopLoss,
    takeProfit,
    riskReward,
    confidence,
    explanation,
    setup: setup.type,
    trend: trendResult.trend,
    levels,
    candlePattern,
    indicators,
    volume,
    fibLevels,
  };
}

function noTrade(
  price: number,
  trendResult: TrendResult,
  levels: Levels,
  precision: number,
  candlePattern: CandlePatternResult,
  indicators: IndicatorResult,
  volume: VolumeResult,
  fibLevels: FibLevels
): TradeSignal {
  return {
    direction: "NO TRADE",
    entry: round(price, precision),
    stopLoss: 0,
    takeProfit: 0,
    riskReward: 0,
    confidence: 0,
    explanation: `Market is ${trendResult.trend} with no high-probability setup. Price is not near a key level or actionable structure. As Mark Douglas noted in "Trading in the Zone" — waiting for the right setup IS a trading decision.`,
    setup: "none",
    trend: trendResult.trend,
    levels,
    candlePattern,
    indicators,
    volume,
    fibLevels,
  };
}

function buildExplanation(
  direction: "LONG" | "SHORT",
  trendResult: TrendResult,
  setup: Setup,
  candlePattern: CandlePatternResult,
  indicators: IndicatorResult,
  volume: VolumeResult,
  fibLevels: FibLevels,
  rr: number,
  confidence: number
): string {
  const parts: string[] = [];

  // Trend context
  const trendMsg =
    trendResult.trend === "sideways"
      ? "Trend is unclear (sideways)"
      : `${trendResult.trend.charAt(0).toUpperCase() + trendResult.trend.slice(1)} trend structure`;
  parts.push(trendMsg);

  // Setup rationale
  const setupMessages: Record<string, string> = {
    trend_continuation: `Price pulling back into a key ${direction === "LONG" ? "support" : "resistance"} zone — classic continuation entry (Murphy).`,
    sr_bounce: `Reacting off a significant ${direction === "LONG" ? "support" : "resistance"} level — S/R bounce setup.`,
    breakout: `Price broke ${direction === "LONG" ? "above resistance" : "below support"} — momentum continuation (Weinstein Stage ${direction === "LONG" ? "2" : "4"}).`,
  };
  if (setupMessages[setup.type]) parts.push(setupMessages[setup.type]);

  // Candlestick pattern (Nison)
  if (candlePattern.pattern !== "none") {
    const label = PATTERN_LABELS[candlePattern.pattern];
    const confirms = candlePattern.bias === (direction === "LONG" ? "bullish" : "bearish");
    parts.push(
      confirms
        ? `${label} pattern confirms entry (Nison).`
        : `${label} pattern detected — note divergence from signal direction.`
    );
  }

  // RSI (Wilder)
  const rsiMsg =
    indicators.rsiSignal === "oversold"
      ? `RSI ${indicators.rsi} — oversold territory (Wilder).`
      : indicators.rsiSignal === "overbought"
      ? `RSI ${indicators.rsi} — overbought territory (Wilder).`
      : `RSI ${indicators.rsi} — neutral momentum.`;
  parts.push(rsiMsg);

  // MACD (Murphy/Appel)
  if (indicators.macdSignal !== "neutral") {
    parts.push(
      `MACD histogram ${indicators.macdSignal} (Murphy/Appel).`
    );
  }

  // Volume (Wyckoff)
  if (volume.confirmsDirection) {
    parts.push("Volume expanding — conviction behind the move (Wyckoff).");
  } else if (volume.trend === "decreasing") {
    parts.push("Volume contracting — watch for false move (Wyckoff caution).");
  }

  // Fibonacci
  if (fibLevels.nearLevel !== null) {
    parts.push(`Price near Fibonacci level ${fibLevels.nearLevel} — structural confluence.`);
  }

  // Confidence verdict
  const confMsg =
    confidence >= 75
      ? `High-confidence setup (${confidence}%). R/R ${rr}:1.`
      : confidence >= 55
      ? `Moderate confidence (${confidence}%). R/R ${rr}:1. Size accordingly.`
      : `Low confidence (${confidence}%). R/R ${rr}:1. Reduce position size (Van Tharp).`;
  parts.push(confMsg);

  return parts.join(" ");
}
