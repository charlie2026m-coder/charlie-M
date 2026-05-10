import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

const localStorageStore: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => localStorageStore[key] ?? null,
    setItem: (key: string, value: string) => { localStorageStore[key] = value; },
    removeItem: (key: string) => { delete localStorageStore[key]; },
    clear: () => Object.keys(localStorageStore).forEach(k => delete localStorageStore[k]),
    get length() { return Object.keys(localStorageStore).length; },
    key: (i: number) => Object.keys(localStorageStore)[i] ?? null,
  },
  writable: true,
});

beforeEach(() => {
  vi.clearAllMocks();
});
