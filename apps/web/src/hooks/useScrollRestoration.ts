import { useCallback, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useScrollStore } from '../stores/scrollStore';

// Throttle function to limit scroll event handling
function throttle<T extends (..._args: unknown[]) => void>(func: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastExecTime = 0;

  return ((...args: Parameters<T>) => {
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
        },
        delay - (currentTime - lastExecTime)
      );
    }
  }) as T;
}

export function useScrollRestoration() {
  const location = useLocation();
  const { savePosition, getPosition } = useScrollStore();
  const previousPath = useRef(location.pathname);
  const scrollHandlerRef = useRef<(() => void) | null>(null);

  // Create throttled scroll handler
  const handleScroll = useCallback(() => {
    savePosition(location.pathname, window.scrollY);
  }, [location.pathname, savePosition]);

  const throttledScrollHandler = useRef(throttle(handleScroll, 100));

  useEffect(() => {
    // Update throttled handler with new callback
    throttledScrollHandler.current = throttle(handleScroll, 100);

    // Store the handler reference for cleanup
    scrollHandlerRef.current = throttledScrollHandler.current;

    // Restore scroll position when entering a route
    const restoredPosition = getPosition(location.pathname);

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
      window.scrollTo(0, restoredPosition);
    });

    // Add scroll listener
    window.addEventListener('scroll', throttledScrollHandler.current, { passive: true });

    // Cleanup function
    return () => {
      // Save current position before leaving
      if (previousPath.current !== location.pathname) {
        savePosition(previousPath.current, window.scrollY);
      }
      previousPath.current = location.pathname;

      // Remove scroll listener
      if (scrollHandlerRef.current) {
        window.removeEventListener('scroll', scrollHandlerRef.current);
      }
    };
  }, [location.pathname, savePosition, getPosition, handleScroll]);
}
