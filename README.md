# SIREN Monitor

Minimal NestJS worker for monitoring `SIRENUSDT` on Binance Futures and sending Telegram alerts.

## Signals

- `SHORT_BUILDUP`: price down, OI up
- `SHORT_COVERING`: price up, OI down
- `SHORT_SQUEEZE`: long/short ratio extremely bearish, price up, OI flat or up
- `LONG_SQUEEZE`: long/short ratio extremely bullish, price down, OI flat or up
- `LOSS_OF_ATTENTION`: OI down and volume down

## Setup

```bash
cp .env.example .env
pnpm install
pnpm start:dev
```

Set `BINANCE_API_KEY` in `.env` to send requests with the `X-MBX-APIKEY` header and reduce public endpoint throttling.

## Binance endpoints used

- `/fapi/v1/ticker/price`
- `/fapi/v1/openInterest`
- `/fapi/v1/premiumIndex`
- `/fapi/v1/ticker/24hr`
- `/futures/data/globalLongShortAccountRatio`
