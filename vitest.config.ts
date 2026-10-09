import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    // --expose-gc lets the frame-allocation test collect before each sample (src/gl/driverCore.test.ts).
    pool: 'forks',
    execArgv: ['--expose-gc'],
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
