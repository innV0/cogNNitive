import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: 'esm',
  clean: true,
  outDir: 'dist',
  dts: false,
  noExternal: ['@innv0/format-core'],
});
