import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
  resolve: {
    alias: {
      // Point tests directly at source directories during development
      'next-middy': new URL('./packages/next-middy/src/', import.meta.url).pathname,
      'next-middy/core': new URL('./packages/next-middy/src/core/', import.meta.url).pathname,
      'next-middy/zod': new URL('./packages/next-middy/src/zod/', import.meta.url).pathname,
      'tests/utils': path.resolve('./tests/utils'),
    },
    extensions: ['.ts', '.js'],
  },
})
