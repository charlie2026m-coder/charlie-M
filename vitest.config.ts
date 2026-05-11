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
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
