import {
  DerivativesTradingUsdsFutures,
  type DerivativesTradingUsdsFutures as DerivativesTradingUsdsFuturesClient,
} from '@binance/derivatives-trading-usds-futures';
import { Injectable } from '@nestjs/common';

import { loadEnvConfig } from '../config/env';
import type { MarketSnapshot } from './types/market-snapshot';

type BinanceRestResponse<T> = {
  data: () => Promise<T>;
};

type BinanceRestConfiguration = NonNullable<
  ConstructorParameters<typeof DerivativesTradingUsdsFutures>[0]['configurationRestAPI']
>;

type BinanceLongShortRatioPeriod = Parameters<
  DerivativesTradingUsdsFuturesClient['restAPI']['longShortRatio']
>[0]['period'];

@Injectable()
export class BinanceService {
  private readonly env = loadEnvConfig();
  private readonly client = this.createClient();

  async getLatestPrice(symbol = this.env.symbol): Promise<number> {
    const data = await this.request('symbol price ticker', () =>
      this.client.restAPI.symbolPriceTicker({ symbol }),
    );
    const ticker = Array.isArray(data) ? data[0] : data;

    return this.getNumber(ticker?.price, 'price', 'symbol price ticker');
  }

  async getSnapshot(
    symbol = this.env.symbol,
    priceOverride?: number,
  ): Promise<MarketSnapshot> {
    const pricePromise =
      priceOverride !== undefined
        ? Promise.resolve(priceOverride)
        : this.getLatestPrice(symbol);

    const [price, openInterest, fundingRate, quoteVolume, longShortRatio] =
      await Promise.all([
        pricePromise,
        this.getOpenInterestUsd(symbol, pricePromise),
        this.getFundingRate(symbol),
        this.getQuoteVolume(symbol),
        this.getGlobalLongShortRatio(symbol),
      ]);

    return {
      fundingRate,
      longShortRatio,
      openInterestUsd: openInterest,
      price,
      quoteVolume,
      sampledAt: new Date(),
      symbol,
    };
  }

  private async getFundingRate(symbol: string): Promise<number> {
    const data = await this.request('mark price', () =>
      this.client.restAPI.markPrice({ symbol }),
    );
    const markPrice = Array.isArray(data) ? data[0] : data;

    return this.getNumber(
      markPrice?.lastFundingRate,
      'lastFundingRate',
      'mark price',
    );
  }

  private async getGlobalLongShortRatio(symbol: string): Promise<number> {
    const data = await this.request('long short ratio', () =>
      this.client.restAPI.longShortRatio({
        limit: 1,
        period: '5m' as BinanceLongShortRatioPeriod,
        symbol,
      }),
    );

    return this.getNumber(
      data[0]?.longShortRatio ?? '1',
      'longShortRatio',
      'long short ratio',
    );
  }

  private async getOpenInterestUsd(
    symbol: string,
    pricePromise: Promise<number>,
  ): Promise<number> {
    const [openInterestData, price] = await Promise.all([
      this.request('open interest', () =>
        this.client.restAPI.openInterest({ symbol }),
      ),
      pricePromise,
    ]);

    return (
      this.getNumber(
        openInterestData.openInterest,
        'openInterest',
        'open interest',
      ) * price
    );
  }

  private async getQuoteVolume(symbol: string): Promise<number> {
    const data = await this.request('24hr ticker', () =>
      this.client.restAPI.ticker24hrPriceChangeStatistics({ symbol }),
    );
    const ticker = Array.isArray(data) ? data[0] : data;

    return this.getNumber(ticker?.quoteVolume, 'quoteVolume', '24hr ticker');
  }

  private createClient(): DerivativesTradingUsdsFuturesClient {
    const configurationRestAPI: BinanceRestConfiguration = {
      apiKey: this.env.binanceApiKey ?? '',
      basePath: this.env.binanceBaseUrl,
    };

    try {
      return new DerivativesTradingUsdsFutures({
        configurationRestAPI,
      });
    } catch (error) {
      throw new Error(
        `Binance client initialization failed: ${this.getErrorDetails(error)}`,
      );
    }
  }

  private async request<T>(
    operation: string,
    execute: () => Promise<BinanceRestResponse<T>>,
  ): Promise<T> {
    try {
      const response = await execute();

      return await response.data();
    } catch (error) {
      throw new Error(
        `Binance ${operation} request failed: ${this.getErrorDetails(error)}`,
      );
    }
  }

  private getNumber(
    value: string | undefined,
    field: string,
    operation: string,
  ): number {
    if (value === undefined) {
      throw new Error(`Binance ${operation} response missing ${field}`);
    }

    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      throw new Error(
        `Binance ${operation} response contains invalid ${field}: ${value}`,
      );
    }

    return parsed;
  }

  private getErrorDetails(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'unknown error';
    }

    const details: string[] = [error.message];
    const cause = error.cause;

    if (cause && typeof cause === 'object') {
      const code =
        'code' in cause && typeof cause.code === 'string' ? cause.code : undefined;
      const message =
        'message' in cause && typeof cause.message === 'string'
          ? cause.message
          : undefined;

      if (code && message) {
        details.push(`${code}: ${message}`);
      } else if (code) {
        details.push(code);
      } else if (message) {
        details.push(message);
      }
    }

    if ('code' in error && typeof error.code === 'number') {
      details.push(`code=${error.code}`);
    }

    if ('statusCode' in error && typeof error.statusCode === 'number') {
      details.push(`status=${error.statusCode}`);
    }

    return details.join(' | ');
  }
}
