"use client";

import { useState } from "react";
import InputPanel from "@/components/InputPanel";
import TradeCard from "@/components/TradeCard";
import { TradeSignal } from "@/types/trading";

interface AnalyzeResult {
  data: TradeSignal;
  symbol: string;
  timeframe: string;
  timestamp: number;
}

export default function TradingAssistantPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [timeframe, setTimeframe] = useState("1h");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, timeframe }),
      });

      const json = await res.json();

      if (!json.success) {
        setError(json.error || "Analysis failed");
        return;
      }

      setResult({
        data: json.data,
        symbol: json.symbol,
        timeframe: json.timeframe,
        timestamp: json.timestamp,
      });
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Barlow+Condensed:wght@300;400;500;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080c10;
          --bg-panel: #0d1117;
          --bg-card: #0f1520;
          --bg-elevated: #161d28;
          --border: #1e2a38;
          --border-bright: #2a3a50;

          --text-primary: #e8edf2;
          --text-secondary: #6b7d8f;
          --text-muted: #3d4f60;

          --long: #00e676;
          --long-dim: #00e67622;
          --long-mid: #00e67644;
          --short: #ff3d5a;
          --short-dim: #ff3d5a22;
          --short-mid: #ff3d5a44;
          --neutral: #7986cb;
          --neutral-dim: #7986cb22;

          --amber: #ffc107;
          --amber-dim: #ffc10720;
          --cyan: #00bcd4;
          --cyan-dim: #00bcd420;

          --font-mono: 'Space Mono', monospace;
          --font-display: 'Barlow Condensed', sans-serif;

          --radius: 4px;
          --radius-lg: 8px;
        }

        body {
          background: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-mono);
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* ─── PAGE LAYOUT ─── */
        .page-wrapper {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
        }

        /* Scanline overlay */
        .page-wrapper::before {
          content: '';
          position: fixed;
          inset: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0,0,0,0.03) 2px,
            rgba(0,0,0,0.03) 4px
          );
          pointer-events: none;
          z-index: 1000;
        }

        /* Grid background */
        .page-wrapper::after {
          content: '';
          position: fixed;
          inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.25;
          pointer-events: none;
        }

        /* ─── HEADER ─── */
        .page-header {
          position: relative;
          z-index: 10;
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-panel);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .header-left {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }

        .header-title {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--text-primary);
        }

        .header-sub {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.15em;
          text-transform: uppercase;
        }

        .header-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10px;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--long);
          box-shadow: 0 0 6px var(--long);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ─── MAIN CONTENT ─── */
        .page-main {
          position: relative;
          z-index: 10;
          flex: 1;
          padding: 24px;
          max-width: 900px;
          width: 100%;
          margin: 0 auto;
        }

        /* ─── INPUT PANEL ─── */
        .input-panel {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 20px;
          margin-bottom: 24px;
        }

        .input-row {
          display: flex;
          gap: 12px;
          align-items: flex-end;
          flex-wrap: wrap;
        }

        .input-group {
          flex: 1;
          min-width: 140px;
        }

        .input-label {
          display: block;
          font-size: 9px;
          font-family: var(--font-mono);
          letter-spacing: 0.2em;
          color: var(--text-secondary);
          margin-bottom: 6px;
          text-transform: uppercase;
        }

        .select-wrapper {
          position: relative;
        }

        .input-select {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border-bright);
          border-radius: var(--radius);
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 10px 32px 10px 12px;
          appearance: none;
          cursor: pointer;
          transition: border-color 0.2s;
          letter-spacing: 0.05em;
        }

        .input-select:hover:not(:disabled),
        .input-select:focus {
          border-color: var(--cyan);
          outline: none;
          box-shadow: 0 0 0 1px var(--cyan-dim);
        }

        .input-select:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .select-arrow {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-secondary);
          pointer-events: none;
          font-size: 12px;
        }

        .analyze-btn {
          background: var(--bg);
          border: 1px solid var(--cyan);
          border-radius: var(--radius);
          color: var(--cyan);
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 14px;
          letter-spacing: 0.15em;
          padding: 10px 28px;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
          text-transform: uppercase;
          min-width: 140px;
        }

        .analyze-btn:hover:not(:disabled) {
          background: var(--cyan);
          color: var(--bg);
          box-shadow: 0 0 20px var(--cyan-dim);
        }

        .analyze-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .analyze-btn.loading {
          border-color: var(--text-muted);
          color: var(--text-muted);
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border: 2px solid var(--text-muted);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* ─── ERROR ─── */
        .error-block {
          background: var(--short-dim);
          border: 1px solid var(--short);
          border-radius: var(--radius);
          padding: 14px 18px;
          font-size: 12px;
          color: var(--short);
          letter-spacing: 0.05em;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* ─── SKELETON ─── */
        .skeleton-card {
          background: var(--bg-panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          padding: 24px;
          animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        .skeleton-line {
          background: var(--bg-elevated);
          border-radius: 3px;
          margin-bottom: 12px;
        }

        /* ─── TRADE CARD ─── */
        .trade-card {
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border);
          overflow: hidden;
          animation: fadeIn 0.4s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .trade-card.direction-long {
          border-top: 2px solid var(--long);
        }

        .trade-card.direction-short {
          border-top: 2px solid var(--short);
        }

        .trade-card.direction-neutral {
          border-top: 2px solid var(--neutral);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elevated);
        }

        .card-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .symbol-label {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 0.08em;
          color: var(--text-primary);
        }

        .tf-badge {
          background: var(--bg);
          border: 1px solid var(--border-bright);
          border-radius: 3px;
          padding: 2px 7px;
          font-size: 10px;
          color: var(--text-secondary);
          letter-spacing: 0.1em;
        }

        .setup-badge {
          background: var(--amber-dim);
          border: 1px solid var(--amber);
          border-radius: 3px;
          padding: 2px 7px;
          font-size: 9px;
          color: var(--amber);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .timestamp {
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          font-family: var(--font-mono);
        }

        /* ─── DIRECTION BANNER ─── */
        .direction-banner {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 20px 20px 18px;
          border-bottom: 1px solid var(--border);
        }

        .direction-long .direction-banner {
          background: linear-gradient(90deg, var(--long-dim) 0%, transparent 60%);
        }

        .direction-short .direction-banner {
          background: linear-gradient(90deg, var(--short-dim) 0%, transparent 60%);
        }

        .direction-neutral .direction-banner {
          background: linear-gradient(90deg, var(--neutral-dim) 0%, transparent 60%);
        }

        .direction-icon {
          font-size: 22px;
          line-height: 1;
        }

        .direction-long .direction-icon { color: var(--long); }
        .direction-short .direction-icon { color: var(--short); }
        .direction-neutral .direction-icon { color: var(--neutral); }

        .direction-text {
          font-family: var(--font-display);
          font-weight: 800;
          font-size: 36px;
          letter-spacing: 0.06em;
          line-height: 1;
        }

        .direction-long .direction-text { color: var(--long); text-shadow: 0 0 30px var(--long-mid); }
        .direction-short .direction-text { color: var(--short); text-shadow: 0 0 30px var(--short-mid); }
        .direction-neutral .direction-text { color: var(--neutral); }

        .trend-chip {
          background: var(--bg-elevated);
          border: 1px solid var(--border-bright);
          border-radius: 3px;
          padding: 4px 10px;
          font-size: 10px;
          color: var(--text-secondary);
          letter-spacing: 0.15em;
          font-family: var(--font-mono);
          margin-left: 4px;
        }

        /* ─── PRICE GRID ─── */
        .price-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          border-bottom: 1px solid var(--border);
        }

        @media (min-width: 500px) {
          .price-grid { grid-template-columns: repeat(4, 1fr); }
        }

        .price-cell {
          padding: 16px 20px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .price-cell:last-child { border-right: none; }
        .price-cell:nth-child(2) { border-right: 1px solid var(--border); }

        @media (min-width: 500px) {
          .price-cell:nth-child(2) { border-right: 1px solid var(--border); }
        }

        .price-label {
          font-size: 9px;
          letter-spacing: 0.18em;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .price-value {
          font-family: var(--font-mono);
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          letter-spacing: 0.03em;
        }

        .sl-value { color: var(--short); }
        .tp-value { color: var(--long); }
        .rr-value { color: var(--amber); }

        /* ─── CONFIDENCE ─── */
        .confidence-section {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .confidence-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .confidence-label {
          font-size: 9px;
          letter-spacing: 0.18em;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .confidence-value {
          font-family: var(--font-mono);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .confidence-track {
          position: relative;
          height: 6px;
          background: var(--bg-elevated);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .confidence-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .confidence-high {
          background: linear-gradient(90deg, var(--long), #69f0ae);
          box-shadow: 0 0 10px var(--long-mid);
        }

        .confidence-mid {
          background: linear-gradient(90deg, var(--amber), #ffeb3b);
          box-shadow: 0 0 10px var(--amber-dim);
        }

        .confidence-low {
          background: linear-gradient(90deg, var(--short), #ff8a80);
        }

        .confidence-labels {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: var(--text-muted);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* ─── INDICATORS ROW ─── */
        .indicators-row {
          display: flex;
          flex-wrap: wrap;
          border-bottom: 1px solid var(--border);
          background: var(--bg-panel);
        }

        .ind-cell {
          flex: 1;
          min-width: 90px;
          padding: 10px 16px;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ind-cell:last-child { border-right: none; }

        .ind-label {
          font-size: 8px;
          letter-spacing: 0.2em;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .ind-value {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .ind-tag {
          font-size: 8px;
          font-weight: 400;
          opacity: 0.8;
          letter-spacing: 0.1em;
        }

        /* ─── EXPLANATION ─── */
        .explanation-block {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
        }

        .explanation-label {
          font-size: 9px;
          letter-spacing: 0.18em;
          color: var(--text-secondary);
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .explanation-text {
          font-family: var(--font-mono);
          font-size: 12px;
          line-height: 1.7;
          color: var(--text-primary);
          opacity: 0.85;
        }

        /* ─── LEVELS ROW ─── */
        .levels-row {
          padding: 12px 20px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          background: var(--bg-elevated);
        }

        .levels-group {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .levels-tag {
          font-size: 9px;
          letter-spacing: 0.15em;
          padding: 2px 6px;
          border-radius: 2px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .support-tag {
          background: var(--long-dim);
          color: var(--long);
          border: 1px solid var(--long-dim);
        }

        .resistance-tag {
          background: var(--short-dim);
          color: var(--short);
          border: 1px solid var(--short-dim);
        }

        .level-pill {
          font-size: 10px;
          font-family: var(--font-mono);
          padding: 2px 8px;
          border-radius: 3px;
          letter-spacing: 0.04em;
        }

        .support-pill {
          background: var(--long-dim);
          color: var(--long);
          border: 1px solid rgba(0, 230, 118, 0.2);
        }

        .resistance-pill {
          background: var(--short-dim);
          color: var(--short);
          border: 1px solid rgba(255, 61, 90, 0.2);
        }

        /* ─── IDLE STATE ─── */
        .idle-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          gap: 16px;
          text-align: center;
        }

        .idle-icon {
          font-size: 40px;
          opacity: 0.2;
        }

        .idle-title {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: var(--text-secondary);
        }

        .idle-sub {
          font-size: 11px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          max-width: 320px;
          line-height: 1.6;
        }

        /* ─── DISCLAIMER ─── */
        .disclaimer {
          padding: 12px 24px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 9px;
          color: var(--text-muted);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          position: relative;
          z-index: 10;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 480px) {
          .page-header { padding: 14px 16px; }
          .page-main { padding: 16px; }
          .header-title { font-size: 18px; }
          .direction-text { font-size: 28px; }
          .price-value { font-size: 13px; }
          .input-row { gap: 10px; }
          .analyze-btn { width: 100%; }
        }
      `}</style>

      <div className="page-wrapper">
        {/* Header */}
        <header className="page-header">
          <div className="header-left">
            <h1 className="header-title">⬡ Trading Assistant</h1>
            <span className="header-sub">Technical Analysis Engine</span>
          </div>
          <div className="header-status">
            <div className="status-dot" />
            BINANCE · LIVE
          </div>
        </header>

        {/* Main */}
        <main className="page-main">
          <InputPanel
            symbol={symbol}
            timeframe={timeframe}
            loading={loading}
            onSymbolChange={setSymbol}
            onTimeframeChange={setTimeframe}
            onAnalyze={handleAnalyze}
          />

          {error && (
            <div className="error-block">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {loading && (
            <div className="skeleton-card">
              <div className="skeleton-line" style={{ height: 20, width: "40%" }} />
              <div className="skeleton-line" style={{ height: 48, width: "30%", marginTop: 16 }} />
              <div className="skeleton-line" style={{ height: 14, width: "100%", marginTop: 16 }} />
              <div className="skeleton-line" style={{ height: 14, width: "80%" }} />
              <div className="skeleton-line" style={{ height: 14, width: "60%" }} />
            </div>
          )}

          {!loading && result && (
            <TradeCard
              trade={result.data}
              symbol={result.symbol}
              timeframe={result.timeframe}
              timestamp={result.timestamp}
            />
          )}

          {!loading && !result && !error && (
            <div className="idle-state">
              <div className="idle-icon">◈</div>
              <div className="idle-title">Ready for Analysis</div>
              <div className="idle-sub">
                Select a trading pair and timeframe, then click Analyze to receive a signal based on real market data.
              </div>
            </div>
          )}
        </main>

        <footer className="disclaimer">
          Not financial advice · For educational purposes only · Trade at your own risk
        </footer>
      </div>
    </>
  );
}
