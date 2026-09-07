import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./vitest.setup.ts'],
    env: {
      GUESTWAY_API_URL: 'https://guestway.test',
      GUESTWAY_API_KEY: 'test-key',
      GUESTWAY_ACCESS_TOKEN: 'test-token',
      APALEO_PROPERTY_ID: 'CMH',
      ADYEN_HMAC_KEY: '',
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'services/**', 'store/**', 'app/api/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // lib/logger.ts imports @sentry/nextjs at module scope and almost every
      // service imports the logger. Under vitest that reaches
      // @sentry/server-utils, whose vendored webpack plugin calls
      // fileURLToPath on a non-file URL and throws — 13 of 29 test files died
      // on import, on CI and locally. Tests assert nothing about Sentry, so the
      // package is kept out of the test module graph rather than production
      // code being reshaped around a test runner.
      '@sentry/nextjs': path.resolve(__dirname, '__tests__/stubs/sentry.ts'),
    },
  },
});
