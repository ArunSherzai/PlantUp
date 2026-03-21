// ============================================================
// Test Suite — Utility Functions (mentorUtils, formatNumber, rng)
// ============================================================
// Covers: mentor eligibility, number formatting, PRNG.
// ============================================================

import { isMentor, MENTOR_MIN_LEVEL, MENTOR_MIN_POSTS } from '../mentorUtils';
import { formatNumber } from '../formatNumber';
import { mulberry32 } from '../rng';

// ============================================================
// 1. isMentor — Mentor Eligibility
// ============================================================

describe('isMentor', () => {
  it('should return true when both criteria are met', () => {
    expect(isMentor(MENTOR_MIN_LEVEL, MENTOR_MIN_POSTS)).toBe(true);
  });

  it('should return true for levels above minimum', () => {
    expect(isMentor(50, 10)).toBe(true);
  });

  it('should return false when level is below minimum', () => {
    expect(isMentor(MENTOR_MIN_LEVEL - 1, MENTOR_MIN_POSTS)).toBe(false);
  });

  it('should return false when posts are below minimum', () => {
    expect(isMentor(MENTOR_MIN_LEVEL, MENTOR_MIN_POSTS - 1)).toBe(false);
  });

  it('should return false when both are below minimum', () => {
    expect(isMentor(1, 0)).toBe(false);
  });

  it('should return true at exact boundary values', () => {
    expect(isMentor(25, 5)).toBe(true);
  });

  it('should handle edge case of level 0', () => {
    expect(isMentor(0, 100)).toBe(false);
  });
});

// ============================================================
// 2. formatNumber — Number Display Formatting
// ============================================================

describe('formatNumber', () => {
  it('should return plain string for numbers < 1000', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(1)).toBe('1');
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with "k" suffix', () => {
    expect(formatNumber(1000)).toBe('1k');
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(2300)).toBe('2.3k');
  });

  it('should remove trailing .0 in thousands', () => {
    expect(formatNumber(2000)).toBe('2k');
    expect(formatNumber(10000)).toBe('10k');
  });

  it('should format millions with "M" suffix', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
    expect(formatNumber(2300000)).toBe('2.3M');
  });

  it('should remove trailing .0 in millions', () => {
    expect(formatNumber(2000000)).toBe('2M');
    expect(formatNumber(10000000)).toBe('10M');
  });

  it('should handle large numbers correctly', () => {
    expect(formatNumber(999999)).toBe('1000k');
    expect(formatNumber(999999999)).toBe('1000M');
  });
});

// ============================================================
// 3. mulberry32 — Deterministic PRNG
// ============================================================

describe('mulberry32', () => {
  it('should produce consistent output for the same seed', () => {
    // Arrange
    const rng1 = mulberry32(12345);
    const rng2 = mulberry32(12345);

    // Act & Assert — same seed, same sequence
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });

  it('should produce values in [0, 1) range', () => {
    // Arrange
    const rng = mulberry32(42);

    // Act & Assert
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('should produce different sequences for different seeds', () => {
    // Arrange
    const rng1 = mulberry32(1);
    const rng2 = mulberry32(2);

    // Act
    const seq1 = [rng1(), rng1(), rng1()];
    const seq2 = [rng2(), rng2(), rng2()];

    // Assert
    expect(seq1).not.toEqual(seq2);
  });

  it('should handle seed of 0', () => {
    // Arrange
    const rng = mulberry32(0);

    // Act
    const val = rng();

    // Assert
    expect(typeof val).toBe('number');
    expect(val).toBeGreaterThanOrEqual(0);
    expect(val).toBeLessThan(1);
  });
});
