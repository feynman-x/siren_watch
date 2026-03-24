import { Module } from '@nestjs/common';

import { BinanceService } from './binance.service';
import { MarketMonitorService } from './market-monitor.service';
import { SignalService } from './signal.service';
import { TelegramService } from './telegram.service';

@Module({
  providers: [
    BinanceService,
    MarketMonitorService,
    SignalService,
    TelegramService,
  ],
})
export class MarketModule {}
