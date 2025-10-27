import { defineConfig } from 'vitest/config'

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
      // Point tests directly at the source during development
      'next-middy-core': new URL('./packages/next-middy-core/src/', import.meta.url).pathname,
      'next-middy': new URL('./packages/next-middy/src/', import.meta.url).pathname,
    },
  },
})
