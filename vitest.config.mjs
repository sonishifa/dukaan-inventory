import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, 'src') },
  },
  test: {
    environment: 'node',
    // Integration tests share one test database, so files run one at a time.
    fileParallelism: false,
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.js', 'src/app/api/**/*.js'],
      reporter: ['text', 'html', 'json-summary'],
      // The pipeline fails if coverage drops below these numbers.
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
  },
});
