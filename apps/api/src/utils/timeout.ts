/**
 * Create a promise that rejects after the specified timeout
 *
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that rejects with timeout error after specified time
 */
export const createTimeout = (timeoutMs: number): Promise<never> => {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });
};

/**
 * Race a promise against a timeout, ensuring proper cleanup and no unhandled rejections
 *
 * @param promise - The promise to race against timeout
 * @param timeoutMs - Timeout in milliseconds
 * @returns Promise that resolves with the original promise result or rejects with timeout error
 */
export const raceWithTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  let isResolved = false;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);
    return result;
  } catch (error) {
    isResolved = true;
    if (timeoutId) clearTimeout(timeoutId);
    throw error;
  }
};
