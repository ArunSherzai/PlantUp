// ============================================================
// Test Suite — Mentor API Trigger Rules
// ============================================================
// Covers: shouldFetchMentor logic, cost-optimization triggers,
//         rapid state transitions.
// All Supabase imports are mocked to prevent env var errors.
// ============================================================

// Mock Supabase before any imports
jest.mock('../../../utils/supabase', () => ({
  db: {
    public: { auth: { getSession: jest.fn(), getUser: jest.fn() }, storage: { from: jest.fn() } },
    social: { from: jest.fn(), rpc: jest.fn() },
    micro: { from: jest.fn() },
    gamification: { from: jest.fn() },
    user: { from: jest.fn() },
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

import { shouldFetchMentor } from '../api/mentorApi';
import type { HealthResult } from '../types/mentor.types';

function buildHealth(overrides?: Partial<HealthResult>): HealthResult {
  return {
    health_percent: 85,
    status: 'GOOD',
    subscores: { temperature: 100, humidity: 90 },
    deviations: [],
    trends: {},
    ...overrides,
  };
}

describe('shouldFetchMentor', () => {
  it('should return false when health is null', () => {
    expect(shouldFetchMentor(null)).toBe(false);
  });

  it('should return true when forced', () => {
    expect(shouldFetchMentor(buildHealth(), true)).toBe(true);
  });

  it('should return true when forced with null health', () => {
    expect(shouldFetchMentor(null, true)).toBe(true);
  });

  it('should return false when GOOD and no concerning trends', () => {
    const h = buildHealth({ trends: { ec_14d: 'stable', moisture_var_7d: 'low' } });
    expect(shouldFetchMentor(h)).toBe(false);
  });

  it('should return true when status is WARNING', () => {
    expect(shouldFetchMentor(buildHealth({ status: 'WARNING' }))).toBe(true);
  });

  it('should return true when status is BAD', () => {
    expect(shouldFetchMentor(buildHealth({ status: 'BAD' }))).toBe(true);
  });

  it('should return true when EC trend is rising', () => {
    expect(shouldFetchMentor(buildHealth({ trends: { ec_14d: 'rising' } }))).toBe(true);
  });

  it('should return false when EC trend is falling', () => {
    expect(shouldFetchMentor(buildHealth({ trends: { ec_14d: 'falling' } }))).toBe(false);
  });

  it('should return true when moisture variance is high', () => {
    expect(shouldFetchMentor(buildHealth({ trends: { moisture_var_7d: 'high' } }))).toBe(true);
  });

  it('should return false when moisture variance is low or med', () => {
    expect(shouldFetchMentor(buildHealth({ trends: { moisture_var_7d: 'low' } }))).toBe(false);
    expect(shouldFetchMentor(buildHealth({ trends: { moisture_var_7d: 'med' } }))).toBe(false);
  });

  it('should return true when any deviation is severe', () => {
    const h = buildHealth({
      deviations: [{
        metric: 'temperature', direction: 'low', severity: 'severe',
        value: 5, ideal_min: 18, ideal_max: 28,
      }],
    });
    expect(shouldFetchMentor(h)).toBe(true);
  });

  it('should return false when deviations are only mild/moderate', () => {
    const h = buildHealth({
      deviations: [
        { metric: 'humidity', direction: 'low', severity: 'mild', value: 35, ideal_min: 40, ideal_max: 70 },
        { metric: 'light', direction: 'high', severity: 'moderate', value: 18000, ideal_min: 1000, ideal_max: 15000 },
      ],
    });
    expect(shouldFetchMentor(h)).toBe(false);
  });
});

describe('shouldFetchMentor — Rapid State Transitions', () => {
  it('should correctly handle GOOD → BAD → GOOD', () => {
    expect(shouldFetchMentor(buildHealth({ status: 'GOOD' }))).toBe(false);
    expect(shouldFetchMentor(buildHealth({ status: 'BAD' }))).toBe(true);
    expect(shouldFetchMentor(buildHealth({ status: 'GOOD' }))).toBe(false);
  });

  it('should handle rapid trend changes', () => {
    expect(shouldFetchMentor(buildHealth({ trends: { ec_14d: 'stable' } }))).toBe(false);
    expect(shouldFetchMentor(buildHealth({ trends: { ec_14d: 'rising' } }))).toBe(true);
    expect(shouldFetchMentor(buildHealth({ trends: { ec_14d: 'falling' } }))).toBe(false);
  });
});
