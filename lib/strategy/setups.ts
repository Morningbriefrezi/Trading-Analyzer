import { TrendResult, Levels, Setup, SetupType } from "@/types/trading";
import { isNear } from "@/lib/utils/math";
import {
  nearestSupport,
  nearestResistance,
} from "@/lib/strategy/supportResistance";

const NEAR_THRESHOLD_PCT = 0.8; // within 0.8% = "near" a level
const BREAKOUT_THRESHOLD_PCT = 0.3; // just broke through within 0.3%

/**
 * Evaluate all 3 setups and return the highest-confidence one.
 */
export function selectSetup(
  price: number,
  trendResult: TrendResult,
  levels: Levels
): Setup {
  const candidates: Setup[] = [
    setupTrendContinuation(price, trendResult, levels),
    setupSRBounce(price, levels),
    setupBreakout(price, levels),
  ].filter((s) => s.type !== "none");

  if (candidates.length === 0) {
    return { type: "none", direction: "NO TRADE", confidence: 0 };
  }

  // Pick highest confidence; prefer trend-aligned setups as tiebreaker
  candidates.sort((a, b) => b.confidence - a.confidence);
  return candidates[0];
}

/**
 * Setup A: Trend Continuation
 * Bullish trend → look for LONG near support
 * Bearish trend → look for SHORT near resistance
 */
function setupTrendContinuation(
  price: number,
  { trend, strength }: TrendResult,
  levels: Levels
): Setup {
  if (trend === "sideways") return { type: "none", direction: "NO TRADE", confidence: 0 };

  const baseConfidence = 50 + Math.round(strength * 20);

  if (trend === "bullish") {
    const support = nearestSupport(price, levels.supportLevels);
    if (support && isNear(price, support, NEAR_THRESHOLD_PCT)) {
      return {
        type: "trend_continuation",
        direction: "LONG",
        confidence: baseConfidence + 10,
      };
    }
  }

  if (trend === "bearish") {
    const resistance = nearestResistance(price, levels.resistanceLevels);
    if (resistance && isNear(price, resistance, NEAR_THRESHOLD_PCT)) {
      return {
        type: "trend_continuation",
        direction: "SHORT",
        confidence: baseConfidence + 10,
      };
    }
  }

  return { type: "none", direction: "NO TRADE", confidence: 0 };
}

/**
 * Setup B: Support/Resistance Bounce
 * Price near support → LONG
 * Price near resistance → SHORT
 */
function setupSRBounce(price: number, levels: Levels): Setup {
  const nearSupport = levels.supportLevels.find((l) =>
    isNear(price, l, NEAR_THRESHOLD_PCT)
  );
  const nearResistance = levels.resistanceLevels.find((l) =>
    isNear(price, l, NEAR_THRESHOLD_PCT)
  );

  // If both are nearby, skip — price is in a squeeze
  if (nearSupport && nearResistance) {
    return { type: "none", direction: "NO TRADE", confidence: 0 };
  }

  if (nearSupport) {
    return { type: "sr_bounce", direction: "LONG", confidence: 60 };
  }

  if (nearResistance) {
    return { type: "sr_bounce", direction: "SHORT", confidence: 60 };
  }

  return { type: "none", direction: "NO TRADE", confidence: 0 };
}

/**
 * Setup C: Breakout
 * Price just broke above resistance → LONG
 * Price just broke below support → SHORT
 */
function setupBreakout(price: number, levels: Levels): Setup {
  // Check if price recently broke above any resistance (price is just above a resistance level)
  const brokenResistance = levels.resistanceLevels.find(
    (l) => price > l && isNear(price, l, BREAKOUT_THRESHOLD_PCT + 0.5)
  );

  if (brokenResistance) {
    return { type: "breakout", direction: "LONG", confidence: 65 };
  }

  // Check if price recently broke below any support
  const brokenSupport = levels.supportLevels.find(
    (l) => price < l && isNear(price, l, BREAKOUT_THRESHOLD_PCT + 0.5)
  );

  if (brokenSupport) {
    return { type: "breakout", direction: "SHORT", confidence: 65 };
  }

  return { type: "none", direction: "NO TRADE", confidence: 0 };
}

export const SETUP_LABELS: Record<SetupType, string> = {
  trend_continuation: "Trend Continuation",
  sr_bounce: "S/R Bounce",
  breakout: "Breakout",
  none: "No Setup",
};
