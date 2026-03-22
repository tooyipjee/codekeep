import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.tsx'],
  format: ['esm'],
  clean: true,
  sourcemap: false,
  shims: true,
  noExternal: ['@codekeep/shared', '@codekeep/server'],
  external: ['yoga-layout'],
  minify: true,
});
