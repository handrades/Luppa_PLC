import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollStore } from '../stores/scrollStore';

// Throttle function to limit scroll event handling with cancellation support
function throttle<T extends (..._args: unknown[]) => void>(
  func: T,
  delay: number
): T & { cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  const throttledFn = ((...args: Parameters<T>) => {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func(...args);
      lastExecTime = currentTime;
    } else {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(
        () => {
          func(...args);
          lastExecTime = Date.now();
          timeoutId = null;
        },
        delay - (currentTime - lastExecTime)
      );
    }
  }) as T & { cancel: () => void };

  throttledFn.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttledFn;
}

export function useScrollRestoration() {
  const location = useLocation();
  const { savePosition, getPosition } = useScrollStore();
  const previousPath = useRef(location.pathname);
  const throttledScrollHandler = useRef<ReturnType<typeof throttle> | null>(null);

  // Create throttled scroll handler
  const handleScroll = useCallback(() => {
    savePosition(location.pathname, window.scrollY);
  }, [location.pathname, savePosition]);

  useEffect(() => {
    // Create new throttled handler with new callback
    throttledScrollHandler.current = throttle(handleScroll, 100);

    // Restore scroll position when entering a route
    const restoredPosition = getPosition(location.pathname);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, restoredPosition);
    });

    // Add scroll listener
    window.addEventListener('scroll', throttledScrollHandler.current, {
      passive: true,
    });

    // Cleanup function
    return () => {
      // Save current position before leaving
      if (previousPath.current !== location.pathname) {
        savePosition(previousPath.current, window.scrollY);
      }
      previousPath.current = location.pathname;

      // Remove scroll listener and cancel any pending throttled calls
      if (throttledScrollHandler.current) {
        window.removeEventListener('scroll', throttledScrollHandler.current);
        throttledScrollHandler.current.cancel();
        throttledScrollHandler.current = null;
      }
    };
  }, [location.pathname, savePosition, getPosition, handleScroll]);
}
