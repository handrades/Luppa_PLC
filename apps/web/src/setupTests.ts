import '@testing-library/jest-dom'

// Mock environment variables for tests
Object.defineProperty(window, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_URL: 'http://localhost:3101/api',
        VITE_APP_NAME: 'Luppa PLC Inventory Test',
        DEV: true,
        PROD: false,
        MODE: 'test',
      },
    },
  },
})

// Mock crypto.randomUUID for tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: (() => {
      let counter = 0
      return () => `test-uuid-${++counter}`
    })(),
  },
})
