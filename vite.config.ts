import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

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
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    globals: false,
    include: ['src/tests/**/*.test.ts'],
  },
})
