import { Client, CheckoutAPI, EnvironmentEnum } from "@adyen/api-library";

const isLive = process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live';

// Fail closed on a half-configured go-live: LIVE Adyen REQUIRES the account's
// live URL prefix (and an API key) — without the prefix the SDK cannot route
// live calls and every real payment fails. Crash loudly at startup instead of
// silently taking money against a misconfigured client.
if (isLive) {
  if (!process.env.ADYEN_API_KEY) {
    throw new Error('Adyen is set to live but ADYEN_API_KEY is missing.');
  }
  if (!process.env.ADYEN_LIVE_URL_PREFIX) {
    throw new Error('Adyen is set to live but ADYEN_LIVE_URL_PREFIX is missing.');
  }
}

export const adyenClient = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: isLive ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
  ...(isLive && process.env.ADYEN_LIVE_URL_PREFIX && {
    liveEndpointUrlPrefix: process.env.ADYEN_LIVE_URL_PREFIX,
  }),
});

export const checkout = new CheckoutAPI(adyenClient);
