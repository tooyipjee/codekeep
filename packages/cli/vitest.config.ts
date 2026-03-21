import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
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
