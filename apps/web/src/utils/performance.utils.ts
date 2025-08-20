/**
 * Performance Utilities
 *
 * Utilities for optimizing search performance and rendering
 */

import { useEffect, useMemo, useRef } from 'react';

/**
 * Debounce function with immediate execution option
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number,
  immediate = false
): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let hasBeenCalled = false;

  return ((...args: Parameters<T>) => {
    const callNow = immediate && !hasBeenCalled;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      hasBeenCalled = false;
      if (!immediate) {
        func(...args);
      }
    }, delay);

    if (callNow) {
      hasBeenCalled = true;
      func(...args);
    }
  }) as T;
}

/**
 * Throttle function to limit execution frequency
 */
export function throttle<T extends (...args: unknown[]) => unknown>(func: T, limit: number): T {
  let inThrottle = false;

  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  }) as T;
}

/**
 * Memoize expensive computations with custom equality check
 */
export function memoizeWith<T, U>(
  fn: (arg: T) => U,
  isEqual: (a: T, b: T) => boolean
): (arg: T) => U {
  let lastArg: T;
  let lastResult: U;
  let hasResult = false;

  return (arg: T): U => {
    if (!hasResult || !isEqual(lastArg, arg)) {
      lastArg = arg;
      lastResult = fn(arg);
      hasResult = true;
    }
    return lastResult;
  };
}

/**
 * Simple memoization for functions with primitive arguments
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);

    // Limit cache size to prevent memory leaks
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return result;
  }) as T;
}

/**
 * Intersection Observer hook for virtualization
 */
export function useIntersectionObserver(
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(([entry]) => callback(entry.isIntersecting), {
      threshold: 0.1,
      ...options,
    });

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback, options]);

  return targetRef;
}

/**
 * Virtual scrolling utilities
 */
export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(items: T[], options: VirtualScrollOptions) {
  const { itemHeight, containerHeight, overscan = 5 } = options;

  return useMemo(() => {
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    const totalHeight = items.length * itemHeight;

    return {
      visibleItemCount,
      totalHeight,
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
        const endIndex = Math.min(items.length - 1, startIndex + visibleItemCount + overscan * 2);

        return { startIndex, endIndex };
      },
      getItemStyle: (index: number) => ({
        position: 'absolute' as const,
        top: index * itemHeight,
        height: itemHeight,
        width: '100%',
      }),
    };
  }, [items.length, itemHeight, containerHeight, overscan]);
}

/**
 * Request Idle Callback polyfill and hook
 */
const requestIdleCallback =
  (typeof window !== 'undefined' && window.requestIdleCallback) ||
  ((callback: (deadline: { timeRemaining: () => number }) => void) => {
    const start = Date.now();
    return setTimeout(() => {
      callback({
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1);
  });

export function useIdleCallback(callback: () => void, deps: React.DependencyList) {
  useEffect(() => {
    const handle = requestIdleCallback(callback);
    return () => {
      if (typeof handle === 'number') {
        clearTimeout(handle);
      } else if (handle && 'cancel' in handle) {
        (handle as { cancel: () => void }).cancel();
      }
    };
  }, [callback, deps]);
}

/**
 * Web Worker utilities for heavy computations
 */
export function createWorker(workerFunction: () => void): Worker {
  const blob = new Blob([`(${workerFunction.toString()})()`], { type: 'application/javascript' });

  return new Worker(URL.createObjectURL(blob));
}

/**
 * Search result processing in Web Worker
 */
export function processSearchResultsInWorker(
  results: unknown[],
  searchQuery: string
): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const worker = createWorker(() => {
      self.onmessage = function (e) {
        const { results, searchQuery } = e.data;

        try {
          // Perform heavy processing here
          const processed = results.map((result: Record<string, unknown>) => ({
            ...result,
            // Add computed fields, sorting keys, etc.
            searchRelevance: calculateRelevance(result, searchQuery),
            displayText: formatDisplayText(result),
          }));

          self.postMessage({ success: true, data: processed });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          self.postMessage({ success: false, error: errorMessage });
        }
      };

      function calculateRelevance(result: Record<string, unknown>, query: string): number {
        // Simple relevance calculation
        let score = 0;
        const queryLower = query.toLowerCase();

        if (typeof result.tag_id === 'string' && result.tag_id.toLowerCase().includes(queryLower))
          score += 10;
        if (
          typeof result.description === 'string' &&
          result.description.toLowerCase().includes(queryLower)
        )
          score += 5;
        if (typeof result.make === 'string' && result.make.toLowerCase().includes(queryLower))
          score += 3;
        if (typeof result.model === 'string' && result.model.toLowerCase().includes(queryLower))
          score += 3;

        return score;
      }

      function formatDisplayText(result: Record<string, unknown>): string {
        return `${result.tag_id} - ${result.description}`;
      }
    });

    worker.postMessage({ results, searchQuery });

    worker.onmessage = e => {
      const { success, data, error } = e.data;
      worker.terminate();

      if (success) {
        resolve(data);
      } else {
        reject(new Error(error));
      }
    };

    worker.onerror = error => {
      worker.terminate();
      reject(error);
    };
  });
}

/**
 * Memory management utilities
 */
export class MemoryManager {
  private static instances = new WeakMap();

  static getInstance<T extends object>(obj: T): T {
    if (!this.instances.has(obj)) {
      this.instances.set(obj, obj);
    }
    return this.instances.get(obj);
  }

  static cleanup() {
    // Force garbage collection if available (dev only)
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'gc' in window) {
      (window as { gc?: () => void }).gc?.();
    }
  }
}

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  private static marks = new Map<string, number>();

  static mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  static measure(_name: string, startMark: string): number {
    const startTime = this.marks.get(startMark);
    if (!startTime) {
      // console.warn(`Start mark '${startMark}' not found`);
      return 0;
    }

    const duration = performance.now() - startTime;

    if (process.env.NODE_ENV === 'development') {
      // console.log(`Performance: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  static clearMarks(): void {
    this.marks.clear();
  }
}
