"use client";

import { useState, useRef, useCallback } from "react";

interface TradeSignal {
  direction: "LONG" | "SHORT" | "NO TRADE";
  entry: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskReward: number | null;
  confidence: number;
  trend: "bullish" | "bearish" | "sideways";
  pattern: string;
  supportLevels: number[];
  resistanceLevels: number[];
  explanation: string;
}

const SYSTEM_PROMPT = `You are an expert technical analyst and professional trader. Analyze the trading chart image provided and return ONLY a valid JSON object with no markdown, no code blocks, no extra text.

JSON structure:
{
  "direction": "LONG" or "SHORT" or "NO TRADE",
  "entry": number or null,
  "stopLoss": number or null,
  "takeProfit": number or null,
  "riskReward": number or null,
  "confidence": number between 0 and 100,
  "trend": "bullish" or "bearish" or "sideways",
  "pattern": string (detected pattern name, e.g. "Double Bottom", "Head & Shoulders", "Bull Flag"),
  "supportLevels": array of up to 3 numbers,
  "resistanceLevels": array of up to 3 numbers,
  "explanation": string (2-3 sentences describing the setup, key levels, and rationale)
}

Rules:
- Base all values on visible price levels in the chart
- Entry = current price or ideal entry zone
- Stop loss = logical invalidation level
- Take profit = nearest key resistance (LONG) or support (SHORT)
- Confidence reflects clarity and confluence of signals (50=moderate, 70=good, 85+=very clear)
- If no clear setup exists, direction = "NO TRADE" and entry/SL/TP = null`;

