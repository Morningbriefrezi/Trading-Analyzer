import { Candle } from "@/types/trading";

const BINANCE_BASE = "https://api.binance.com/api/v3";

// Binance kline indices
const K = {
  TIME: 0,
  OPEN: 1,
  HIGH: 2,
  LOW: 3,
  CLOSE: 4,
  VOLUME: 5,
} as const;

export async function fetchKlines(
  symbol: string,
  interval: string,
  limit: number = 200
): Promise<Candle[]> {
  const url = `${BINANCE_BASE}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;

  const res = await fetch(url, {
    next: { revalidate: 30 }, // cache for 30s in Next.js
    headers: { "User-Agent": "trading-assistant/1.0" },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Binance API error ${res.status}: ${body}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: any[][] = await res.json();

  return raw.map((k) => ({
    time: Number(k[K.TIME]),
    open: parseFloat(k[K.OPEN]),
    high: parseFloat(k[K.HIGH]),
    low: parseFloat(k[K.LOW]),
    close: parseFloat(k[K.CLOSE]),
    volume: parseFloat(k[K.VOLUME]),
  }));
}

export const SUPPORTED_SYMBOLS = [
  "BTCUSDT",
  "ETHUSDT",
  "BNBUSDT",
  "SOLUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "DOTUSDT",
  "LINKUSDT",
];

export const SUPPORTED_TIMEFRAMES = [
  { value: "5m", label: "5 Minutes" },
  { value: "15m", label: "15 Minutes" },
  { value: "1h", label: "1 Hour" },
  { value: "4h", label: "4 Hours" },
  { value: "1d", label: "1 Day" },
];
