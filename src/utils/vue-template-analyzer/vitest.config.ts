import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      '**/__tests__/**/*.test.ts',
      '**/__tests__/**/*.spec.ts'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '**/__tests__/**',
        '**/node_modules/**',
        '**/dist/**'
      ]
    },
    timeout: 30000, // 30秒超时，适合处理大文件
    threads: true,
    maxThreads: 4
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../../..')
    }
  }
})