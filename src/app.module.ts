import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { MarketModule } from './market/market.module';

@Module({
  imports: [ScheduleModule.forRoot(), MarketModule],
})
export class AppModule {}
