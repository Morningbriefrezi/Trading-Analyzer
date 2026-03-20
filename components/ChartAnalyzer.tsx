"use client";

import { useState, useRef, useCallback } from "react";

interface TpLevel {
  price: number;
  rr: string;
  label: string;
}

interface TradeSignal {
  pair: string;
  timeframe: string;
  direction: "LONG" | "SHORT" | "NO TRADE";
  entry: { price: number | null; zone: string | null; type: string } | null;
  stopLoss: { price: number | null; reason: string } | null;
  takeProfit: TpLevel[];
  riskReward: number | null;
  confidence: number;
  marketCycle: "accumulation" | "markup" | "distribution" | "markdown" | "unknown";
  trend: "bullish" | "bearish" | "sideways";
  sentiment: "bullish" | "bearish" | "neutral";
  pattern: string | null;
  candlestickSignal: string | null;
  keyLevels: { support: number[]; resistance: number[] };
  techniquesApplied: string[];
  analysis: string;
  invalidation: string;
  riskNote: string;
}

const LOADING_MESSAGES = [
  "Scanning market structure...",
  "Identifying cycle phase...",
  "Detecting patterns & confluences...",
  "Calculating entry zones and targets...",
  "Finalizing trade setup...",
];

const CYCLE_LABELS: Record<string, string> = {
  accumulation: "Accumulation",
  markup: "Markup",
  distribution: "Distribution",
  markdown: "Markdown",
  unknown: "Unknown",
};

const CYCLE_COLORS: Record<string, string> = {
  accumulation: "var(--cyan)",
  markup: "var(--long)",
  distribution: "var(--amber)",
  markdown: "var(--short)",
  unknown: "var(--text-muted)",
};

