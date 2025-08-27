import '@testing-library/jest-dom';
import { testEnv } from './test-env';

// Set NODE_ENV for proper Jest environment detection
process.env.NODE_ENV = 'test';

// Add TextEncoder/TextDecoder polyfills for jsdom
// These need to be added synchronously for tests to work
if (typeof globalThis.TextEncoder === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const util = require('util');
  globalThis.TextEncoder = util.TextEncoder;
  globalThis.TextDecoder = util.TextDecoder;
}

// Mock import.meta for Vite environment
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: testEnv,
    },
  },
  writable: true,
  configurable: true,
});

// Also set process.env for fallback
Object.assign(process.env, testEnv);

// Mock crypto.randomUUID for tests
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: (() => {
      let counter = 0;
      return () => `test-uuid-${++counter}`;
    })(),
  },
  writable: true,
  configurable: true,
});

// Mock window.location.href for auth tests
// Only redefine if not already configurable
const descriptor = Object.getOwnPropertyDescriptor(window, 'location');
if (!descriptor || descriptor.configurable) {
  Object.defineProperty(window, 'location', {
    value: { href: '/' },
    writable: true,
    configurable: true,
  });
} else {
  // If location is not configurable, just override the href property
  try {
    window.location.href = '/';
  } catch {
    // Some test environments don't allow this, ignore
  }
}
