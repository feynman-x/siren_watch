import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { loadEnvConfig } from '../config/env';
import { BinanceService } from './binance.service';
import { SignalService } from './signal.service';
import { TelegramService } from './telegram.service';
import type { MarketSnapshot, SignalType } from './types/market-snapshot';

@Injectable()
export class MarketMonitorService implements OnModuleInit {
  private readonly env = loadEnvConfig();
  private readonly logger = new Logger(MarketMonitorService.name);

  private lastAlertAtBySignal = new Map<SignalType, number>();
  private latestPrice?: number;
  private previousSnapshot?: MarketSnapshot;

  constructor(
    private readonly binanceService: BinanceService,
    private readonly signalService: SignalService,
    private readonly telegramService: TelegramService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.refreshPriceCache();
    await this.refreshSnapshotAndEvaluate();
  }

  @Cron(process.env.PRICE_CRON ?? '*/15 * * * * *')
  async refreshPriceCache(): Promise<void> {
    try {
      this.latestPrice = await this.binanceService.getLatestPrice(this.env.symbol);
      this.logger.log(
        `Price cache updated for ${this.env.symbol}: ${this.latestPrice}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to refresh price cache: ${(error as Error).message}`,
      );
    }
  }

  @Cron(process.env.SIGNAL_CRON ?? '5 * * * * *')
  async refreshSnapshotAndEvaluate(): Promise<void> {
    try {
      const snapshot = await this.binanceService.getSnapshot(
        this.env.symbol,
        this.latestPrice,
      );

      if (!this.previousSnapshot) {
        this.previousSnapshot = snapshot;
        this.logger.log(`Initialized baseline snapshot for ${snapshot.symbol}.`);
        return;
      }

      const signal = this.signalService.detect(this.previousSnapshot, snapshot);
      this.logger.log(
        [
          `Snapshot ${snapshot.symbol}`,
          `price=${snapshot.price.toFixed(5)}`,
          `oiUsd=${snapshot.openInterestUsd.toFixed(2)}`,
          `ls=${snapshot.longShortRatio.toFixed(2)}`,
          `funding=${snapshot.fundingRate}`,
          `signal=${signal.signal}`,
        ].join(' | '),
      );

      if (signal.signal !== 'NO_SIGNAL' && this.shouldAlert(signal.signal)) {
        await this.telegramService.sendSignal(snapshot, signal);
        this.lastAlertAtBySignal.set(signal.signal, Date.now());
        this.logger.log(`Alert sent for ${snapshot.symbol}: ${signal.signal}`);
      }

      this.previousSnapshot = snapshot;
    } catch (error) {
      this.logger.error(
        `Failed to refresh market snapshot: ${(error as Error).message}`,
      );
    }
  }

  private shouldAlert(signal: SignalType): boolean {
    const lastSentAt = this.lastAlertAtBySignal.get(signal);

    if (!lastSentAt) {
      return true;
    }

    const cooldownMs = this.env.alertCooldownMinutes * 60 * 1000;
    return Date.now() - lastSentAt >= cooldownMs;
  }
}
