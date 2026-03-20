export interface IndicatorResult {
  rsi: number;
  rsiSignal: "oversold" | "overbought" | "neutral";
  macdSignal: "bullish" | "bearish" | "neutral";
  macdHistogram: number;
}

/**
 * RSI — J. Welles Wilder (New Concepts in Technical Trading Systems, 1978)
 * Uses Wilder's smoothing method (SMMA).
 * Oversold < 35, Overbought > 65 (slightly wider than classic 30/70 for crypto).
 */
function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50;

  let avgGain = 0;
  let avgLoss = 0;

  // Seed: simple average of first `period` changes
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder's smoothing for remaining candles
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * EMA over an array — returns the full EMA array.
 */
function emaArray(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(0);
  if (values.length < period) return result;

  const k = 2 / (period + 1);

  // Seed with SMA of first `period` values
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  result[period - 1] = seed / period;

  for (let i = period; i < values.length; i++) {
    result[i] = values[i] * k + result[i - 1] * (1 - k);
  }

  return result;
}

/**
 * MACD — Gerald Appel, popularized by John Murphy (Technical Analysis of the Financial Markets).
 * Standard 12/26/9 settings.
 */
function calculateMACD(
  closes: number[]
): { macdLine: number; signalLine: number; histogram: number } {
  if (closes.length < 35) {
    return { macdLine: 0, signalLine: 0, histogram: 0 };
  }

  const ema12 = emaArray(closes, 12);
  const ema26 = emaArray(closes, 26);

  // MACD line (valid from index 25 onwards)
  const macdLine = closes.map((_, i) =>
    i >= 25 ? ema12[i] - ema26[i] : 0
  );

  const validMacd = macdLine.slice(25);
  if (validMacd.length < 9) {
    return { macdLine: macdLine[macdLine.length - 1], signalLine: 0, histogram: 0 };
  }

  // Signal = EMA(9) of MACD line
  const signalArr = emaArray(validMacd, 9);

  const currentMacd = macdLine[macdLine.length - 1];
  const currentSignal = signalArr[signalArr.length - 1];
  const histogram = currentMacd - currentSignal;

  return { macdLine: currentMacd, signalLine: currentSignal, histogram };
}

export function calculateIndicators(closes: number[]): IndicatorResult {
  const rsiRaw = calculateRSI(closes);
  const rsi = Math.round(rsiRaw * 10) / 10;

  const rsiSignal: IndicatorResult["rsiSignal"] =
    rsi < 35 ? "oversold" : rsi > 65 ? "overbought" : "neutral";

  const { histogram } = calculateMACD(closes);

  const macdSignal: IndicatorResult["macdSignal"] =
    histogram > 0 ? "bullish" : histogram < 0 ? "bearish" : "neutral";

  return {
    rsi,
    rsiSignal,
    macdSignal,
    macdHistogram: Math.round(histogram * 1e8) / 1e8,
  };
}

