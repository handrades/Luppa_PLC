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
