/**
 * @fileOverview Polyfills for SSR environment
 * 
 * This file provides polyfills for browser-only APIs that may be accessed
 * during server-side rendering, preventing errors in Next.js SSR.
 */

// Mock localStorage for SSR environment
if (typeof window === 'undefined' && typeof global !== 'undefined') {
    class LocalStorageMock {
        private store: Map<string, string> = new Map();

        getItem(key: string): string | null {
            return this.store.get(key) || null;
        }

        setItem(key: string, value: string): void {
            this.store.set(key, value);
        }

        removeItem(key: string): void {
            this.store.delete(key);
        }

        clear(): void {
            this.store.clear();
        }

        get length(): number {
            return this.store.size;
        }

        key(index: number): string | null {
            const keys = Array.from(this.store.keys());
            return keys[index] || null;
        }
    }

    // @ts-ignore
    global.localStorage = new LocalStorageMock();
    // @ts-ignore
    global.sessionStorage = new LocalStorageMock();
}
