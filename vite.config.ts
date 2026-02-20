import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const getBasePath = (): string => {
  if (!process.env.GITHUB_ACTIONS || !process.env.GITHUB_REPOSITORY) {
    return '/'
  }

  const repositoryName = process.env.GITHUB_REPOSITORY.split('/')[1]
  return repositoryName ? `/${repositoryName}/` : '/'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: getBasePath(),
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) {
            return undefined
          }

          if (id.includes('node_modules/@react-three/fiber/')) {
            return 'vendor-r3f'
          }

          if (id.includes('node_modules/@react-three/drei/')) {
            return 'vendor-drei'
          }

          if (
            id.includes('node_modules/@react-three/postprocessing/') ||
            id.includes('node_modules/postprocessing/')
          ) {
            return 'vendor-postfx'
          }

          if (id.includes('node_modules/three/examples/jsm/')) {
            return 'vendor-three-examples'
          }

          if (id.includes('node_modules/three-stdlib/')) {
            return 'vendor-three-stdlib'
          }

          if (id.includes('node_modules/three/')) {
            return 'vendor-three-core'
          }

          if (id.includes('node_modules/zustand/') || id.includes('node_modules/immer/')) {
            return 'vendor-state'
          }

          if (id.includes('node_modules/howler/')) {
            return 'vendor-audio'
          }

          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    globals: false,
    include: ['src/tests/**/*.test.ts'],
  },
})
