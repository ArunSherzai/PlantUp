// ============================================================
// BACKWARD COMPAT — now powered by the Mentor scoring engine
// ============================================================
// The original calculateHealth(r) signature (returns number)
// is preserved for all existing callers.
// New code should import from '~/features/mentor' directly.
// ============================================================

import {
  calculateHealth as calculateHealthFull,
  calculateHealthLegacy,
} from '~/features/mentor';

export type { HealthResult } from '~/features/mentor';

/**
 * Legacy API — returns a number 0..100.
 * All existing callers (ShowPlantStats, etc.) continue to work.
 */
export function calculateHealth(r: any): number {
  return calculateHealthLegacy(r);
}

/**
 * NEW API — returns the full HealthResult with deviations,
 * subscores, and trends.
 */
export { calculateHealthFull };
