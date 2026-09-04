import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ['react-phone-number-input'],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apple Pay web domain verification file must be served as plain text.
        source: '/.well-known/apple-developer-merchantid-domain-association',
        headers: [
          { key: 'Content-Type', value: 'text/plain' },
        ],
      },
    ];
  },
};

export default withSentryConfig(withNextIntl(nextConfig), {
  org: 'mboutique-gmbh-co-kg',
  project: process.env.SENTRY_PROJECT ?? 'charlie-m',
  // Only set in CI/Vercel. Without it the build still succeeds — it just skips
  // uploading source maps, so stack traces stay minified.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    // Upload them to Sentry, then delete them from the deployment. Otherwise
    // .map files are served publicly and hand out the whole server source.
    deleteSourcemapsAfterUpload: true,
  },
  // Drops Sentry's own debug logging from the client bundle.
  disableLogger: true,
  // We create the cron alerts by hand; do not let the plugin invent monitors.
  automaticVercelMonitors: false,
});
