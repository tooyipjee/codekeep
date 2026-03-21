import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  shims: true,
  external: ['yoga-layout'],
});
