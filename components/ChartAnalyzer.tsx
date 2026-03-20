"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KeyLevel {
  price: number;
  label: string;
  type: "support" | "resistance" | "neutral";
}

interface TpLevel {
  price: number;
  rr: string;
  label: string;
}

interface AnalysisResult {
  pair: string;
  timeframe: string;
  overall_bias: "bullish" | "bearish" | "neutral";
  confidence: number;
  wyckoff_phase: string | null;
  ict_concepts: string[];
  key_levels: KeyLevel[];
  entry_zone: { low: number | null; high: number | null; notes: string } | null;
  stop_loss: { price: number | null; reason: string } | null;
  take_profit: TpLevel[];
  confluences: string[];
  invalidation: string;
  summary: string;
}

interface AnalysisContext {
  pair: string;
  timeframe: string;
  session: string;
  bias: string;
}

interface HistoryEntry {
  id: string;
  timestamp: number;
  pair: string;
  timeframe: string;
  bias: string;
  confidence: number;
  thumbnail: string;
  result: AnalysisResult;
  context: AnalysisContext;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const METHODS = ["Wyckoff", "ICT", "Elliott Wave", "Fibonacci", "Volume Analysis", "Price Action"];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "D", "W"];
const SESSIONS = ["London", "New York", "Asia", "Off-hours"];
const BIASES = ["No Bias", "Looking Long", "Looking Short"];
const MAX_HISTORY = 10;

const LOAD_STEPS = [
  "Uploading chart...",
  "Reading price structure...",
  "Identifying key levels...",
  "Applying selected methods...",
  "Generating trade report...",
];

// ─── Utilities ────────────────────────────────────────────────────────────────

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem("ta_history") ?? "[]");
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem("ta_history", JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    // storage full — fail silently
  }
}

async function createThumbnail(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 180;
      canvas.height = 100;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, 180, 100);
      resolve(canvas.toDataURL("image/jpeg", 0.55));
    };
    img.onerror = () => resolve("");
    img.src = dataUrl;
  });
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  if (Math.abs(n) >= 1000)
    return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toFixed(4);
  return n.toFixed(6);
}

function biasColor(bias: string, alpha = 1): string {
  if (bias === "bullish") return alpha < 1 ? `rgba(245,158,11,${alpha})` : "#f59e0b";
  if (bias === "bearish") return alpha < 1 ? `rgba(239,68,68,${alpha})` : "#ef4444";
  return alpha < 1 ? `rgba(100,116,139,${alpha})` : "#64748b";
}

function exportMarkdown(result: AnalysisResult, context: AnalysisContext) {
  const pair = result.pair !== "UNKNOWN" ? result.pair : context.pair || "Unknown";
  const tf = result.timeframe !== "UNKNOWN" ? result.timeframe : context.timeframe || "Unknown";
  const date = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";

  const tpLines = result.take_profit
    .map((t, i) => `- **TP${i + 1}:** ${fmt(t.price)} *(${t.rr})* — ${t.label}`)
    .join("\n");

  const md = `# Trade Analysis: ${pair} ${tf}

**Date:** ${date}
**Session:** ${context.session || "—"}
**Analyst Bias:** ${context.bias || "No Bias"}

---

## Overall Bias: ${result.overall_bias.toUpperCase()} (${result.confidence}% confidence)

${result.wyckoff_phase ? `**Wyckoff Phase:** ${result.wyckoff_phase}` : ""}
${result.ict_concepts?.length ? `**ICT Concepts:** ${result.ict_concepts.join(", ")}` : ""}

---

## Trade Setup

- **Entry Zone:** ${result.entry_zone ? `${fmt(result.entry_zone.low)} – ${fmt(result.entry_zone.high)}` + (result.entry_zone.notes ? ` *(${result.entry_zone.notes})*` : "") : "—"}
- **Stop Loss:** ${fmt(result.stop_loss?.price)} — *${result.stop_loss?.reason || ""}*
${tpLines}

---

## Key Levels

${result.key_levels.map((l) => `- **${l.type.toUpperCase()}** ${fmt(l.price)} — ${l.label}`).join("\n")}

---

## Confluences

${result.confluences.map((c) => `- ${c}`).join("\n")}

---

## Invalidation

${result.invalidation}

---

## Summary

${result.summary}

---

*Not financial advice. For educational purposes only.*`;

  navigator.clipboard.writeText(md).then(() => {
    alert("Copied to clipboard as Markdown!");
  });
}

