// ULID Generation Utility

import { EntityPrefix } from '@/types/core';

// Base32 encoding for ULID
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const TIME_MAX = Math.pow(2, 48) - 1;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

class ULIDGenerator {
  private lastTime = 0;
  private lastRandom = new Array(RANDOM_LEN);

  constructor() {
    // Initialize random component
    for (let i = 0; i < RANDOM_LEN; i++) {
      this.lastRandom[i] = Math.floor(Math.random() * ENCODING_LEN);
    }
  }

  private encodeTime(now: number, len: number): string {
    if (now > TIME_MAX) {
      throw new Error('Time too large');
    }

    let result = '';
    for (let i = len - 1; i >= 0; i--) {
      const mod = now % ENCODING_LEN;
      result = ENCODING[mod] + result;
      now = Math.floor(now / ENCODING_LEN);
    }
    return result;
  }

  private encodeRandom(len: number): string {
    let result = '';
    for (let i = 0; i < len; i++) {
      result += ENCODING[this.lastRandom[i]];
    }
    return result;
  }

  private incrementRandom(): void {
    for (let i = RANDOM_LEN - 1; i >= 0; i--) {
      this.lastRandom[i]++;
      if (this.lastRandom[i] < ENCODING_LEN) {
        break;
      }
      this.lastRandom[i] = 0;
    }
  }

  generate(timestamp?: number): string {
    const now = timestamp || Date.now();

    if (now === this.lastTime) {
      // Same millisecond, increment random component
      this.incrementRandom();
    } else if (now < this.lastTime) {
      // Clock went backwards, regenerate random component
      for (let i = 0; i < RANDOM_LEN; i++) {
        this.lastRandom[i] = Math.floor(Math.random() * ENCODING_LEN);
      }
    } else {
      // New millisecond, regenerate random component
      for (let i = 0; i < RANDOM_LEN; i++) {
        this.lastRandom[i] = Math.floor(Math.random() * ENCODING_LEN);
      }
    }

    this.lastTime = now;

    return this.encodeTime(now, TIME_LEN) + this.encodeRandom(RANDOM_LEN);
  }
}

// Singleton ULID generator
const generator = new ULIDGenerator();

// Generate ULID with entity prefix
export function generateULID(prefix?: EntityPrefix): string {
  const ulid = generator.generate();
  return prefix ? `${prefix}${ulid}` : ulid;
}

// Generate ULID at specific timestamp
export function generateULIDAt(timestamp: number, prefix?: EntityPrefix): string {
  const ulid = generator.generate(timestamp);
  return prefix ? `${prefix}${ulid}` : ulid;
}

// Extract timestamp from ULID
export function extractTimestamp(ulid: string): number {
  // Remove entity prefix if present
  const cleanUlid = ulid.includes('_') ? ulid.split('_')[1] : ulid;
  
  if (cleanUlid.length !== TIME_LEN + RANDOM_LEN) {
    throw new Error('Invalid ULID format');
  }

  const timeStr = cleanUlid.substring(0, TIME_LEN);
  let timestamp = 0;
  
  for (let i = 0; i < timeStr.length; i++) {
    const char = timeStr[i];
    const index = ENCODING.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid ULID character');
    }
    timestamp = timestamp * ENCODING_LEN + index;
  }
  
  return timestamp;
}

// Validate ULID format
export function isValidULID(ulid: string): boolean {
  try {
    // Handle entity prefixes
    const cleanUlid = ulid.includes('_') ? ulid.split('_')[1] : ulid;
    
    if (cleanUlid.length !== TIME_LEN + RANDOM_LEN) {
      return false;
    }

    // Check all characters are valid
    for (const char of cleanUlid) {
      if (ENCODING.indexOf(char) === -1) {
        return false;
      }
    }

    // Try to extract timestamp
    extractTimestamp(ulid);
    return true;
  } catch {
    return false;
  }
}

// Get ULID age in seconds
export function getULIDAge(ulid: string): number {
  const timestamp = extractTimestamp(ulid);
  return Math.floor((Date.now() - timestamp) / 1000);
}

// Generate sequential ULIDs for testing
export function generateSequentialULIDs(count: number, prefix?: EntityPrefix): string[] {
  const baseTime = Date.now();
  const ulids: string[] = [];
  
  for (let i = 0; i < count; i++) {
    ulids.push(generateULIDAt(baseTime + i, prefix));
  }
  
  return ulids;
}