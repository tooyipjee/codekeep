import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    retry: 2,
    testTimeout: 15000,
    coverage: {
      exclude: [
        'src/index.tsx',
        'dist/**',
        'test/**',
        '*.config.ts',
        '*.config.js',
      ],
    },
  },
});
