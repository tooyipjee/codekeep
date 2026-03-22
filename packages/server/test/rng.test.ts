import { describe, it, expect } from 'vitest';
import { mulberry32, hashSeed, shuffle } from '../src/engine/rng.js';

describe('mulberry32', () => {
  it('produces deterministic output for same seed', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(123);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('produces different output for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

describe('hashSeed', () => {
  it('returns same hash for same input', () => {
    expect(hashSeed('test')).toBe(hashSeed('test'));
  });

  it('returns different hashes for different inputs', () => {
    expect(hashSeed('abc')).not.toBe(hashSeed('xyz'));
  });
});

describe('shuffle', () => {
  it('returns all elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const rng = mulberry32(99);
    const result = shuffle(arr, rng);
    expect(result).toHaveLength(5);
    expect(result.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('is deterministic with same rng seed', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const a = shuffle(arr, mulberry32(42));
    const b = shuffle(arr, mulberry32(42));
    expect(a).toEqual(b);
  });
});
