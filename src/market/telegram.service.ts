import { Injectable, Logger } from '@nestjs/common';

import { loadEnvConfig } from '../config/env';
import type { MarketSnapshot, SignalResult } from './types/market-snapshot';

@Injectable()
export class TelegramService {
  private readonly env = loadEnvConfig();
  private readonly logger = new Logger(TelegramService.name);

  async sendSignal(snapshot: MarketSnapshot, signal: SignalResult): Promise<void> {
    if (!this.env.telegramBotToken || !this.env.telegramChatId) {
      this.logger.warn(
        'Telegram is not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable alerts.',
      );
      return;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${this.env.telegramBotToken}/sendMessage`,
      {
        body: JSON.stringify({
          chat_id: this.env.telegramChatId,
          text: this.formatMessage(snapshot, signal),
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    if (!response.ok) {
      throw new Error(
        `Telegram request failed: ${response.status} ${response.statusText}`,
      );
    }
  }

  private formatMessage(
    snapshot: MarketSnapshot,
    signal: SignalResult,
  ): string {
    return [
      `🚨 ${snapshot.symbol} monitor alert`,
      '',
      `Signal: ${signal.signal}`,
      `Price: ${snapshot.price.toFixed(5)}`,
      `Price change: ${this.toPercent(signal.priceChange)}`,
      `OI change: ${this.toPercent(signal.oiChange)}`,
      `Long/Short ratio: ${snapshot.longShortRatio.toFixed(2)}`,
      `Funding: ${this.toPercent(snapshot.fundingRate)}`,
      `24h quote volume: ${snapshot.quoteVolume.toFixed(2)}`,
      '',
      `Explanation: ${signal.explanation}`,
      `Sampled at: ${snapshot.sampledAt.toISOString()}`,
    ].join('\n');
  }

  private toPercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }
}
