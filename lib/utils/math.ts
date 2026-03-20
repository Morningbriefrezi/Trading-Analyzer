/** Round to N decimal places */
export function round(value: number, decimals: number = 2): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Percentage difference between two values */
export function pctDiff(a: number, b: number): number {
  return Math.abs((a - b) / b) * 100;
}

/** Simple moving average */
export function sma(values: number[], period: number): number {
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

/** Average True Range (ATR) — measures volatility */
export function atr(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): number {
  const trueRanges: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const hl = highs[i] - lows[i];
    const hc = Math.abs(highs[i] - closes[i - 1]);
    const lc = Math.abs(lows[i] - closes[i - 1]);
    trueRanges.push(Math.max(hl, hc, lc));
  }
  return sma(trueRanges, period);
}

/** Proximity check: is `price` within `thresholdPct`% of `level`? */
export function isNear(
  price: number,
  level: number,
  thresholdPct: number = 0.5
): boolean {
  return pctDiff(price, level) <= thresholdPct;
}

/** Find the closest value in an array to a target */
export function closest(target: number, values: number[]): number {
  return values.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev
  );
}

/** Decimal precision based on price magnitude */
export function pricePrecision(price: number): number {
  if (price >= 1000) return 2;
  if (price >= 100) return 3;
  if (price >= 1) return 4;
  return 6;
}
