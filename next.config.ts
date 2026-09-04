import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { withSentryConfig } from '@sentry/nextjs/config';

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
  // The organisation is in the EU region, so name the instance explicitly
  // rather than let sentry-cli default to the US one.
  sentryUrl: 'https://de.sentry.io',
  project: process.env.SENTRY_PROJECT ?? 'charlie-m',
  // Only set in CI/Vercel. Without it the build still succeeds — it just skips
  // uploading source maps, so stack traces stay minified.
  //
  // KNOWN GAP as of 04.09.2026: the upload is answering 401 "Authentication
  // credentials were not provided" on every deploy, on all three hotels, and
  // pointing sentryUrl at the EU instance did not change it. 401 with that
  // wording means the request carried no Authorization header at all, so the
  // suspect is this option or the env var not reaching sentry-cli, not the
  // token being wrong. The build is unaffected and errors still report — only
  // stack traces arrive minified. Do not "fix" this by guessing; reproduce it
  // locally with a token you can read before changing anything here.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    // Upload them to Sentry, then delete them from the deployment. Otherwise
    // .map files are served publicly and hand out the whole server source.
    deleteSourcemapsAfterUpload: true,
  },
  webpack: {
    // Drops Sentry's own debug logging from the client bundle.
    treeshake: { removeDebugLogging: true },
    // We create the cron alerts by hand; do not let the plugin invent monitors.
    automaticVercelMonitors: false,
  },
});
