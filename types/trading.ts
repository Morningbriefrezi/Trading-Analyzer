export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type Trend = "bullish" | "bearish" | "sideways";
export type Direction = "LONG" | "SHORT" | "NO TRADE";
export type SetupType = "trend_continuation" | "sr_bounce" | "breakout" | "none";

export interface TrendResult {
  trend: Trend;
  strength: number; // 0-1
}

export interface Levels {
  supportLevels: number[];
  resistanceLevels: number[];
}

export interface Setup {
  type: SetupType;
  direction: Direction;
  confidence: number;
}

// ── New signal types ───────────────────────────────────────────────────────

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
  strength: number; // 0-1
}

export interface IndicatorResult {
  rsi: number;
  rsiSignal: "oversold" | "overbought" | "neutral";
  macdSignal: "bullish" | "bearish" | "neutral";
  macdHistogram: number;
}

export interface VolumeResult {
  trend: "increasing" | "decreasing" | "neutral";
  confirmsDirection: boolean;
}

export interface FibLevels {
  swingHigh: number;
  swingLow: number;
  retracements: { ratio: number; price: number }[];
  nearLevel: number | null;
}

// ── Trade signal ───────────────────────────────────────────────────────────

export interface TradeSignal {
  direction: Direction;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  confidence: number;
  explanation: string;
  setup: SetupType;
  trend: Trend;
  levels: Levels;
  // New signal fields
  candlePattern: CandlePatternResult;
  indicators: IndicatorResult;
  volume: VolumeResult;
  fibLevels: FibLevels;
}

export interface AnalyzeRequest {
  symbol: string;
  timeframe: string;
}

export interface AnalyzeResponse {
  success: true;
  data: TradeSignal;
  symbol: string;
  timeframe: string;
  timestamp: number;
}

export interface AnalyzeError {
  success: false;
  error: string;
}
