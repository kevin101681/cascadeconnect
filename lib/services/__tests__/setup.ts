/**
 * VITEST SETUP FILE
 * Global test configuration and mocks
 */

import { vi } from 'vitest';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for TextEncoder/TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock crypto.randomUUID if not available
if (!global.crypto) {
  global.crypto = {} as any;
}

if (!global.crypto.randomUUID) {
  // Return a valid UUID literal that matches TypeScript's UUID template type
  global.crypto.randomUUID = () => {
    return '123e4567-e89b-12d3-a456-426614174000' as `${string}-${string}-${string}-${string}-${string}`;
  };
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