function exportPNG(result: AnalysisResult, context: AnalysisContext) {
  const W = 800, H = 500;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const bc = biasColor(result.overall_bias);

  // Background
  ctx.fillStyle = "#0a0a0f";
  ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = "#1e2030";
  ctx.lineWidth = 0.5;
  for (let x = 0; x <= W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  // Top bar
  ctx.fillStyle = "#111118";
  ctx.fillRect(0, 0, W, 60);
  ctx.strokeStyle = "#1e2030";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, 60); ctx.lineTo(W, 60); ctx.stroke();

  // Pair + timeframe
  const pair = result.pair !== "UNKNOWN" ? result.pair : (context.pair || "—");
  const tf = result.timeframe !== "UNKNOWN" ? result.timeframe : (context.timeframe || "—");
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px monospace";
  ctx.fillText(`${pair}  ${tf}`, 22, 38);

  // Timestamp
  ctx.fillStyle = "#475569";
  ctx.font = "11px monospace";
  ctx.fillText(new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC", 22, 54);

  // Bias badge
  const biasLabel = result.overall_bias.toUpperCase();
  ctx.font = "bold 12px monospace";
  const bw = ctx.measureText(biasLabel).width + 24;
  ctx.fillStyle = bc + "22";
  ctx.strokeStyle = bc;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(W - bw - 20, 14, bw, 26, 4);
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = bc;
  ctx.fillText(biasLabel, W - bw - 8, 31);

  // Direction + confidence
  const dirLabel = result.overall_bias === "bullish" ? "▲ LONG" : result.overall_bias === "bearish" ? "▼ SHORT" : "◆ NO TRADE";
  ctx.font = "bold 34px monospace";
  ctx.fillStyle = bc;
  ctx.fillText(dirLabel, 22, 106);
  ctx.font = "12px monospace";
  ctx.fillStyle = "#64748b";
  ctx.fillText("CONFIDENCE", 22, 130);
  ctx.font = "bold 18px monospace";
  ctx.fillStyle = bc;
  ctx.fillText(`${result.confidence}%`, 22, 152);

  // Divider
  ctx.strokeStyle = "#1e2030";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(22, 168); ctx.lineTo(390, 168); ctx.stroke();

  // Entry / SL / TP
  const cells = [
    { label: "ENTRY ZONE", val: result.entry_zone ? `${fmt(result.entry_zone.low)}–${fmt(result.entry_zone.high)}` : "—", color: "#e2e8f0" },
    { label: "STOP LOSS", val: fmt(result.stop_loss?.price), color: "#ef4444" },
    { label: "TP1", val: fmt(result.take_profit?.[0]?.price), color: "#22c55e" },
    { label: "TP2", val: fmt(result.take_profit?.[1]?.price), color: "#22c55e" },
  ];
  cells.forEach((cell, i) => {
    const y = 186 + i * 54;
    ctx.font = "9px monospace";
    ctx.fillStyle = "#475569";
    ctx.fillText(cell.label, 22, y);
    ctx.font = "bold 15px monospace";
    ctx.fillStyle = cell.color;
    ctx.fillText(cell.val, 22, y + 18);
  });

  // Right column — confluences
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText("CONFLUENCES", 420, 86);
  ctx.strokeStyle = "#1e2030";
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(420, 94); ctx.lineTo(778, 94); ctx.stroke();
  result.confluences?.slice(0, 6).forEach((c, i) => {
    ctx.font = "11px monospace";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`• ${c}`, 420, 112 + i * 20);
  });

  // Summary
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText("SUMMARY", 420, 248);
  ctx.strokeStyle = "#1e2030";
  ctx.beginPath(); ctx.moveTo(420, 256); ctx.lineTo(778, 256); ctx.stroke();
  // Word-wrap
  const words = (result.summary || "").split(" ");
  let line = "";
  let ly = 272;
  ctx.font = "10px sans-serif";
  ctx.fillStyle = "#94a3b8";
  for (const word of words) {
    const test = line + word + " ";
    if (ctx.measureText(test).width > 358 && line) {
      if (ly > 450) { ctx.fillText(line + "...", 420, ly); break; }
      ctx.fillText(line, 420, ly);
      line = word + " ";
      ly += 16;
    } else {
      line = test;
    }
  }
  if (ly <= 450) ctx.fillText(line, 420, ly);

  // Invalidation
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#475569";
  ctx.fillText("INVALIDATION", 420, 390);
  ctx.font = "10px monospace";
  ctx.fillStyle = "#ef4444";
  ctx.fillText(result.invalidation?.slice(0, 80) || "—", 420, 406);

  // Footer
  ctx.fillStyle = "#111118";
  ctx.fillRect(0, H - 32, W, 32);
  ctx.strokeStyle = "#1e2030";
  ctx.beginPath(); ctx.moveTo(0, H - 32); ctx.lineTo(W, H - 32); ctx.stroke();
  ctx.font = "9px monospace";
  ctx.fillStyle = "#334155";
  ctx.fillText("Trading Analyzer · AI-powered · Not Financial Advice", 22, H - 12);
  ctx.fillText("github.com/Morningbriefrezi/Trading-Analyzer", W - 22 - ctx.measureText("github.com/Morningbriefrezi/Trading-Analyzer").width, H - 12);

  const link = document.createElement("a");
  link.download = `analysis_${pair}_${tf}_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// ─── Arc Gauge ────────────────────────────────────────────────────────────────

function ArcGauge({ value, color }: { value: number; color: string }) {
  const cx = 52, cy = 52, r = 40;
  const startDeg = 150;
  const totalSweep = 240;
  const fillSweep = (value / 100) * totalSweep;

  const toXY = (deg: number) => ({
    x: cx + r * Math.cos((deg * Math.PI) / 180),
    y: cy + r * Math.sin((deg * Math.PI) / 180),
  });

  const start = toXY(startDeg);
  const trackEnd = toXY(startDeg + totalSweep);
  const fillEnd = toXY(startDeg + fillSweep);
  const fillLarge = fillSweep > 180 ? 1 : 0;

  return (
    <svg width="104" height="72" viewBox="0 0 104 72">
      {/* Track */}
      <path
        d={`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 1 1 ${trackEnd.x.toFixed(2)} ${trackEnd.y.toFixed(2)}`}
        fill="none"
        stroke="#1e2030"
        strokeWidth="7"
        strokeLinecap="round"
      />
      {/* Fill */}
      {value > 0 && (
        <path
          d={`M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${fillLarge} 1 ${fillEnd.x.toFixed(2)} ${fillEnd.y.toFixed(2)}`}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
        />
      )}
      <text x="52" y="48" textAnchor="middle" fill={color} fontSize="15" fontWeight="bold" fontFamily="'JetBrains Mono', monospace">
        {value}%
      </text>
      <text x="52" y="62" textAnchor="middle" fill="#475569" fontSize="8" fontFamily="Inter, sans-serif" letterSpacing="1">
        CONFIDENCE
      </text>
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChartAnalyzer() {
  // Form state
  const [context, setContext] = useState<AnalysisContext>({
    pair: "",
    timeframe: "4H",
    session: "New York",
    bias: "No Bias",
  });
  const [selectedMethods, setSelectedMethods] = useState<string[]>(METHODS);

  // Image state
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState("image/png");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [loadStep, setLoadStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // History
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const stepRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

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
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    },
    [handleFile]
  );

  const clearImage = () => {
    setImageBase64(null);
    setImagePreview(null);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const toggleMethod = (m: string) =>
    setSelectedMethods((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]
    );

  const analyzeChart = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setLoadStep(0);

    stepRef.current = setInterval(() => {
      setLoadStep((p) => Math.min(p + 1, LOAD_STEPS.length - 1));
    }, 1400);

    try {
      const res = await fetch("/api/chart-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageMime,
          context,
          methods: selectedMethods,
        }),
      });

      const json = await res.json();
      if (!json.success || json.error) throw new Error(json.error || "Analysis failed");

      const analysisResult: AnalysisResult = json.data;
      setResult(analysisResult);

      // Save to history
      if (imagePreview) {
        const thumb = await createThumbnail(imagePreview);
        const entry: HistoryEntry = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          pair: analysisResult.pair !== "UNKNOWN" ? analysisResult.pair : context.pair || "?",
          timeframe: analysisResult.timeframe !== "UNKNOWN" ? analysisResult.timeframe : context.timeframe,
          bias: analysisResult.overall_bias,
          confidence: analysisResult.confidence,
          thumbnail: thumb,
          result: analysisResult,
          context,
        };
        const updated = [entry, ...history].slice(0, MAX_HISTORY);
        setHistory(updated);
        saveHistory(updated);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      if (stepRef.current) clearInterval(stepRef.current);
      setLoading(false);
    }
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setResult(entry.result);
    setContext(entry.context);
    setImagePreview(entry.thumbnail);
    setShowHistory(false);
    setError(null);
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  const isLong = result?.overall_bias === "bullish";
  const isShort = result?.overall_bias === "bearish";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #0a0a0f;
          --card: #111118;
          --card2: #16161f;
          --border: #1e2030;
          --border2: #252838;
          --text: #e2e8f0;
          --muted: #64748b;
          --dim: #2d3748;
          --bull: #f59e0b;
          --bull-bg: rgba(245,158,11,0.08);
          --bull-mid: rgba(245,158,11,0.35);
          --bear: #ef4444;
          --bear-bg: rgba(239,68,68,0.08);
          --bear-mid: rgba(239,68,68,0.35);
          --neutral: #64748b;
          --neutral-bg: rgba(100,116,139,0.08);
          --green: #22c55e;
          --blue: #3b82f6;
          --font-mono: 'JetBrains Mono', monospace;
          --font-body: 'Inter', sans-serif;
          --r: 8px;
        }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: var(--font-body);
          min-height: 100vh;
          font-size: 14px;
        }

        .page { min-height: 100vh; display: flex; flex-direction: column; position: relative; overflow-x: hidden; }

        /* Grid background */
        .page::before {
          content: '';
          position: fixed; inset: 0;
          background-image:
            linear-gradient(var(--border) 1px, transparent 1px),
            linear-gradient(90deg, var(--border) 1px, transparent 1px);
          background-size: 44px 44px;
          opacity: 0.45;
          pointer-events: none; z-index: 0;
        }

        /* ─ HEADER ─ */
        .header {
          position: sticky; top: 0; z-index: 100;
          background: rgba(10,10,15,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
          padding: 0 24px;
          height: 56px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .header-left { display: flex; align-items: center; gap: 14px; }
        .logo {
          font-family: var(--font-mono); font-size: 15px; font-weight: 700;
          color: var(--text); letter-spacing: 0.04em;
        }
        .logo span { color: var(--bull); }
        .header-tag {
          font-size: 10px; color: var(--muted); letter-spacing: 0.12em;
          text-transform: uppercase; font-family: var(--font-mono);
        }
        .header-right { display: flex; align-items: center; gap: 10px; }
        .live-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--green); box-shadow: 0 0 6px var(--green);
          animation: blink 2.5s infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .live-txt { font-family: var(--font-mono); font-size: 10px; color: var(--muted); letter-spacing: 0.1em; }
        .hist-btn {
          display: flex; align-items: center; gap: 6px;
          background: var(--card); border: 1px solid var(--border2);
          border-radius: 6px; padding: 5px 12px;
          font-size: 11px; font-family: var(--font-mono);
          color: var(--muted); cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.06em;
        }
        .hist-btn:hover { color: var(--text); border-color: var(--bull); }

        /* ─ MAIN ─ */
        .main {
          position: relative; z-index: 10;
          flex: 1; padding: 24px;
          max-width: 960px; width: 100%; margin: 0 auto;
          display: flex; flex-direction: column; gap: 16px;
        }

        /* ─ SECTION CARD ─ */
        .section-card {
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: var(--r);
          overflow: hidden;
        }
        .section-head {
          padding: 10px 16px;
          border-bottom: 1px solid var(--border);
          font-size: 10px; font-family: var(--font-mono);
          color: var(--muted); letter-spacing: 0.15em; text-transform: uppercase;
          display: flex; align-items: center; justify-content: space-between;
        }
        .section-body { padding: 14px 16px; }

        /* ─ CONTEXT FORM ─ */
        .form-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 10px;
        }
        @media (max-width: 640px) {
          .form-grid { grid-template-columns: 1fr 1fr; }
        }
        .field-label {
          display: block;
          font-size: 9px; font-family: var(--font-mono);
          color: var(--muted); letter-spacing: 0.15em;
          text-transform: uppercase; margin-bottom: 5px;
        }
        .field-input, .field-select {
          width: 100%;
          background: var(--bg); border: 1px solid var(--border2);
          border-radius: 5px; padding: 7px 10px;
          font-family: var(--font-mono); font-size: 12px;
          color: var(--text); appearance: none;
          transition: border-color 0.2s;
        }
        .field-input::placeholder { color: var(--dim); }
        .field-input:focus, .field-select:focus {
          outline: none; border-color: var(--bull);
          box-shadow: 0 0 0 2px rgba(245,158,11,0.1);
        }

        /* ─ METHOD SELECTOR ─ */
        .methods-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
        .method-chip {
          display: flex; align-items: center; gap: 7px;
          padding: 6px 12px;
          background: var(--bg); border: 1px solid var(--border2);
          border-radius: 5px; cursor: pointer;
          font-size: 12px; font-family: var(--font-mono);
          color: var(--muted); transition: all 0.15s;
          user-select: none;
        }
        .method-chip.on {
          background: var(--bull-bg); border-color: var(--bull-mid);
          color: var(--bull);
        }
        .method-chip input { display: none; }
        .check-icon { font-size: 10px; }

        /* ─ DROP ZONE ─ */
        .drop-zone {
          border: 1.5px dashed var(--border2);
          border-radius: var(--r);
          padding: 48px 24px;
          text-align: center; cursor: pointer;
          transition: all 0.2s;
          background: var(--card);
          position: relative;
        }
        .drop-zone:hover, .drop-zone.over {
          border-color: var(--bull);
          background: var(--bull-bg);
        }
        .drop-zone input.hidden-input {
          position: absolute; inset: 0; opacity: 0;
          cursor: pointer; width: 100%; height: 100%;
        }
        .drop-icon { font-size: 36px; margin-bottom: 12px; }
        .drop-title {
          font-family: var(--font-body); font-size: 17px; font-weight: 600;
          margin-bottom: 6px;
        }
        .drop-sub { font-size: 12px; color: var(--muted); line-height: 1.6; }
        .drop-actions {
          display: flex; justify-content: center; gap: 10px; margin-top: 16px;
        }
        .drop-action-btn {
          background: var(--card2); border: 1px solid var(--border2);
          border-radius: 5px; padding: 6px 14px;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--muted); cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.06em;
          position: relative; overflow: hidden;
        }
        .drop-action-btn:hover { color: var(--text); border-color: var(--bull); }
        .drop-action-btn input {
          position: absolute; inset: 0; opacity: 0; cursor: pointer;
        }

        /* ─ PREVIEW ─ */
        .preview-wrap { position: relative; }
        .preview-img {
          width: 100%; border-radius: var(--r);
          border: 1px solid var(--border2);
          max-height: 420px; object-fit: contain;
          background: var(--card); display: block;
        }
        .preview-overlay {
          position: absolute; top: 10px; right: 10px;
          display: flex; gap: 8px;
        }
        .overlay-btn {
          background: rgba(10,10,15,0.8); border: 1px solid var(--border2);
          border-radius: 5px; padding: 4px 10px;
          font-size: 10px; font-family: var(--font-mono);
          color: var(--muted); cursor: pointer;
          transition: all 0.2s; backdrop-filter: blur(4px);
        }
        .overlay-btn:hover { color: var(--bear); border-color: var(--bear); }

        /* ─ ANALYZE BUTTON ─ */
        .analyze-btn {
          width: 100%; padding: 14px;
          font-family: var(--font-mono); font-size: 14px; font-weight: 700;
          letter-spacing: 0.14em; text-transform: uppercase;
          background: var(--card); border: 1px solid var(--bull);
          border-radius: var(--r); color: var(--bull); cursor: pointer;
          transition: all 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 10px;
        }
        .analyze-btn:hover:not(:disabled) {
          background: var(--bull); color: var(--bg);
          box-shadow: 0 0 28px var(--bull-bg);
        }
        .analyze-btn:disabled { opacity: 0.3; cursor: not-allowed; }

        /* ─ LOADING STEPS ─ */
        .load-wrap { display: flex; flex-direction: column; gap: 12px; }
        .load-bar { height: 2px; background: var(--border2); border-radius: 2px; overflow: hidden; }
        .load-fill { height: 100%; background: var(--bull); border-radius: 2px; animation: loadfill 1.4s ease-in-out infinite; }
        @keyframes loadfill { 0%{width:8%} 50%{width:72%} 100%{width:96%} }
        .load-steps { display: flex; flex-direction: column; gap: 6px; }
        .load-step {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-mono); font-size: 11px; color: var(--dim);
          transition: color 0.3s;
        }
        .load-step.done { color: var(--muted); }
        .load-step.active { color: var(--bull); }
        .step-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
        .load-step.active .step-dot { box-shadow: 0 0 6px currentColor; animation: blink 1s infinite; }

        /* ─ ERROR ─ */
        .error-box {
          background: var(--bear-bg); border: 1px solid var(--bear-mid);
          border-radius: var(--r); padding: 12px 16px;
          font-size: 12px; color: var(--bear); font-family: var(--font-mono);
          display: flex; align-items: flex-start; gap: 10px;
        }

        /* ─ RESULT ─ */
        .result-card {
          background: var(--card); border-radius: var(--r);
          overflow: hidden; border: 1px solid var(--border);
          animation: fadeUp 0.4s ease;
        }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .result-card.bull { border-top: 2px solid var(--bull); }
        .result-card.bear { border-top: 2px solid var(--bear); }
        .result-card.neut { border-top: 2px solid var(--neutral); }

        /* Result top bar */
        .res-top {
          background: var(--card2);
          border-bottom: 1px solid var(--border);
          padding: 12px 20px;
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;
        }
        .res-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .res-pair {
          font-family: var(--font-mono); font-size: 17px; font-weight: 700;
          color: var(--text);
        }
        .res-tf {
          background: var(--bg); border: 1px solid var(--border2);
          border-radius: 4px; padding: 2px 8px;
          font-family: var(--font-mono); font-size: 10px; color: var(--muted);
        }
        .res-wyckoff {
          font-family: var(--font-mono); font-size: 10px;
          padding: 2px 9px; border-radius: 4px; letter-spacing: 0.08em;
          border: 1px solid;
        }
        .res-trend {
          font-size: 10px; padding: 2px 8px;
          background: var(--bg); border: 1px solid var(--border2);
          border-radius: 4px; color: var(--muted); font-family: var(--font-mono);
          letter-spacing: 0.08em;
        }

        /* Direction banner */
        .dir-banner {
          padding: 18px 20px 16px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
        }
        .dir-left { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .dir-text {
          font-family: var(--font-mono); font-size: 38px; font-weight: 700;
          line-height: 1; letter-spacing: 0.04em;
        }
        .dir-tags { display: flex; flex-direction: column; gap: 5px; }
        .pattern-tag {
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;
          padding: 2px 9px; border-radius: 3px; display: inline-block;
          background: rgba(245,158,11,0.1); color: var(--bull); border: 1px solid rgba(245,158,11,0.3);
        }
        .candle-tag {
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;
          padding: 2px 9px; border-radius: 3px; display: inline-block;
          background: rgba(59,130,246,0.1); color: #60a5fa; border: 1px solid rgba(59,130,246,0.3);
        }

        /* Entry / SL / TP grid */
        .setup-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          border-bottom: 1px solid var(--border);
        }
        @media (max-width: 500px) { .setup-grid { grid-template-columns: 1fr; } }
        .setup-cell {
          padding: 14px 20px; border-right: 1px solid var(--border);
        }
        .setup-cell:last-child { border-right: none; }
        .sc-label {
          font-size: 9px; font-family: var(--font-mono); letter-spacing: 0.18em;
          color: var(--muted); text-transform: uppercase; margin-bottom: 5px;
        }
        .sc-price {
          font-family: var(--font-mono); font-size: 18px; font-weight: 700;
          margin-bottom: 3px;
        }
        .sc-note { font-size: 10px; color: var(--muted); line-height: 1.4; }
        .sc-zone { font-size: 10px; color: #60a5fa; font-family: var(--font-mono); }

        /* TP targets */
        .tp-row {
          display: flex; border-bottom: 1px solid var(--border);
        }
        .tp-cell {
          flex: 1; padding: 12px 20px; border-right: 1px solid var(--border);
        }
        .tp-cell:last-child { border-right: none; }
        .tp-n { font-size: 9px; font-family: var(--font-mono); color: var(--muted); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 4px; }
        .tp-price { font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: var(--green); margin-bottom: 2px; }
        .tp-rr { font-family: var(--font-mono); font-size: 10px; color: var(--bull); margin-bottom: 2px; }
        .tp-label { font-size: 10px; color: var(--muted); }

        /* Confluences */
        .conf-section { padding: 14px 20px; border-bottom: 1px solid var(--border); }
        .conf-list { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 10px; }
        .conf-item {
          font-family: var(--font-mono); font-size: 11px;
          padding: 4px 11px; border-radius: 4px;
          background: var(--card2); border: 1px solid var(--border2);
          color: var(--text); display: flex; align-items: center; gap: 6px;
        }
        .conf-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--bull); flex-shrink: 0; }

        /* ICT concepts */
        .ict-section { padding: 12px 20px; border-bottom: 1px solid var(--border); }
        .ict-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .ict-chip {
          font-size: 10px; font-family: var(--font-mono); padding: 3px 9px;
          border-radius: 3px; color: #60a5fa;
          background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2);
        }

        /* Summary */
        .summary-section { padding: 16px 20px; border-bottom: 1px solid var(--border); }
        .summary-text {
          font-family: var(--font-body); font-size: 13px;
          line-height: 1.8; color: var(--text); opacity: 0.88;
        }

        /* Invalidation */
        .inv-row {
          padding: 11px 20px; border-bottom: 1px solid var(--border);
          display: flex; align-items: flex-start; gap: 10px;
          background: rgba(239,68,68,0.05);
        }
        .inv-icon { color: var(--bear); font-size: 11px; margin-top: 2px; flex-shrink: 0; }
        .inv-inner {}
        .inv-lbl { font-size: 9px; font-family: var(--font-mono); color: var(--bear); letter-spacing: 0.15em; text-transform: uppercase; margin-bottom: 3px; }
        .inv-txt { font-size: 12px; color: var(--muted); line-height: 1.5; }

        /* Key levels */
        .levels-footer {
          padding: 12px 20px; background: var(--card2);
          display: flex; flex-wrap: wrap; gap: 7px; align-items: center;
          border-bottom: 1px solid var(--border);
        }
        .lf-label { font-size: 9px; font-family: var(--font-mono); color: var(--muted); text-transform: uppercase; letter-spacing: 0.15em; margin-right: 4px; }
        .lf-tag { font-size: 10px; padding: 3px 9px; border-radius: 3px; font-family: var(--font-mono); }
        .lf-sup { background: rgba(34,197,94,0.08); color: var(--green); border: 1px solid rgba(34,197,94,0.25); }
        .lf-res { background: var(--bear-bg); color: var(--bear); border: 1px solid var(--bear-mid); }
        .lf-neu { background: var(--neutral-bg); color: var(--neutral); border: 1px solid rgba(100,116,139,0.25); }

        /* Export */
        .export-row {
          padding: 12px 20px;
          display: flex; gap: 10px; flex-wrap: wrap;
        }
        .export-btn {
          display: flex; align-items: center; gap: 7px;
          background: var(--card2); border: 1px solid var(--border2);
          border-radius: 5px; padding: 7px 14px;
          font-size: 11px; font-family: var(--font-mono);
          color: var(--muted); cursor: pointer;
          transition: all 0.2s; letter-spacing: 0.06em;
        }
        .export-btn:hover { color: var(--text); border-color: var(--bull); }

        /* ─ HISTORY DRAWER ─ */
        .history-overlay {
          position: fixed; inset: 0; z-index: 200;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        }
        .history-drawer {
          position: fixed; bottom: 0; left: 0; right: 0; z-index: 201;
          background: var(--card);
          border-top: 1px solid var(--border2);
          border-radius: 14px 14px 0 0;
          max-height: 70vh;
          display: flex; flex-direction: column;
          animation: slideUp 0.3s ease;
        }
        @keyframes slideUp { from{transform:translateY(100%)} to{transform:translateY(0)} }
        .drawer-head {
          padding: 14px 20px;
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center; justify-content: space-between;
          flex-shrink: 0;
        }
        .drawer-title { font-family: var(--font-mono); font-size: 12px; color: var(--muted); letter-spacing: 0.12em; text-transform: uppercase; }
        .drawer-actions { display: flex; gap: 10px; }
        .drawer-close {
          background: none; border: none; color: var(--muted); font-size: 16px;
          cursor: pointer; padding: 2px 6px; transition: color 0.2s;
        }
        .drawer-close:hover { color: var(--text); }
        .drawer-clear {
          background: none; border: 1px solid var(--border2);
          border-radius: 4px; padding: 3px 10px;
          font-size: 10px; font-family: var(--font-mono); color: var(--muted);
          cursor: pointer; transition: all 0.2s;
        }
        .drawer-clear:hover { color: var(--bear); border-color: var(--bear); }
        .drawer-body { overflow-y: auto; padding: 14px 20px; display: flex; flex-direction: column; gap: 10px; }
        .history-item {
          display: flex; gap: 12px; align-items: center;
          background: var(--card2); border: 1px solid var(--border);
          border-radius: 6px; padding: 10px;
          cursor: pointer; transition: all 0.2s;
        }
        .history-item:hover { border-color: var(--bull); background: var(--bull-bg); }
        .hist-thumb {
          width: 90px; height: 50px; border-radius: 4px;
          object-fit: cover; flex-shrink: 0;
          background: var(--bg); border: 1px solid var(--border);
        }
        .hist-info { flex: 1; min-width: 0; }
        .hist-pair { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text); }
        .hist-meta { font-family: var(--font-mono); font-size: 10px; color: var(--muted); margin-top: 3px; }
        .hist-badge {
          font-size: 10px; padding: 2px 8px; border-radius: 3px;
          font-family: var(--font-mono); font-weight: 700;
          border: 1px solid; letter-spacing: 0.06em;
        }
        .drawer-empty { text-align: center; padding: 40px 20px; color: var(--muted); font-size: 12px; font-family: var(--font-mono); }

        /* ─ FOOTER ─ */
        .footer {
          position: relative; z-index: 10;
          padding: 10px 24px; border-top: 1px solid var(--border);
          text-align: center;
          font-size: 9px; color: var(--dim); letter-spacing: 0.1em; text-transform: uppercase;
          font-family: var(--font-mono);
        }

        @media (max-width: 480px) {
          .main { padding: 14px; gap: 12px; }
          .dir-text { font-size: 28px; }
          .sc-price { font-size: 14px; }
          .setup-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      <div className="page">
        {/* Header */}
        <header className="header">
          <div className="header-left">
            <span className="logo">◈ Trade<span>Analyzer</span></span>
            <span className="header-tag">AI · Multi-Method · Chart Vision</span>
          </div>
          <div className="header-right">
            <div className="live-dot" />
            <span className="live-txt">CLAUDE · LIVE</span>
            <button className="hist-btn" onClick={() => setShowHistory(true)}>
              ◷ History {history.length > 0 && `(${history.length})`}
            </button>
          </div>
        </header>

        <main className="main">
          {/* ── Context Form ── */}
          <div className="section-card">
            <div className="section-head">Analysis Context</div>
            <div className="section-body">
              <div className="form-grid">
                <div>
                  <label className="field-label">Pair</label>
                  <input
                    className="field-input"
                    type="text"
                    placeholder="e.g. BTCUSDT"
                    value={context.pair}
                    onChange={(e) => setContext((p) => ({ ...p, pair: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="field-label">Timeframe</label>
                  <select
                    className="field-select"
                    value={context.timeframe}
                    onChange={(e) => setContext((p) => ({ ...p, timeframe: e.target.value }))}
                  >
                    {TIMEFRAMES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Session</label>
                  <select
                    className="field-select"
                    value={context.session}
                    onChange={(e) => setContext((p) => ({ ...p, session: e.target.value }))}
                  >
                    {SESSIONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="field-label">Direction Bias</label>
                  <select
                    className="field-select"
                    value={context.bias}
                    onChange={(e) => setContext((p) => ({ ...p, bias: e.target.value }))}
                  >
                    {BIASES.map((b) => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* ── Method Selector ── */}
          <div className="section-card">
            <div className="section-head">
              <span>Analysis Methods</span>
              <span style={{ color: "var(--bull)", fontSize: "10px" }}>
                {selectedMethods.length}/{METHODS.length} selected
              </span>
            </div>
            <div className="section-body">
              <div className="methods-wrap">
                {METHODS.map((m) => {
                  const on = selectedMethods.includes(m);
                  return (
                    <label key={m} className={`method-chip ${on ? "on" : ""}`}>
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={() => toggleMethod(m)}
                      />
                      <span className="check-icon">{on ? "✓" : "○"}</span>
                      {m}
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Upload / Preview ── */}
          {!imagePreview ? (
            <div
              className={`drop-zone ${dragOver ? "over" : ""}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input
                ref={fileRef}
                className="hidden-input"
                type="file"
                accept="image/*"
                onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
              />
              <div className="drop-icon">📊</div>
              <div className="drop-title">Drop your chart screenshot here</div>
              <div className="drop-sub">
                Any pair · Any timeframe · Any exchange<br />
                PNG, JPG, WEBP supported
              </div>
              <div className="drop-actions">
                <label className="drop-action-btn">
                  ↑ Browse Files
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                  />
                </label>
                <label className="drop-action-btn">
                  📷 Open Camera
                  <input
                    ref={cameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
                  />
                </label>
              </div>
            </div>
          ) : (
            <div className="preview-wrap">
              <img src={imagePreview} alt="chart" className="preview-img" />
              <div className="preview-overlay">
                <button className="overlay-btn" onClick={clearImage}>✕ Remove</button>
              </div>
            </div>
          )}

          {/* ── Analyze Button ── */}
          {imagePreview && !loading && (
            <button
              className="analyze-btn"
              onClick={analyzeChart}
              disabled={selectedMethods.length === 0}
            >
              ▶ ANALYZE CHART
            </button>
          )}

          {/* ── Loading Steps ── */}
          {loading && (
            <div className="load-wrap">
              <div className="load-bar"><div className="load-fill" /></div>
              <div className="load-steps">
                {LOAD_STEPS.map((step, i) => (
                  <div
                    key={i}
                    className={`load-step ${i < loadStep ? "done" : i === loadStep ? "active" : ""}`}
                  >
                    <span className="step-dot" />
                    {i === 3 && selectedMethods.length > 0
                      ? `Applying ${selectedMethods.slice(0, 2).join(", ")}${selectedMethods.length > 2 ? ` +${selectedMethods.length - 2} more` : ""}...`
                      : step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {error && (
            <div className="error-box">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {/* ── Result Card ── */}
          {result && (() => {
            const bc = biasColor(result.overall_bias);
            const cardClass = result.overall_bias === "bullish" ? "bull" : result.overall_bias === "bearish" ? "bear" : "neut";
            const displayPair = result.pair !== "UNKNOWN" ? result.pair : (context.pair || "—");
            const displayTf = result.timeframe !== "UNKNOWN" ? result.timeframe : context.timeframe;

            return (
              <div className={`result-card ${cardClass}`}>
                {/* Meta */}
                <div className="res-top">
                  <div className="res-meta">
                    <span className="res-pair">{displayPair}</span>
                    {displayTf && <span className="res-tf">{displayTf}</span>}
                    {result.wyckoff_phase && (
                      <span
                        className="res-wyckoff"
                        style={{ color: bc, borderColor: bc + "50", background: bc + "10" }}
                      >
                        {result.wyckoff_phase} · Wyckoff
                      </span>
                    )}
                    <span className="res-trend">{(result.overall_bias || "neutral").toUpperCase()}</span>
                  </div>
                  <ArcGauge value={result.confidence} color={bc} />
                </div>

                {/* Direction */}
                <div
                  className="dir-banner"
                  style={{
                    background: `linear-gradient(90deg, ${bc}10 0%, transparent 60%)`,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div className="dir-left">
                    <span className="dir-text" style={{ color: bc, textShadow: `0 0 30px ${bc}40` }}>
                      {isLong ? "▲ LONG" : isShort ? "▼ SHORT" : "◆ NO TRADE"}
                    </span>
                  </div>
                </div>

                {/* Entry / SL / RR */}
                <div className="setup-grid">
                  <div className="setup-cell">
                    <div className="sc-label">Entry Zone</div>
                    <div className="sc-price" style={{ color: "var(--text)" }}>
                      {result.entry_zone
                        ? result.entry_zone.low && result.entry_zone.high
                          ? `${fmt(result.entry_zone.low)}`
                          : fmt(result.entry_zone.low)
                        : "—"}
                    </div>
                    {result.entry_zone?.high && result.entry_zone?.low && result.entry_zone.high !== result.entry_zone.low && (
                      <div className="sc-zone">to {fmt(result.entry_zone.high)}</div>
                    )}
                    {result.entry_zone?.notes && <div className="sc-note">{result.entry_zone.notes}</div>}
                  </div>
                  <div className="setup-cell">
                    <div className="sc-label">Stop Loss</div>
                    <div className="sc-price" style={{ color: "var(--bear)" }}>{fmt(result.stop_loss?.price)}</div>
                    {result.stop_loss?.reason && <div className="sc-note">{result.stop_loss.reason}</div>}
                  </div>
                  <div className="setup-cell">
                    <div className="sc-label">Risk / Reward</div>
                    <div className="sc-price" style={{ color: "var(--bull)" }}>
                      {result.take_profit?.[0]?.rr ? `1 : ${result.take_profit[0].rr.replace("1:", "")}` : "—"}
                    </div>
                    <div className="sc-note">Minimum 2:1 target</div>
                  </div>
                </div>

                {/* Take Profit targets */}
                {result.take_profit?.length > 0 && (
                  <div className="tp-row">
                    {result.take_profit.map((tp, i) => (
                      <div className="tp-cell" key={i}>
                        <div className="tp-n">TP{i + 1}</div>
                        <div className="tp-price">{fmt(tp.price)}</div>
                        <div className="tp-rr">{tp.rr}</div>
                        <div className="tp-label">{tp.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ICT Concepts */}
                {result.ict_concepts?.length > 0 && (
                  <div className="ict-section">
                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>ICT Concepts Detected</div>
                    <div className="ict-list">
                      {result.ict_concepts.map((c, i) => (
                        <span key={i} className="ict-chip">{c}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confluences */}
                {result.confluences?.length > 0 && (
                  <div className="conf-section">
                    <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase" }}>Confluences</div>
                    <div className="conf-list">
                      {result.confluences.map((c, i) => (
                        <div key={i} className="conf-item">
                          <span className="conf-dot" />
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div className="summary-section">
                  <div style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>Analysis</div>
                  <div className="summary-text">{result.summary}</div>
                </div>

                {/* Invalidation */}
                {result.invalidation && (
                  <div className="inv-row">
                    <span className="inv-icon">✕</span>
                    <div className="inv-inner">
                      <div className="inv-lbl">Invalidation</div>
                      <div className="inv-txt">{result.invalidation}</div>
                    </div>
                  </div>
                )}

                {/* Key Levels */}
                {result.key_levels?.length > 0 && (
                  <div className="levels-footer">
                    <span className="lf-label">Levels</span>
                    {result.key_levels.map((l, i) => (
                      <span
                        key={i}
                        className={`lf-tag ${l.type === "support" ? "lf-sup" : l.type === "resistance" ? "lf-res" : "lf-neu"}`}
                        title={l.label}
                      >
                        {l.type === "support" ? "S" : l.type === "resistance" ? "R" : "•"} {fmt(l.price)}
                      </span>
                    ))}
                  </div>
                )}

                {/* Export */}
                <div className="export-row">
                  <button
                    className="export-btn"
                    onClick={() => exportMarkdown(result, context)}
                  >
                    ⎘ Copy as Markdown
                  </button>
                  <button
                    className="export-btn"
                    onClick={() => exportPNG(result, context)}
                  >
                    ↓ Save as PNG
                  </button>
                </div>
              </div>
            );
          })()}
        </main>

        <footer className="footer">
          Not financial advice · Educational use only · Trade at your own risk
        </footer>

        {/* ── History Drawer ── */}
        {showHistory && (
          <>
            <div className="history-overlay" onClick={() => setShowHistory(false)} />
            <div className="history-drawer">
              <div className="drawer-head">
                <span className="drawer-title">Analysis History ({history.length}/{MAX_HISTORY})</span>
                <div className="drawer-actions">
                  {history.length > 0 && (
                    <button className="drawer-clear" onClick={clearHistory}>Clear all</button>
                  )}
                  <button className="drawer-close" onClick={() => setShowHistory(false)}>✕</button>
                </div>
              </div>
              <div className="drawer-body">
                {history.length === 0 ? (
                  <div className="drawer-empty">No analyses saved yet</div>
                ) : (
                  history.map((entry) => {
                    const bc = biasColor(entry.bias);
                    return (
                      <div key={entry.id} className="history-item" onClick={() => loadFromHistory(entry)}>
                        {entry.thumbnail ? (
                          <img src={entry.thumbnail} alt={entry.pair} className="hist-thumb" />
                        ) : (
                          <div className="hist-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "var(--dim)", fontSize: 20 }}>📊</div>
                        )}
                        <div className="hist-info">
                          <div className="hist-pair">{entry.pair} <span style={{ color: "var(--muted)", fontSize: 11 }}>{entry.timeframe}</span></div>
                          <div className="hist-meta">
                            {new Date(entry.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                        <span
                          className="hist-badge"
                          style={{ color: bc, borderColor: bc + "50", background: bc + "12" }}
                        >
                          {entry.bias.toUpperCase()} {entry.confidence}%
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
