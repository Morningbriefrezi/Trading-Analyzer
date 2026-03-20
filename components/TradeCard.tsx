"use client";

import { TradeSignal } from "@/types/trading";
import { SETUP_LABELS } from "@/lib/strategy/setups";
import { PATTERN_LABELS } from "@/lib/strategy/candlePatterns";

interface TradeCardProps {
  trade: TradeSignal;
  symbol: string;
  timeframe: string;
  timestamp: number;
}

export default function TradeCard({
  trade,
  symbol,
  timeframe,
  timestamp,
}: TradeCardProps) {
  const isLong = trade.direction === "LONG";
  const isShort = trade.direction === "SHORT";
  const isNoTrade = trade.direction === "NO TRADE";

  const directionClass = isLong
    ? "direction-long"
    : isShort
    ? "direction-short"
    : "direction-neutral";

  const formattedTime = new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const rsiColor =
    trade.indicators.rsiSignal === "oversold"
      ? "var(--long)"
      : trade.indicators.rsiSignal === "overbought"
      ? "var(--short)"
      : "var(--text-secondary)";

  const macdColor =
    trade.indicators.macdSignal === "bullish"
      ? "var(--long)"
      : trade.indicators.macdSignal === "bearish"
      ? "var(--short)"
      : "var(--text-secondary)";

  const volColor =
    trade.volume.trend === "increasing"
      ? "var(--long)"
      : trade.volume.trend === "decreasing"
      ? "var(--short)"
      : "var(--text-secondary)";

  const patternColor =
    trade.candlePattern.bias === "bullish"
      ? "var(--long)"
      : trade.candlePattern.bias === "bearish"
      ? "var(--short)"
      : "var(--text-secondary)";

  return (
    <div className={`trade-card ${directionClass}`}>
      {/* Header */}
      <div className="card-header">
        <div className="card-title">
          <span className="symbol-label">{symbol}</span>
          <span className="tf-badge">{timeframe.toUpperCase()}</span>
          <span className="setup-badge">{SETUP_LABELS[trade.setup]}</span>
        </div>
        <span className="timestamp">{formattedTime}</span>
      </div>

      {/* Direction Banner */}
      <div className={`direction-banner ${directionClass}`}>
        <span className="direction-icon">
          {isLong ? "▲" : isShort ? "▼" : "◆"}
        </span>
        <span className="direction-text">{trade.direction}</span>
        {!isNoTrade && (
          <span className="trend-chip">{trade.trend.toUpperCase()}</span>
        )}
      </div>

      {!isNoTrade && (
        <>
          {/* Price Grid */}
          <div className="price-grid">
            <div className="price-cell">
              <span className="price-label">ENTRY</span>
              <span className="price-value">{formatPrice(trade.entry)}</span>
            </div>
            <div className="price-cell">
              <span className="price-label">STOP LOSS</span>
              <span className="price-value sl-value">
                {formatPrice(trade.stopLoss)}
              </span>
            </div>
            <div className="price-cell">
              <span className="price-label">TAKE PROFIT</span>
              <span className="price-value tp-value">
                {formatPrice(trade.takeProfit)}
              </span>
            </div>
            <div className="price-cell">
              <span className="price-label">RISK / REWARD</span>
              <span className="price-value rr-value">1 : {trade.riskReward}</span>
            </div>
          </div>

          {/* Confidence Bar */}
          <div className="confidence-section">
            <div className="confidence-header">
              <span className="confidence-label">CONFIDENCE</span>
              <span className="confidence-value">{trade.confidence}%</span>
            </div>
            <div className="confidence-track">
              <div
                className={`confidence-fill ${getConfidenceClass(trade.confidence)}`}
                style={{ width: `${trade.confidence}%` }}
              />
            </div>
            <div className="confidence-labels">
              <span>WEAK</span>
              <span>MODERATE</span>
              <span>STRONG</span>
            </div>
          </div>

          {/* Indicators Row */}
          <div className="indicators-row">
            <div className="ind-cell">
              <span className="ind-label">RSI</span>
              <span className="ind-value" style={{ color: rsiColor }}>
                {trade.indicators.rsi}
                <span className="ind-tag">
                  {trade.indicators.rsiSignal !== "neutral"
                    ? trade.indicators.rsiSignal.toUpperCase()
                    : ""}
                </span>
              </span>
            </div>
            <div className="ind-cell">
              <span className="ind-label">MACD</span>
              <span className="ind-value" style={{ color: macdColor }}>
                {trade.indicators.macdSignal.toUpperCase()}
              </span>
            </div>
            <div className="ind-cell">
              <span className="ind-label">VOLUME</span>
              <span className="ind-value" style={{ color: volColor }}>
                {trade.volume.trend.toUpperCase()}
              </span>
            </div>
            <div className="ind-cell">
              <span className="ind-label">PATTERN</span>
              <span className="ind-value" style={{ color: patternColor }}>
                {trade.candlePattern.pattern === "none"
                  ? "—"
                  : PATTERN_LABELS[trade.candlePattern.pattern]}
              </span>
            </div>
            {trade.fibLevels.nearLevel !== null && (
              <div className="ind-cell">
                <span className="ind-label">FIB ZONE</span>
                <span className="ind-value" style={{ color: "var(--amber)" }}>
                  {formatPrice(trade.fibLevels.nearLevel)}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Explanation */}
      <div className="explanation-block">
        <div className="explanation-label">SIGNAL ANALYSIS</div>
        <p className="explanation-text">{trade.explanation}</p>
      </div>

      {/* Levels Footer */}
      {!isNoTrade && trade.levels.supportLevels.length > 0 && (
        <div className="levels-row">
          <div className="levels-group">
            <span className="levels-tag support-tag">SUP</span>
            {trade.levels.supportLevels.slice(-3).map((l, i) => (
              <span key={i} className="level-pill support-pill">
                {formatPrice(l)}
              </span>
            ))}
          </div>
          <div className="levels-group">
            <span className="levels-tag resistance-tag">RES</span>
            {trade.levels.resistanceLevels.slice(0, 3).map((l, i) => (
              <span key={i} className="level-pill resistance-pill">
                {formatPrice(l)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatPrice(price: number): string {
  if (price >= 1000)
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

function getConfidenceClass(confidence: number): string {
  if (confidence >= 70) return "confidence-high";
  if (confidence >= 50) return "confidence-mid";
  return "confidence-low";
}