export default function ChartAnalyzer() {
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/png");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TradeSignal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: imageMime, data: imageBase64 },
                },
                {
                  type: "text",
                  text: "Analyze this trading chart and return the JSON signal.",
                },
              ],
            },
          ],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message || "API error");

      const raw = data.content.find((b: { type: string }) => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const trade: TradeSignal = JSON.parse(clean);
      setResult(trade);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number | null): string => {
    if (n === null || n === undefined) return "—";
    if (Math.abs(n) > 1000)
      return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (Math.abs(n) > 1) return n.toFixed(4);
    return n.toFixed(6);
  };

  const isLong = result?.direction === "LONG";
  const isShort = result?.direction === "SHORT";
  const conf = result?.confidence ?? 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Barlow+Condensed:wght@400;600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080c10;
          --bg-panel: #0d1117;
          --bg-card: #0f1520;
          --bg-elevated: #161d28;
          --border: #1e2a38;
          --border-bright: #2a3a50;
          --text: #e8edf2;
          --text-muted: #6b7d8f;
          --text-dim: #3d4f60;
          --long: #00e676;
          --long-bg: #00e67614;
          --short: #ff3d5a;
          --short-bg: #ff3d5a14;
          --neutral: #7986cb;
          --amber: #ffc107;
          --cyan: #00bcd4;
          --font-mono: 'Space Mono', monospace;
          --font-display: 'Barlow Condensed', sans-serif;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-mono);
          min-height: 100vh;
        }

        .page { min-height: 100vh; display: flex; flex-direction: column; position: relative; overflow: hidden; }

        .page::after {
          content: '';
          position: fixed; inset: 0;
          background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: 0.2;
          pointer-events: none;
          z-index: 0;
        }

        .header {
          position: relative; z-index: 10;
          padding: 18px 28px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-panel);
          display: flex; align-items: center; justify-content: space-between;
        }

        .header-title { font-family: var(--font-display); font-size: 20px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
        .header-sub { font-size: 10px; color: var(--text-muted); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 2px; }

        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--long); box-shadow: 0 0 8px var(--long);
          animation: blink 2s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

        .live-label { display: flex; align-items: center; gap: 8px; font-size: 10px; color: var(--text-muted); letter-spacing: 0.1em; }

        .main {
          position: relative; z-index: 10;
          flex: 1; padding: 28px 24px;
          max-width: 840px; width: 100%; margin: 0 auto;
          display: flex; flex-direction: column; gap: 20px;
        }

        /* DROP ZONE */
        .drop-zone {
          border: 1.5px dashed var(--border-bright);
          border-radius: 10px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: var(--bg-panel);
          position: relative;
        }
        .drop-zone:hover, .drop-zone.over {
          border-color: var(--cyan);
          background: var(--bg-elevated);
        }
        .drop-zone input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
        .drop-icon { font-size: 32px; margin-bottom: 12px; }
        .drop-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; letter-spacing: 0.06em; margin-bottom: 6px; }
        .drop-sub { font-size: 11px; color: var(--text-muted); letter-spacing: 0.06em; }

        /* PREVIEW */
        .preview-section { position: relative; }
        .preview-img {
          width: 100%; border-radius: 10px;
          border: 1px solid var(--border);
          max-height: 380px; object-fit: contain;
          background: var(--bg-panel); display: block;
        }
        .remove-btn {
          position: absolute; top: 10px; right: 10px;
          background: var(--bg-panel); border: 1px solid var(--border-bright);
          border-radius: 6px; padding: 5px 12px;
          font-size: 11px; font-family: var(--font-mono);
          color: var(--text-muted); cursor: pointer;
          transition: color 0.2s, border-color 0.2s;
        }
        .remove-btn:hover { color: var(--short); border-color: var(--short); }

        /* ANALYZE BTN */
        .analyze-btn {
          width: 100%; padding: 14px;
          font-family: var(--font-display); font-size: 16px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          background: var(--bg-panel); border: 1px solid var(--cyan);
          border-radius: 6px; color: var(--cyan); cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .analyze-btn:hover:not(:disabled) { background: var(--cyan); color: var(--bg); box-shadow: 0 0 24px #00bcd430; }
        .analyze-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* LOADING */
        .loading-bar { height: 3px; background: var(--bg-elevated); border-radius: 2px; overflow: hidden; }
        .loading-fill { height: 100%; background: var(--cyan); border-radius: 2px; animation: load 2s ease forwards; }
        @keyframes load { from{width:0%} to{width:90%} }
        .loading-text { text-align: center; font-size: 11px; color: var(--text-muted); letter-spacing: 0.1em; margin-top: 10px; }

        /* SPINNER */
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid var(--bg-elevated);
          border-top-color: var(--cyan);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ERROR */
        .error-box {
          background: var(--short-bg); border: 1px solid var(--short);
          border-radius: 6px; padding: 12px 16px;
          font-size: 12px; color: var(--short);
          display: flex; align-items: center; gap: 8px;
        }

        /* RESULT CARD */
        .result-card {
          background: var(--bg-card);
          border-radius: 10px; overflow: hidden;
          border: 1px solid var(--border);
          animation: fadeUp 0.4s ease;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }

        .result-card.card-long { border-top: 2px solid var(--long); }
        .result-card.card-short { border-top: 2px solid var(--short); }
        .result-card.card-wait { border-top: 2px solid var(--neutral); }

        .card-header {
          padding: 16px 22px;
          background: var(--bg-elevated);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
        }

        .direction-text {
          font-family: var(--font-display); font-size: 38px; font-weight: 800;
          letter-spacing: 0.06em; line-height: 1;
        }
        .dir-long { color: var(--long); text-shadow: 0 0 30px #00e67640; }
        .dir-short { color: var(--short); text-shadow: 0 0 30px #ff3d5a40; }
        .dir-wait { color: var(--neutral); }

        .pattern-tag {
          font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--amber); background: #ffc10714;
          border: 1px solid #ffc10730;
          border-radius: 4px; padding: 3px 9px;
          margin-top: 6px; display: inline-block;
        }

        .conf-pill {
          font-size: 11px; padding: 4px 12px;
          border-radius: 20px; font-family: var(--font-mono);
          white-space: nowrap;
        }
        .conf-high { background: #00e67614; color: var(--long); border: 1px solid #00e67640; }
        .conf-mid { background: #ffc10714; color: var(--amber); border: 1px solid #ffc10740; }
        .conf-low { background: var(--short-bg); color: var(--short); border: 1px solid #ff3d5a40; }

        /* PRICE GRID */
        .price-grid {
          display: grid; grid-template-columns: repeat(3, minmax(0,1fr));
          border-bottom: 1px solid var(--border);
        }
        .price-cell {
          padding: 16px 22px;
          border-right: 1px solid var(--border);
        }
        .price-cell:last-child { border-right: none; }
        .price-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 6px; }
        .price-val { font-size: 16px; font-weight: 700; }
        .pv-entry { color: var(--text); }
        .pv-sl { color: var(--short); }
        .pv-tp { color: var(--long); }

        /* RR */
        .rr-row {
          padding: 14px 22px;
          display: flex; align-items: center; gap: 14px;
          border-bottom: 1px solid var(--border);
        }
        .rr-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; white-space: nowrap; }
        .rr-track { flex: 1; height: 5px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
        .rr-fill { height: 100%; background: var(--amber); border-radius: 3px; transition: width 0.8s ease; }
        .rr-val { font-size: 13px; font-weight: 700; color: var(--amber); min-width: 40px; text-align: right; }

        /* CONFIDENCE BAR */
        .conf-row {
          padding: 14px 22px;
          border-bottom: 1px solid var(--border);
        }
        .conf-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
        .conf-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; }
        .conf-num { font-size: 13px; font-weight: 700; color: var(--text); }
        .conf-track { height: 5px; background: var(--bg-elevated); border-radius: 3px; overflow: hidden; }
        .conf-fill-high { height: 100%; border-radius: 3px; background: var(--long); transition: width 0.8s ease; }
        .conf-fill-mid { height: 100%; border-radius: 3px; background: var(--amber); transition: width 0.8s ease; }
        .conf-fill-low { height: 100%; border-radius: 3px; background: var(--short); transition: width 0.8s ease; }

        /* EXPLANATION */
        .explanation {
          padding: 16px 22px;
          border-bottom: 1px solid var(--border);
        }
        .explanation-label { font-size: 9px; letter-spacing: 0.18em; color: var(--text-muted); text-transform: uppercase; margin-bottom: 8px; }
        .explanation-text { font-size: 12px; line-height: 1.75; color: var(--text); opacity: 0.85; }

        /* LEVELS */
        .levels-row {
          padding: 12px 22px;
          background: var(--bg-elevated);
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
        }
        .levels-label { font-size: 9px; letter-spacing: 0.15em; color: var(--text-muted); text-transform: uppercase; margin-right: 4px; }
        .level-tag { font-size: 10px; padding: 3px 9px; border-radius: 4px; font-family: var(--font-mono); }
        .lt-sup { background: #00e67614; color: var(--long); border: 1px solid #00e67630; }
        .lt-res { background: var(--short-bg); color: var(--short); border: 1px solid #ff3d5a30; }

        /* FOOTER */
        .footer {
          position: relative; z-index: 10;
          padding: 10px 24px;
          border-top: 1px solid var(--border);
          text-align: center;
          font-size: 9px; color: var(--text-dim); letter-spacing: 0.08em; text-transform: uppercase;
        }

        @media (max-width: 480px) {
          .main { padding: 16px; }
          .header { padding: 14px 16px; }
          .price-grid { grid-template-columns: repeat(1, 1fr); }
          .price-cell { border-right: none; border-bottom: 1px solid var(--border); }
          .direction-text { font-size: 28px; }
        }
      `}</style>

      <div className="page">
        <header className="header">
          <div>
            <div className="header-title">⬡ Chart Analyzer</div>
            <div className="header-sub">AI Vision · Technical Analysis</div>
          </div>
          <div className="live-label">
            <div className="live-dot" />
            POWERED BY CLAUDE
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
              <div className="drop-icon">📈</div>
              <div className="drop-title">Drop your chart here</div>
              <div className="drop-sub">or click to select · PNG, JPG, WEBP supported</div>
            </div>
          )}

          {/* Preview */}
          {imagePreview && (
            <div className="preview-section">
              <img src={imagePreview} alt="chart" className="preview-img" />
              <button className="remove-btn" onClick={clearImage}>✕ Remove</button>
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
            <div>
              <div className="loading-bar"><div className="loading-fill" /></div>
              <div className="loading-text">Scanning chart structure and price action...</div>
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
              <div className="card-header">
                <div>
                  <div className={`direction-text ${isLong ? "dir-long" : isShort ? "dir-short" : "dir-wait"}`}>
                    {isLong ? "▲ LONG" : isShort ? "▼ SHORT" : "◆ NO TRADE"}
                  </div>
                  {result.pattern && <span className="pattern-tag">{result.pattern}</span>}
                </div>
                <span className={`conf-pill ${conf >= 70 ? "conf-high" : conf >= 50 ? "conf-mid" : "conf-low"}`}>
                  {conf}% confidence
                </span>
              </div>

              {result.direction !== "NO TRADE" && (
                <>
                  <div className="price-grid">
                    <div className="price-cell">
                      <div className="price-label">Entry</div>
                      <div className="price-val pv-entry">{fmt(result.entry)}</div>
                    </div>
                    <div className="price-cell">
                      <div className="price-label">Stop Loss</div>
                      <div className="price-val pv-sl">{fmt(result.stopLoss)}</div>
                    </div>
                    <div className="price-cell">
                      <div className="price-label">Take Profit</div>
                      <div className="price-val pv-tp">{fmt(result.takeProfit)}</div>
                    </div>
                  </div>

                  <div className="rr-row">
                    <span className="rr-label">Risk / Reward</span>
                    <div className="rr-track">
                      <div className="rr-fill" style={{ width: `${Math.min((result.riskReward ?? 0) / 5 * 100, 100)}%` }} />
                    </div>
                    <span className="rr-val">1 : {result.riskReward?.toFixed(1) ?? "—"}</span>
                  </div>

                  <div className="conf-row">
                    <div className="conf-header">
                      <span className="conf-label">Confidence</span>
                      <span className="conf-num">{conf}%</span>
                    </div>
                    <div className="conf-track">
                      <div
                        className={conf >= 70 ? "conf-fill-high" : conf >= 50 ? "conf-fill-mid" : "conf-fill-low"}
                        style={{ width: `${conf}%` }}
                      />
                    </div>
                  </div>
                </>
              )}

              <div className="explanation">
                <div className="explanation-label">Analysis</div>
                <div className="explanation-text">{result.explanation}</div>
              </div>

              {(result.supportLevels?.length > 0 || result.resistanceLevels?.length > 0) && (
                <div className="levels-row">
                  <span className="levels-label">Levels</span>
                  {result.supportLevels?.map((l, i) => (
                    <span key={i} className="level-tag lt-sup">S {fmt(l)}</span>
                  ))}
                  {result.resistanceLevels?.map((l, i) => (
                    <span key={i} className="level-tag lt-res">R {fmt(l)}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>

        <footer className="footer">
          Not financial advice · For educational purposes only · Trade at your own risk
        </footer>
      </div>
    </>
  );
}
