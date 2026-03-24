import { Injectable } from '@nestjs/common';

import { loadEnvConfig } from '../config/env';
import type { MarketSnapshot, SignalResult } from './types/market-snapshot';

@Injectable()
export class SignalService {
  private readonly env = loadEnvConfig();

  detect(
    previousSnapshot: MarketSnapshot,
    currentSnapshot: MarketSnapshot,
  ): SignalResult {
    const priceChange = this.changeRate(
      previousSnapshot.price,
      currentSnapshot.price,
    );
    const oiChange = this.changeRate(
      previousSnapshot.openInterestUsd,
      currentSnapshot.openInterestUsd,
    );
    const volumeChange = this.changeRate(
      previousSnapshot.quoteVolume,
      currentSnapshot.quoteVolume,
    );

    const extremeShort =
      currentSnapshot.longShortRatio <= this.env.extremeShortRatio;
    const extremeLong =
      currentSnapshot.longShortRatio >= this.env.extremeLongRatio;
    const oiStableOrUp = oiChange >= -0.002;

    if (
      priceChange <= -this.env.priceChangeThreshold &&
      oiChange >= this.env.oiUpThreshold
    ) {
      return {
        explanation: 'Price is falling while OI is rising. Fresh shorts may still be entering.',
        oiChange,
        priceChange,
        signal: 'SHORT_BUILDUP',
        volumeChange,
      };
    }

    if (
      priceChange >= this.env.priceChangeThreshold &&
      oiChange <= -this.env.oiDownThreshold
    ) {
      return {
        explanation: 'Price is rebounding while OI is dropping. Short covering is more likely than trend reversal.',
        oiChange,
        priceChange,
        signal: 'SHORT_COVERING',
        volumeChange,
      };
    }

    if (extremeShort && priceChange >= this.env.priceChangeThreshold && oiStableOrUp) {
      return {
        explanation: 'The market is still crowded on the short side while price pushes higher. A short squeeze may be building.',
        oiChange,
        priceChange,
        signal: 'SHORT_SQUEEZE',
        volumeChange,
      };
    }

    if (extremeLong && priceChange <= -this.env.priceChangeThreshold && oiStableOrUp) {
      return {
        explanation: 'Long positioning remains crowded while price weakens. A long squeeze may be underway.',
        oiChange,
        priceChange,
        signal: 'LONG_SQUEEZE',
        volumeChange,
      };
    }

    if (
      oiChange <= -this.env.oiDownThreshold &&
      volumeChange <= -this.env.volumeDropThreshold
    ) {
      return {
        explanation: 'Both OI and trading activity are fading. Attention is leaving the market.',
        oiChange,
        priceChange,
        signal: 'LOSS_OF_ATTENTION',
        volumeChange,
      };
    }

    return {
      explanation: 'No signal matched.',
      oiChange,
      priceChange,
      signal: 'NO_SIGNAL',
      volumeChange,
    };
  }

  private changeRate(previous: number, current: number): number {
    if (previous === 0) {
      return 0;
    }

    return (current - previous) / previous;
  }
}