export default function ChartAnalyzer() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(0);
  const [result, setResult] = useState<TradeSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setImageBase64(dataUrl.split(",")[1]);
      setImagePreview(dataUrl);
      setResult(null);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const analyzeChart = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadingMsg(0);

    msgRef.current = setInterval(() => {
      setLoadingMsg((p) => (p + 1) % LOADING_MESSAGES.length);
    }, 1800);

    try {
      const res = await fetch("/api/chart-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mimeType: imageMime }),
      });

      const json = await res.json();
      if (!json.success || json.error) throw new Error(json.error || "Analysis failed");
      setResult(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      if (msgRef.current) clearInterval(msgRef.current);
      setLoading(false);
    }
  };

  const fmt = (n: number | null | undefined): string => {
    if (n === null || n === undefined) return "—";
    if (Math.abs(n) >= 1000)
      return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(n) >= 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  const isLong = result?.direction === "LONG";
  const isShort = result?.direction === "SHORT";
  const isNoTrade = result?.direction === "NO TRADE";
  const conf = result?.confidence ?? 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@300;400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #060a0e;
          --bg-panel: #0c1118;
          --bg-card: #0e1420;
          --bg-elevated: #141c28;
          --border: #1a2636;
          --border-bright: #243448;
          --text: #dde4ec;
          --text-muted: #5a7080;
          --text-dim: #2e3f50;
          --long: #00e676;
          --long-bg: #00e67612;
          --long-mid: #00e67640;
          --short: #ff3d5a;
          --short-bg: #ff3d5a12;
          --short-mid: #ff3d5a40;
          --neutral: #7986cb;
          --amber: #ffc107;
          --amber-bg: #ffc10712;
          --cyan: #00bcd4;
          --cyan-bg: #00bcd412;
          --font-mono: 'Space Mono', monospace;
          --font-display: 'Barlow Condensed', sans-serif;
          --r: 6px;
        }

        body { background: var(--bg); color: var(--text); font-family: var(--font-mono); min-height: 100vh; }

        .page { min-height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }

        /* Grid bg */
        .page::after {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: 0.18; pointer-events: none; z-index: 0;
        }

        /* ── HEADER ── */
        .header {
          position: relative; z-index: 10;
          padding: 16px 28px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-panel);
          display: flex; align-items: center; justify-content: space-between;
        }
        .header-logo { display: flex; align-items: baseline; gap: 12px; }
        .header-title {
          font-family: var(--font-display); font-size: 20px; font-weight: 800;
          letter-spacing: 0.12em; text-transform: uppercase; color: var(--text);
        }
        .header-sub { font-size: 9px; color: var(--text-muted); letter-spacing: 0.2em; text-transform: uppercase; }
        .ai-badge {
          display: flex; align-items: center; gap: 8px;
          font-size: 9px; color: var(--text-muted); letter-spacing: 0.12em;
        }
        .ai-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--cyan); box-shadow: 0 0 8px var(--cyan);
          animation: blink 2s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        /* ── MAIN ── */
        .main {
          position: relative; z-index: 10;
          flex: 1; padding: 24px;
          max-width: 900px; width: 100%; margin: 0 auto;
          display: flex; flex-direction: column; gap: 18px;
        }

        /* ── DROP ZONE ── */
        .drop-zone {
          border: 1.5px dashed var(--border-bright);
          border-radius: 12px; padding: 52px 24px;
          text-align: center; cursor: pointer;
          transition: all 0.2s;
          background: var(--bg-panel);
          position: relative;
        }
        .drop-zone:hover, .drop-zone.over {
          border-color: var(--cyan);
          background: var(--bg-elevated);
          box-shadow: inset 0 0 30px var(--cyan-bg);
        }
        .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .drop-icon { font-size: 36px; margin-bottom: 14px; opacity: 0.7; }
        .drop-title {
          font-family: var(--font-display); font-size: 20px; font-weight: 700;
          letter-spacing: 0.08em; margin-bottom: 8px; color: var(--text);
        }
        .drop-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.06em; line-height: 1.6; }
        .drop-hint {
          margin-top: 16px; font-size: 10px; color: var(--text-dim);
          letter-spacing: 0.12em; text-transform: uppercase;
        }

        /* ── PREVIEW ── */
        .preview-section { position: relative; }
        .preview-img {
          width: 100%; border-radius: 10px;
          border: 1px solid var(--border-bright);
          max-height: 400px; object-fit: contain;
          background: var(--bg-panel); display: block;
        }
        .preview-actions {
          position: absolute; top: 12px; right: 12px;
          display: flex; gap: 8px;
        }
        .btn-sm {
          background: var(--bg-panel); border: 1px solid var(--border-bright);
          border-radius: 5px; padding: 5px 12px;
          font-size: 10px; font-family: var(--font-mono);
          color: var(--text-muted); cursor: pointer;
          letter-spacing: 0.08em; text-transform: uppercase;
          transition: all 0.2s;
        }
        .btn-sm:hover { color: var(--short); border-color: var(--short); }

        /* ── ANALYZE BTN ── */
        .analyze-btn {
          width: 100%; padding: 15px;
          font-family: var(--font-display); font-size: 17px; font-weight: 800;
          letter-spacing: 0.16em; text-transform: uppercase;
          background: var(--bg-panel); border: 1px solid var(--cyan);
          border-radius: var(--r); color: var(--cyan); cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .analyze-btn:hover:not(:disabled) {
          background: var(--cyan); color: var(--bg);
          box-shadow: 0 0 30px var(--cyan-bg);
        }
        .analyze-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* ── LOADING ── */
        .loading-wrap { display: flex; flex-direction: column; gap: 10px; }
        .loading-bar { height: 2px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
        .loading-fill { height: 100%; background: var(--cyan); border-radius: 2px; animation: loadpulse 2s ease-in-out infinite; }
        @keyframes loadpulse { 0%{width:5%} 50%{width:75%} 100%{width:95%} }
        .loading-msg { text-align: center; font-size: 11px; color: var(--text-muted); letter-spacing: 0.12em; }

        /* ── ERROR ── */
        .error-box {
          background: var(--short-bg); border: 1px solid var(--short);
          border-radius: var(--r); padding: 12px 16px;
          font-size: 12px; color: var(--short);
          display: flex; align-items: flex-start; gap: 10px;
        }

        /* ── RESULT CARD ── */
        .result-card {
          background: var(--bg-card); border-radius: 12px;
          overflow: hidden; border: 1px solid var(--border);
          animation: fadeUp 0.4s ease;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        .result-card.card-long { border-top: 2px solid var(--long); }
        .result-card.card-short { border-top: 2px solid var(--short); }
        .result-card.card-wait { border-top: 2px solid var(--neutral); }

        /* Card header row */
        .card-top {
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border);
          padding: 14px 22px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
        }
        .card-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .meta-pair {
          font-family: var(--font-display); font-size: 18px; font-weight: 800;
          letter-spacing: 0.08em; color: var(--text);
        }
        .meta-tf {
          background: var(--bg); border: 1px solid var(--border-bright);
          border-radius: 3px; padding: 2px 8px;
          font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em;
        }
        .cycle-badge {
          border-radius: 3px; padding: 2px 9px;
          font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase;
          border: 1px solid;
        }
        .trend-chip {
          font-size: 9px; letter-spacing: 0.12em; padding: 2px 8px;
          border-radius: 3px; text-transform: uppercase;
          background: var(--bg); border: 1px solid var(--border-bright);
          color: var(--text-muted);
        }

        /* Direction banner */
        .direction-row {
          padding: 18px 22px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;
        }
        .dir-long-bg { background: linear-gradient(90deg, var(--long-bg) 0%, transparent 60%); }
        .dir-short-bg { background: linear-gradient(90deg, var(--short-bg) 0%, transparent 60%); }
        .dir-neutral-bg { background: linear-gradient(90deg, #7986cb12 0%, transparent 60%); }
        .direction-left { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .direction-text {
          font-family: var(--font-display); font-size: 40px; font-weight: 800;
          letter-spacing: 0.06em; line-height: 1;
        }
        .dir-long-text { color: var(--long); text-shadow: 0 0 30px var(--long-mid); }
        .dir-short-text { color: var(--short); text-shadow: 0 0 30px var(--short-mid); }
        .dir-wait-text { color: var(--neutral); }
        .pattern-wrap { display: flex; flex-direction: column; gap: 5px; }
        .pattern-tag {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--amber); background: var(--amber-bg);
          border: 1px solid #ffc10730; border-radius: 3px;
          padding: 2px 9px; display: inline-block;
        }
        .candle-tag {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--cyan); background: var(--cyan-bg);
          border: 1px solid #00bcd430; border-radius: 3px;
          padding: 2px 9px; display: inline-block;
        }
        .conf-pill {
          font-size: 12px; padding: 5px 14px; border-radius: 20px;
          font-family: var(--font-mono); white-space: nowrap; font-weight: 700;
        }
        .conf-high { background: var(--long-bg); color: var(--long); border: 1px solid var(--long-mid); }
        .conf-mid { background: var(--amber-bg); color: var(--amber); border: 1px solid #ffc10740; }
        .conf-low { background: var(--short-bg); color: var(--short); border: 1px solid var(--short-mid); }

        /* Entry / SL / TP grid */
        .levels-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border-bottom: 1px solid var(--border);
        }
        @media (max-width: 540px) {
          .levels-grid { grid-template-columns: 1fr; }
        }
        .level-cell {
          padding: 16px 22px; border-right: 1px solid var(--border);
        }
        .level-cell:last-child { border-right: none; }
        .level-label {
          font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted);
          text-transform: uppercase; margin-bottom: 6px;
        }
        .level-price { font-size: 18px; font-weight: 700; margin-bottom: 3px; }
        .lp-entry { color: var(--text); }
        .lp-sl { color: var(--short); }
        .lp-tp { color: var(--long); }
        .level-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.04em; }
        .level-zone { font-size: 10px; color: var(--cyan); letter-spacing: 0.04em; }

        /* TP row for multiple targets */
        .tp-row {
          display: flex; gap: 0;
          border-bottom: 1px solid var(--border);
        }
        .tp-cell {
          flex: 1; padding: 14px 22px;
          border-right: 1px solid var(--border);
        }
        .tp-cell:last-child { border-right: none; }
        .tp-label { font-size: 9px; letter-spacing: 0.16em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 5px; }
        .tp-price { font-size: 16px; font-weight: 700; color: var(--long); margin-bottom: 2px; }
        .tp-rr { font-size: 10px; color: var(--amber); letter-spacing: 0.06em; margin-bottom: 2px; }
        .tp-desc { font-size: 10px; color: var(--text-muted); letter-spacing: 0.03em; }

        /* RR bar */
        .rr-section {
          padding: 14px 22px; border-bottom: 1px solid var(--border);
          display: flex; align-items: center; gap: 14px;
        }
        .rr-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; }
        .rr-track { flex: 1; height: 4px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
        .rr-fill { height: 100%; background: linear-gradient(90deg, var(--amber), #ff9800); border-radius: 3px; transition: width 0.9s ease; }
        .rr-val { font-size: 14px; font-weight: 700; color: var(--amber); min-width: 50px; text-align: right; }

        /* Techniques row */
        .techniques-section {
          padding: 14px 22px; border-bottom: 1px solid var(--border);
        }
        .techniques-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; }
        .techniques-wrap { display: flex; flex-wrap: wrap; gap: 7px; }
        .technique-chip {
          font-size: 10px; padding: 3px 10px;
          background: var(--bg-elevated); border: 1px solid var(--border-bright);
          border-radius: 3px; color: var(--cyan); letter-spacing: 0.06em;
        }

        /* Analysis */
        .analysis-section { padding: 16px 22px; border-bottom: 1px solid var(--border); }
        .section-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 10px; }
        .analysis-text { font-size: 12px; line-height: 1.8; color: var(--text); opacity: 0.88; }

        /* Invalidation */
        .invalidation-row {
          padding: 12px 22px; border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 10px;
          background: #ff3d5a08;
        }
        .inv-icon { font-size: 12px; color: var(--short); flex-shrink: 0; margin-top: 1px; }
        .inv-label { font-size: 9px; letter-spacing: 0.18em; color: var(--short); text-transform: uppercase; margin-bottom: 4px; }
        .inv-text { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

        /* Risk note */
        .risk-row {
          padding: 11px 22px; border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 10px;
        }
        .risk-icon { font-size: 11px; color: var(--amber); flex-shrink: 0; margin-top: 1px; }
        .risk-text { font-size: 11px; color: var(--text-muted); line-height: 1.5; }

        /* Key levels footer */
        .key-levels-row {
          padding: 12px 22px;
          background: var(--bg-elevated);
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }
        .kl-label { font-size: 9px; letter-spacing: 0.15em; color: var(--text-muted); text-transform: uppercase; margin-right: 4px; }
        .kl-tag { font-size: 10px; padding: 3px 10px; border-radius: 3px; font-family: var(--font-mono); }
        .kl-sup { background: var(--long-bg); color: var(--long); border: 1px solid #00e67630; }
        .kl-res { background: var(--short-bg); color: var(--short); border: 1px solid #ff3d5a30; }

        /* No trade */
        .no-trade-body { padding: 28px 22px; text-align: center; }
        .no-trade-icon { font-size: 32px; margin-bottom: 12px; opacity: 0.4; }
        .no-trade-title {
          font-family: var(--font-display); font-size: 20px; font-weight: 700;
          letter-spacing: 0.12em; color: var(--neutral); margin-bottom: 10px;
        }
        .no-trade-text { font-size: 12px; color: var(--text-muted); line-height: 1.7; max-width: 480px; margin: 0 auto; }

        /* Footer */
        .footer {
          position: relative; z-index: 10;
          padding: 10px 24px; border-top: 1px solid var(--border);
          text-align: center; font-size: 9px;
          color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase;
        }

        @media (max-width: 480px) {
          .main { padding: 14px; gap: 14px; }
          .header { padding: 12px 16px; }
          .direction-text { font-size: 30px; }
          .meta-pair { font-size: 15px; }
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <header className="header">
          <div className="header-logo">
            <span className="header-title">◈ Trade Analyzer</span>
            <span className="header-sub">AI · Multi-Method · Chart Vision</span>
          </div>
          <div className="ai-badge">
            <div className="ai-dot" />
            CLAUDE · LIVE
          </div>
        </header>

        <main className="main">
          {/* Drop zone */}
          {!imagePreview && (
            <div
              className={`drop-zone ${dragOver ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <div className="drop-icon">📊</div>
              <div className="drop-title">Drop your chart screenshot here</div>
              <div className="drop-sub">
                Any pair · Any timeframe · Any exchange<br />
                PNG, JPG, or WEBP
              </div>
              <div className="drop-hint">Wyckoff · Elliott · ICT · Price Action · Fibonacci · Volume</div>
            </div>
          )}

          {/* Preview */}
          {imagePreview && (
            <div className="preview-section">
              <img src={imagePreview} alt="chart" className="preview-img" />
              <div className="preview-actions">
                <button className="btn-sm" onClick={clearImage}>✕ Remove</button>
              </div>
            </div>
          )}

          {/* Analyze button */}
          {imagePreview && !loading && (
            <button className="analyze-btn" onClick={analyzeChart}>
              ▶ ANALYZE CHART
            </button>
          )}

          {/* Loading */}
          {loading && (
            <div className="loading-wrap">
              <div className="loading-bar"><div className="loading-fill" /></div>
              <div className="loading-msg">{LOADING_MESSAGES[loadingMsg]}</div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="error-box">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className={`result-card ${isLong ? "card-long" : isShort ? "card-short" : "card-wait"}`}>

              {/* Meta row: pair, timeframe, cycle, trend */}
              <div className="card-top">
                <div className="card-meta">
                  <span className="meta-pair">{result.pair || "—"}</span>
                  {result.timeframe && result.timeframe !== "UNKNOWN" && (
                    <span className="meta-tf">{result.timeframe}</span>
                  )}
                  {result.marketCycle && result.marketCycle !== "unknown" && (
                    <span
                      className="cycle-badge"
                      style={{
                        color: CYCLE_COLORS[result.marketCycle],
                        borderColor: CYCLE_COLORS[result.marketCycle] + "50",
                        background: CYCLE_COLORS[result.marketCycle] + "12",
                      }}
                    >
                      {CYCLE_LABELS[result.marketCycle]} (Wyckoff)
                    </span>
                  )}
                  <span className="trend-chip">{result.trend?.toUpperCase()}</span>
                </div>
                <span
                  className={`conf-pill ${conf >= 70 ? "conf-high" : conf >= 50 ? "conf-mid" : "conf-low"}`}
                >
                  {conf}% confidence
                </span>
              </div>

              {/* Direction banner */}
              <div className={`direction-row ${isLong ? "dir-long-bg" : isShort ? "dir-short-bg" : "dir-neutral-bg"}`}>
                <div className="direction-left">
                  <span className={`direction-text ${isLong ? "dir-long-text" : isShort ? "dir-short-text" : "dir-wait-text"}`}>
                    {isLong ? "▲ LONG" : isShort ? "▼ SHORT" : "◆ NO TRADE"}
                  </span>
                  <div className="pattern-wrap">
                    {result.pattern && <span className="pattern-tag">{result.pattern}</span>}
                    {result.candlestickSignal && <span className="candle-tag">{result.candlestickSignal}</span>}
                  </div>
                </div>
              </div>

              {!isNoTrade && (
                <>
                  {/* Entry / SL / First TP */}
                  <div className="levels-grid">
                    <div className="level-cell">
                      <div className="level-label">Entry</div>
                      <div className="level-price lp-entry">{fmt(result.entry?.price)}</div>
                      {result.entry?.zone && (
                        <div className="level-zone">Zone: {result.entry.zone}</div>
                      )}
                      {result.entry?.type && (
                        <div className="level-sub">{result.entry.type}</div>
                      )}
                    </div>
                    <div className="level-cell">
                      <div className="level-label">Stop Loss</div>
                      <div className="level-price lp-sl">{fmt(result.stopLoss?.price)}</div>
                      {result.stopLoss?.reason && (
                        <div className="level-sub">{result.stopLoss.reason}</div>
                      )}
                    </div>
                    <div className="level-cell">
                      <div className="level-label">Risk / Reward</div>
                      <div className="level-price" style={{ color: "var(--amber)" }}>
                        1 : {result.riskReward?.toFixed(1) ?? "—"}
                      </div>
                      <div className="level-sub">Minimum 2:1 recommended</div>
                    </div>
                  </div>

                  {/* TP targets */}
                  {result.takeProfit?.length > 0 && (
                    <div className="tp-row">
                      {result.takeProfit.map((tp, i) => (
                        <div className="tp-cell" key={i}>
                          <div className="tp-label">TP{i + 1}</div>
                          <div className="tp-price">{fmt(tp.price)}</div>
                          <div className="tp-rr">{tp.rr}</div>
                          <div className="tp-desc">{tp.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* RR bar */}
                  {result.riskReward && (
                    <div className="rr-section">
                      <span className="rr-label">R/R Ratio</span>
                      <div className="rr-track">
                        <div className="rr-fill" style={{ width: `${Math.min((result.riskReward / 5) * 100, 100)}%` }} />
                      </div>
                      <span className="rr-val">1 : {result.riskReward.toFixed(1)}</span>
                    </div>
                  )}
                </>
              )}

              {/* Techniques applied */}
              {result.techniquesApplied?.length > 0 && (
                <div className="techniques-section">
                  <div className="techniques-label">Techniques Applied</div>
                  <div className="techniques-wrap">
                    {result.techniquesApplied.map((t, i) => (
                      <span key={i} className="technique-chip">{t}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full analysis */}
              <div className="analysis-section">
                <div className="section-label">Analysis</div>
                <div className="analysis-text">{result.analysis}</div>
              </div>

              {/* Invalidation */}
              {result.invalidation && !isNoTrade && (
                <div className="invalidation-row">
                  <span className="inv-icon">✕</span>
                  <div>
                    <div className="inv-label">Invalidation</div>
                    <div className="inv-text">{result.invalidation}</div>
                  </div>
                </div>
              )}

              {/* Risk note */}
              {result.riskNote && !isNoTrade && (
                <div className="risk-row">
                  <span className="risk-icon">△</span>
                  <div className="risk-text">{result.riskNote}</div>
                </div>
              )}

              {/* No trade body */}
              {isNoTrade && (
                <div className="no-trade-body">
                  <div className="no-trade-icon">◈</div>
                  <div className="no-trade-title">No Setup Detected</div>
                  <div className="no-trade-text">{result.analysis}</div>
                </div>
              )}

              {/* Key levels */}
              {(result.keyLevels?.support?.length > 0 || result.keyLevels?.resistance?.length > 0) && (
                <div className="key-levels-row">
                  <span className="kl-label">Levels</span>
                  {result.keyLevels.support?.map((l, i) => (
                    <span key={i} className="kl-tag kl-sup">S {fmt(l)}</span>
                  ))}
                  {result.keyLevels.resistance?.map((l, i) => (
                    <span key={i} className="kl-tag kl-res">R {fmt(l)}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="footer">
          Not financial advice · Educational use only · Trade at your own risk
        </footer>
      </div>
    </>
  );
}
