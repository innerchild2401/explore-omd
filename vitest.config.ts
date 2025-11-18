import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // @ts-expect-error - Vite plugin type mismatch between vitest and vite versions
  plugins: [react()],
  test: {
    // Test environment
    environment: 'jsdom',
    
    // Setup files
    setupFiles: ['./__tests__/setup.ts'],
    
    // Glob patterns for test files
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', '.next', 'dist', 'build'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        '__tests__/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '.next/',
        'dist/',
        'build/',
        'coverage/',
        '**/types/**',
        '**/*.stories.{ts,tsx}',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 65,
        statements: 70,
      },
      // Files to always include in coverage
      include: [
        'app/**/*.{ts,tsx}',
        'lib/**/*.{ts,tsx}',
        'components/**/*.{ts,tsx}',
      ],
    },
    
    // Global test timeout
    testTimeout: 10000,
    
    // Mock configuration
    globals: true,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
  
  // Resolve aliases (match tsconfig.json)
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

