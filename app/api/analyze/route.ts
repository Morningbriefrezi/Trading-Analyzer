import { NextRequest, NextResponse } from "next/server";
import { fetchKlines } from "@/lib/data/binance";
import { detectTrend } from "@/lib/strategy/trend";
import { detectLevels } from "@/lib/strategy/supportResistance";
import { selectSetup } from "@/lib/strategy/setups";
import { generateTrade } from "@/lib/trade/generator";
import { calculateIndicators } from "@/lib/strategy/indicators";
import { detectCandlePattern } from "@/lib/strategy/candlePatterns";
import { analyzeVolume } from "@/lib/strategy/volumeAnalysis";
import { calculateFibLevels } from "@/lib/strategy/fibonacci";
import { AnalyzeRequest, AnalyzeResponse, AnalyzeError } from "@/types/trading";

export async function POST(
  req: NextRequest
): Promise<NextResponse<AnalyzeResponse | AnalyzeError>> {
  try {
    const body: AnalyzeRequest = await req.json();
    const { symbol, timeframe } = body;

    if (!symbol || !timeframe) {
      return NextResponse.json(
        { success: false, error: "Missing symbol or timeframe" },
        { status: 400 }
      );
    }

    // 1. Fetch market data
    const candles = await fetchKlines(symbol, timeframe, 200);

    if (candles.length < 50) {
      return NextResponse.json(
        { success: false, error: "Insufficient candle data from Binance" },
        { status: 422 }
      );
    }

    const closes = candles.map((c) => c.close);
    const currentPrice = candles[candles.length - 1].close;

    // 2. Core structure analysis
    const trendResult = detectTrend(candles);
    const levels = detectLevels(candles);
    const setup = selectSetup(currentPrice, trendResult, levels);

    // 3. Book-sourced confluence analysis
    const indicators = calculateIndicators(closes);
    const candlePattern = detectCandlePattern(candles);
    const volume = analyzeVolume(candles);
    const fibLevels = calculateFibLevels(candles);

    // 4. Generate trade signal with full confluence scoring
    const trade = generateTrade(
      candles,
      trendResult,
      levels,
      setup,
      candlePattern,
      indicators,
      volume,
      fibLevels
    );

    return NextResponse.json({
      success: true,
      data: trade,
      symbol: symbol.toUpperCase(),
      timeframe,
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    console.error("[/api/analyze] Error:", err);

    const message =
      err instanceof Error ? err.message : "Unknown server error";

    if (message.includes("Binance API error")) {
      return NextResponse.json(
        { success: false, error: `Data fetch failed: ${message}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
