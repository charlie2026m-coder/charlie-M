import { Client, CheckoutAPI, EnvironmentEnum } from "@adyen/api-library";

const isLive = process.env.NEXT_PUBLIC_ADYEN_ENVIRONMENT === 'live';

export const adyenClient = new Client({
  apiKey: process.env.ADYEN_API_KEY!,
  environment: isLive ? EnvironmentEnum.LIVE : EnvironmentEnum.TEST,
  ...(isLive && process.env.ADYEN_LIVE_URL_PREFIX && {
    liveEndpointUrlPrefix: process.env.ADYEN_LIVE_URL_PREFIX,
  }),
});

export const checkout = new CheckoutAPI(adyenClient);
