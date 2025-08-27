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
// We need to inject import.meta.env in a way that eval() can access it
// This is done by modifying the global scope that eval operates in
(function () {
  // Create a global import.meta.env reference that eval can access
  const script = document.createElement('script');
  script.textContent = `
    // Define import.meta.env globally for eval access
    if (typeof globalThis.import === 'undefined') {
      globalThis.import = {};
    }
    if (typeof globalThis.import.meta === 'undefined') {
      globalThis.import.meta = {};
    }
    globalThis.import.meta.env = ${JSON.stringify(testEnv)};
  `;
  document.head.appendChild(script);
  document.head.removeChild(script);
})();

// Also define it directly on globalThis for non-eval access
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

// Mock crypto.randomUUID for tests - preserve existing crypto members
if (!globalThis.crypto) {
  // If crypto doesn't exist, create it
  globalThis.crypto = {} as Crypto;
}

// Only add randomUUID if it doesn't exist
if (typeof globalThis.crypto.randomUUID !== 'function') {
  const randomUUID = (() => {
    let counter = 0;
    return () => `test-uuid-${++counter}`;
  })();

  // Add randomUUID to existing crypto object
  Object.defineProperty(globalThis.crypto, 'randomUUID', {
    value: randomUUID,
    writable: true,
    configurable: true,
  });
}

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
