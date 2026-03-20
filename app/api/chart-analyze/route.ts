import { NextRequest, NextResponse } from "next/server";

const METHOD_KNOWLEDGE: Record<string, string> = {
  Wyckoff: `WYCKOFF METHOD (Richard Wyckoff):
- Composite Man theory — institutional accumulation/distribution
- Four phases: Accumulation (Phase A-E), Markup, Distribution, Markdown
- Key events: Spring, Upthrust, Sign of Strength (SOS), Sign of Weakness (SOW)
- Volume analysis: effort vs result, climax volume, no-demand bars`,

  ICT: `ICT — INNER CIRCLE TRADER (Michael Huddleston):
- Order Blocks (OB): last bearish candle before bullish impulse (bull OB), vice versa
- Fair Value Gaps (FVG) / Imbalances: three-candle patterns with price inefficiency
- Liquidity: buy-side (BSL above highs), sell-side (SSL below lows)
- Optimal Trade Entry (OTE): 62–79% Fibonacci retracement of a swing
- Breaker Blocks, Mitigation Blocks, Market Structure Shifts (MSS)
- Sessions: London (2–5 AM EST), New York (8:30 AM–11 AM EST), Asian range`,

  "Elliott Wave": `ELLIOTT WAVE THEORY (Ralph Elliott):
- Impulse waves: 5-wave structure (1-2-3-4-5), Wave 3 is never shortest
- Corrective waves: A-B-C (zigzag, flat, triangle)
- Fibonacci relationships between waves (1.618, 2.618 extensions; 0.382, 0.618 retracements)
- Degree labeling: Grand Supercycle → Supercycle → Cycle → Primary → Intermediate
- Common patterns: Leading/Ending Diagonal, Double/Triple Zigzag`,

  Fibonacci: `FIBONACCI LEVELS:
- Retracements: 23.6%, 38.2%, 50% (not true Fib but widely used), 61.8% (golden ratio), 78.6%
- Extensions: 127.2%, 161.8%, 261.8%, 423.6%
- Confluence zones: where multiple Fib levels + S/R cluster
- Fib Time Zones for timing reversals
- Golden Pocket: 61.8%–65% retracement (ICT OTE zone)`,

  "Volume Analysis": `VOLUME ANALYSIS:
- Wyckoff: climax volume (selling/buying climax), effort vs result divergence
- Volume Spread Analysis (VSA): wide-spread up bar on high volume = strength
- On-Balance Volume (OBV): trend confirmation/divergence
- Volume Profile: Point of Control (POC), Value Area High/Low (VAH/VAL), HVN/LVN
- No-supply / no-demand bars: narrow spread + low volume = weak move`,

  "Price Action": `PRICE ACTION (Al Brooks, Lance Beggs, Bob Volman):
- Trend: measured move, channel, tight bull/bear channel = strong trend
- Trading Ranges: magnets at midpoint and extremes, failed breakouts
- Reversal signals: final flag, wedge, climax bar, exhaustion gap
- Bar analysis: trend bars, dojo bars, outside bars, inside bars
- Key concept: "Always in Long/Short" — institutional commitment
- Candlestick patterns (Nison): Hammer, Engulfing, Pin Bar, Doji, Morning/Evening Star`,
};

function buildSystemPrompt(methods: string[]): string {
  const selectedMethods = methods.length > 0 ? methods : Object.keys(METHOD_KNOWLEDGE);
  const methodBlock = selectedMethods
    .map((m) => METHOD_KNOWLEDGE[m] ?? "")
    .filter(Boolean)
    .join("\n\n");

  return `You are a professional trading analyst with mastery of every major methodology. Apply ONLY the methods listed below to analyze the provided chart.

${methodBlock}

ADDITIONAL FRAMEWORKS (always apply):
- Dow Theory: trend structure, HH/HL (bull) vs LH/LL (bear), non-confirmation signals
- Support/Resistance: swing highs/lows, psychological levels, prior S/R flip zones
- Chart Patterns (Bulkowski): H&S, Double Top/Bottom, Flags, Wedges, Triangles, Cup & Handle
- Risk Management (Van Tharp): R-multiples, expectancy; Mark Douglas: define risk before entry

Analyze the chart image provided. Detect the trading pair and timeframe from visible labels. Assess market structure, current phase, key price levels, confluences, and produce a complete trade setup.

Return ONLY a valid JSON object — no markdown, no code blocks, no extra text:
{
  "pair": "e.g. BTCUSDT or UNKNOWN",
  "timeframe": "e.g. 4H or UNKNOWN",
  "overall_bias": "bullish" or "bearish" or "neutral",
  "confidence": integer 0-100,
  "wyckoff_phase": "description or null",
  "ict_concepts": ["array of detected ICT concepts or empty array"],
  "key_levels": [
    { "price": number, "label": "descriptive label", "type": "support" or "resistance" or "neutral" }
  ],
  "entry_zone": { "low": number or null, "high": number or null, "notes": "reason" } or null,
  "stop_loss": { "price": number or null, "reason": "structural reason" } or null,
  "take_profit": [
    { "price": number, "rr": "1:X", "label": "target description" }
  ],
  "confluences": ["array of confluence strings, be specific"],
  "invalidation": "specific price action or candle close that kills the setup",
  "summary": "3-5 sentences covering market context, setup rationale, and key things to watch"
}

Rules:
- All prices must come from visible chart data only
- key_levels: list up to 5 significant levels
- take_profit: provide 2 targets when possible (partial + runner)
- confidence: 50=weak, 65=moderate, 78=good confluence, 88+=very high conviction
- If no clear setup exists: overall_bias="neutral", entry_zone=null, stop_loss=null, take_profit=[]
- Be specific and quantitative in every field`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, mimeType, context, methods } = body as {
      imageBase64: string;
      mimeType: string;
      context?: { pair: string; timeframe: string; session: string; bias: string };
      methods?: string[];
    };

    if (!imageBase64 || !mimeType) {
      return NextResponse.json({ error: "Missing image data" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured on server" },
        { status: 500 }
      );
    }

    const systemPrompt = buildSystemPrompt(methods ?? []);

    // Build user message with context
    const contextLines: string[] = [];
    if (context?.pair) contextLines.push(`Trading Pair: ${context.pair}`);
    if (context?.timeframe) contextLines.push(`Timeframe: ${context.timeframe}`);
    if (context?.session) contextLines.push(`Current Session: ${context.session}`);
    if (context?.bias && context.bias !== "No Bias") contextLines.push(`Analyst Bias: ${context.bias}`);

    const userText =
      contextLines.length > 0
        ? `Context provided by analyst:\n${contextLines.join("\n")}\n\nAnalyze this chart and return the JSON setup.`
        : "Analyze this trading chart and return the JSON setup.";

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2500,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mimeType, data: imageBase64 },
              },
              { type: "text", text: userText },
            ],
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Anthropic API error");
    }

    const raw = data.content?.find((b: { type: string }) => b.type === "text")?.text ?? "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const signal = JSON.parse(clean);

    return NextResponse.json({ success: true, data: signal });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
