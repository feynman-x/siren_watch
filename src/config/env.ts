type EnvConfig = {
  alertCooldownMinutes: number;
  binanceApiKey?: string;
  binanceBaseUrl: string;
  extremeLongRatio: number;
  extremeShortRatio: number;
  oiDownThreshold: number;
  oiUpThreshold: number;
  priceChangeThreshold: number;
  priceCron: string;
  signalCron: string;
  symbol: string;
  telegramBotToken?: string;
  telegramChatId?: string;
  volumeDropThreshold: number;
};

function getNumber(name: string, fallback: number): number {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid numeric environment variable: ${name}`);
  }

  return parsed;
}

function getString(name: string, fallback?: string): string {
  const value = process.env[name];

  if (value !== undefined && value !== '') {
    return value;
  }

  if (fallback !== undefined) {
    return fallback;
  }

  throw new Error(`Missing environment variable: ${name}`);
}

export function loadEnvConfig(): EnvConfig {
  return {
    alertCooldownMinutes: getNumber('ALERT_COOLDOWN_MINUTES', 30),
    binanceApiKey: process.env.BINANCE_API_KEY,
    binanceBaseUrl: getString('BINANCE_BASE_URL', 'https://fapi.binance.com'),
    extremeLongRatio: getNumber('EXTREME_LONG_RATIO', 1.8),
    extremeShortRatio: getNumber('EXTREME_SHORT_RATIO', 0.8),
    oiDownThreshold: getNumber('OI_DOWN_THRESHOLD', 0.02),
    oiUpThreshold: getNumber('OI_UP_THRESHOLD', 0.01),
    priceChangeThreshold: getNumber('PRICE_CHANGE_THRESHOLD', 0.01),
    priceCron: getString('PRICE_CRON', '*/15 * * * * *'),
    signalCron: getString('SIGNAL_CRON', '30 * * * * *'),
    symbol: getString('BINANCE_SYMBOL', 'SIRENUSDT').toUpperCase(),
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    volumeDropThreshold: getNumber('VOLUME_DROP_THRESHOLD', 0.15),
  };
}

export type { EnvConfig };
