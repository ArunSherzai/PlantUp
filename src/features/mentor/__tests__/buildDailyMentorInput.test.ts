// ============================================================
// Test Suite — Daily Mentor Input Builder (deriveSeason)
// ============================================================
// Covers: season derivation, month boundaries, edge cases.
// Supabase is mocked to prevent env var errors.
// ============================================================

// Mock Supabase before any imports
jest.mock('../../../utils/supabase', () => ({
  db: {
    public: { auth: { getSession: jest.fn(), getUser: jest.fn() }, storage: { from: jest.fn() } },
    social: { from: jest.fn() },
    micro: { from: jest.fn() },
    gamification: { from: jest.fn() },
    user: { from: jest.fn() },
  },
}));

import { deriveSeason } from '../builder/buildDailyMentorInput';

describe('deriveSeason', () => {
  it('should return "winter" for December', () => {
    expect(deriveSeason(new Date('2026-12-15'))).toBe('winter');
  });

  it('should return "winter" for January', () => {
    expect(deriveSeason(new Date('2026-01-01'))).toBe('winter');
  });

  it('should return "winter" for February', () => {
    expect(deriveSeason(new Date('2026-02-28'))).toBe('winter');
  });

  it('should return "spring" for March', () => {
    expect(deriveSeason(new Date('2026-03-01'))).toBe('spring');
  });

  it('should return "spring" for May', () => {
    expect(deriveSeason(new Date('2026-05-31'))).toBe('spring');
  });

  it('should return "summer" for June', () => {
    expect(deriveSeason(new Date('2026-06-01'))).toBe('summer');
  });

  it('should return "summer" for August', () => {
    expect(deriveSeason(new Date('2026-08-31'))).toBe('summer');
  });

  it('should return "autumn" for September', () => {
    expect(deriveSeason(new Date('2026-09-01'))).toBe('autumn');
  });

  it('should return "autumn" for November', () => {
    expect(deriveSeason(new Date('2026-11-30'))).toBe('autumn');
  });

  it('should use current date when no argument is provided', () => {
    const season = deriveSeason();
    expect(['winter', 'spring', 'summer', 'autumn']).toContain(season);
  });

  it('should handle year boundaries (Dec 31 → Jan 1)', () => {
    expect(deriveSeason(new Date('2025-12-31'))).toBe('winter');
    expect(deriveSeason(new Date('2026-01-01'))).toBe('winter');
  });

  it('should handle month boundary transitions correctly', () => {
    // May → June (spring → summer)
    expect(deriveSeason(new Date('2026-05-31'))).toBe('spring');
    expect(deriveSeason(new Date('2026-06-01'))).toBe('summer');

    // Aug → Sep (summer → autumn)
    expect(deriveSeason(new Date('2026-08-31'))).toBe('summer');
    expect(deriveSeason(new Date('2026-09-01'))).toBe('autumn');

    // Nov → Dec (autumn → winter)
    expect(deriveSeason(new Date('2026-11-30'))).toBe('autumn');
    expect(deriveSeason(new Date('2026-12-01'))).toBe('winter');
  });
});
