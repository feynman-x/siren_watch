type SignalType =
  | 'SHORT_BUILDUP'
  | 'SHORT_COVERING'
  | 'SHORT_SQUEEZE'
  | 'LONG_SQUEEZE'
  | 'LOSS_OF_ATTENTION'
  | 'NO_SIGNAL';

type MarketSnapshot = {
  fundingRate: number;
  longShortRatio: number;
  openInterestUsd: number;
  price: number;
  quoteVolume: number;
  sampledAt: Date;
  symbol: string;
};

type SignalResult = {
  explanation: string;
  oiChange: number;
  priceChange: number;
  signal: SignalType;
  volumeChange: number;
};

export type { MarketSnapshot, SignalResult, SignalType };
