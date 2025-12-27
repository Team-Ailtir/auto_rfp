import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', '.next', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'lib/services/**/*.ts',
        'lib/validators/**/*.ts',
        'lib/errors/**/*.ts',
        'lib/utils/**/*.ts',
        'lib/middleware/**/*.ts',
      ],
      exclude: [
        'lib/db.ts',
        'lib/utils/supabase/**',
        '**/*.d.ts',
        '**/index.ts',
      ],
      // Initial thresholds - will increase as more tests are added
      thresholds: {
        lines: 10,
        functions: 10,
        branches: 5,
        statements: 10,
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
