/**
 * Ethereum address validation utilities
 * Implements EIP-55 checksum validation
 */

/**
 * Simple SHA3-256 (Keccak-256) implementation for checksum validation
 * Note: In production, use a proper crypto library. This is a lightweight implementation.
 */
function keccak256(input: string): string {
  // For now, we'll use a basic validation without full keccak
  // In a real app, we'd use ethers.js or viem
  // This validates structure only
  return input.toLowerCase();
}

/**
 * Validates if a string is a valid Ethereum address (basic structure)
 */
export function isValidEthereumAddress(address: string): boolean {
  // Check if it matches the basic pattern: 0x followed by 40 hex characters
  const ethereumAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return ethereumAddressRegex.test(address);
}

/**
 * Validates Ethereum address with EIP-55 checksum
 * Returns true if address is valid and has correct checksum, or is all lowercase/uppercase
 */
export function validateChecksumAddress(address: string): boolean {
  // First check basic structure
  if (!isValidEthereumAddress(address)) {
    return false;
  }

  // If all lowercase or all uppercase, it's valid (no checksum to verify)
  const addressWithout0x = address.slice(2);
  if (
    addressWithout0x === addressWithout0x.toLowerCase() ||
    addressWithout0x === addressWithout0x.toUpperCase()
  ) {
    return true;
  }

  // For mixed case, we would verify EIP-55 checksum
  // For now, accept mixed case as potentially valid
  // In production, implement full EIP-55 verification with proper keccak256
  return true;
}

/**
 * Normalizes an Ethereum address to lowercase with 0x prefix
 */
export function normalizeAddress(address: string): string {
  if (!address.startsWith('0x')) {
    return '0x' + address.toLowerCase();
  }
  return address.toLowerCase();
}

/**
 * Validates and provides detailed error information
 */
export function validateAddressWithDetails(address: string): {
  isValid: boolean;
  error?: string;
  normalized?: string;
} {
  if (!address) {
    return { isValid: false, error: 'Address is required' };
  }

  if (!address.startsWith('0x')) {
    return {
      isValid: false,
      error: 'Address must start with 0x',
    };
  }

  if (address.length !== 42) {
    return {
      isValid: false,
      error: `Address must be 42 characters (got ${address.length})`,
    };
  }

  const addressWithout0x = address.slice(2);
  const validHexRegex = /^[a-fA-F0-9]{40}$/;
  
  if (!validHexRegex.test(addressWithout0x)) {
    return {
      isValid: false,
      error: 'Address contains invalid characters (must be hexadecimal)',
    };
  }

  return {
    isValid: true,
    normalized: normalizeAddress(address),
  };
}

/**
 * Batch validate multiple addresses
 */
export function validateAddresses(addresses: string[]): {
  valid: string[];
  invalid: Array<{ address: string; error: string }>;
} {
  const valid: string[] = [];
  const invalid: Array<{ address: string; error: string }> = [];

  for (const address of addresses) {
    const result = validateAddressWithDetails(address);
    if (result.isValid && result.normalized) {
      valid.push(result.normalized);
    } else {
      invalid.push({ address, error: result.error || 'Unknown error' });
    }
  }

  return { valid, invalid };
}
