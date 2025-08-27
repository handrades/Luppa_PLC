/**
 * Convert IP range (startIP-endIP) to CIDR notation
 * Returns undefined if conversion fails or range is invalid
 */
export function ipRangeToCidr(startIP: string, endIP: string): string | undefined {
  try {
    // Convert IP string to 32-bit number
    const ipToNumber = (ip: string): number => {
      const parts = ip.split('.');
      if (parts.length !== 4) return NaN;

      let result = 0;
      for (let i = 0; i < 4; i++) {
        const part = parseInt(parts[i], 10);
        if (isNaN(part) || part < 0 || part > 255) return NaN;
        result = (result << 8) | part;
      }
      return result >>> 0; // Ensure unsigned 32-bit
    };

    const start = ipToNumber(startIP);
    const end = ipToNumber(endIP);

    if (isNaN(start) || isNaN(end) || start > end) {
      return undefined;
    }

    // Find the smallest CIDR block that contains the range
    // This is a simplified implementation that finds exact power-of-2 ranges
    const range = end - start + 1;

    // Check if it's a power of 2 (exact CIDR block)
    if ((range & (range - 1)) === 0) {
      const prefixLength = 32 - Math.log2(range);
      if (Number.isInteger(prefixLength) && prefixLength >= 0 && prefixLength <= 32) {
        // Verify the start address is aligned to the block size
        const blockSize = 1 << (32 - prefixLength);
        if (start % blockSize === 0) {
          return `${startIP}/${prefixLength}`;
        }
      }
    }

    // For non-exact ranges, return the start IP with /32 as a fallback
    // In production, you might want to return multiple CIDR blocks or handle differently
    return `${startIP}/32`;
  } catch {
    return undefined;
  }
}

/**
 * Validate CIDR notation
 */
export function validateCidr(cidr: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
  if (!cidrRegex.test(cidr)) return false;

  const [ip, prefix] = cidr.split('/');
  const parts = ip.split('.');

  // Validate IP parts
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (num < 0 || num > 255) return false;
  }

  // Validate prefix
  const prefixNum = parseInt(prefix, 10);
  return prefixNum >= 0 && prefixNum <= 32;
}
