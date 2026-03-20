"use client";

import { SUPPORTED_SYMBOLS, SUPPORTED_TIMEFRAMES } from "@/lib/data/binance";

interface InputPanelProps {
  symbol: string;
  timeframe: string;
  loading: boolean;
  onSymbolChange: (s: string) => void;
  onTimeframeChange: (t: string) => void;
  onAnalyze: () => void;
}

export default function InputPanel({
  symbol,
  timeframe,
  loading,
  onSymbolChange,
  onTimeframeChange,
  onAnalyze,
}: InputPanelProps) {
  return (
    <div className="input-panel">
      <div className="input-row">
        <div className="input-group">
          <label className="input-label">PAIR</label>
          <div className="select-wrapper">
            <select
              value={symbol}
              onChange={(e) => onSymbolChange(e.target.value)}
              className="input-select"
              disabled={loading}
            >
              {SUPPORTED_SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <span className="select-arrow">▾</span>
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">TIMEFRAME</label>
          <div className="select-wrapper">
            <select
              value={timeframe}
              onChange={(e) => onTimeframeChange(e.target.value)}
              className="input-select"
              disabled={loading}
            >
              {SUPPORTED_TIMEFRAMES.map((tf) => (
                <option key={tf.value} value={tf.value}>
                  {tf.label}
                </option>
              ))}
            </select>
            <span className="select-arrow">▾</span>
          </div>
        </div>

        <button
          onClick={onAnalyze}
          disabled={loading}
          className={`analyze-btn ${loading ? "loading" : ""}`}
        >
          {loading ? (
            <span className="btn-loading">
              <span className="spinner" />
              SCANNING
            </span>
          ) : (
            "▶ ANALYZE"
          )}
        </button>
      </div>
    </div>
  );
}
