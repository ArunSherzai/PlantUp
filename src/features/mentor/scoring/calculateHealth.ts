// ============================================================
// Task 2 — Deterministic scoring: calculateHealth()
// ============================================================
// Returns a full HealthResult with subscores, deviations, and
// trend indicators.  NO AI is involved — this is pure math.
// ============================================================

import {
  HealthResult,
  Deviation,
  SensorRange,
  PlantProfile,
} from '../types/mentor.types';
import { DEFAULT_PROFILE, getProfile } from '../config/plantProfiles';

// ---- helpers ---------------------------------------------------------------

/**
 * Score a single reading against its target range.
 *
 *  100 — within [ideal_min, ideal_max]
 *   50 — at min or max boundary
 *    0 — far outside min / max
 *
 * Linear interpolation between zones.
 */
function scoreSensor(value: number, range: SensorRange): number {
  const { min, ideal_min, ideal_max, max } = range;

  if (value >= ideal_min && value <= ideal_max) return 100;

  // Below ideal
  if (value < ideal_min) {
    if (value <= min) return 0;
    // linear 0..100 across [min, ideal_min]
    return ((value - min) / (ideal_min - min)) * 100;
  }

  // Above ideal
  if (value >= max) return 0;
  return ((max - value) / (max - ideal_max)) * 100;
}

/** Derive severity from how far the subscore drops. */
function deriveSeverity(subscore: number): 'mild' | 'moderate' | 'severe' {
  if (subscore >= 60) return 'mild';
  if (subscore >= 30) return 'moderate';
  return 'severe';
}

// ---- trend helpers ---------------------------------------------------------

/**
 * Determine whether EC is rising / stable / falling over the last
 * `days` of readings using simple linear regression slope.
 */
export function ecTrend(
  history: Array<{ electrical_conductivity?: number | null; created_at: string }>,
  days: number = 14
): 'rising' | 'stable' | 'falling' | undefined {
  const cutoff = Date.now() - days * 86_400_000;
  const points = history
    .filter(r => r.electrical_conductivity != null && new Date(r.created_at).getTime() >= cutoff)
    .map(r => ({
      t: new Date(r.created_at).getTime(),
      v: r.electrical_conductivity!,
    }));

  if (points.length < 3) return undefined;

  const n = points.length;
  const meanT = points.reduce((s, p) => s + p.t, 0) / n;
  const meanV = points.reduce((s, p) => s + p.v, 0) / n;

  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.t - meanT) * (p.v - meanV);
    den += (p.t - meanT) ** 2;
  }
  if (den === 0) return 'stable';

  // slope per day
  const slopePerDay = (num / den) * 86_400_000;
  if (slopePerDay > 0.05) return 'rising';
  if (slopePerDay < -0.05) return 'falling';
  return 'stable';
}

/**
 * Moisture variance category over `days` readings.
 */
export function moistureVariance(
  history: Array<{ soil_moisture?: number | null; created_at: string }>,
  days: number = 7
): 'low' | 'med' | 'high' | undefined {
  const cutoff = Date.now() - days * 86_400_000;
  const values = history
    .filter(r => r.soil_moisture != null && new Date(r.created_at).getTime() >= cutoff)
    .map(r => r.soil_moisture!);

  if (values.length < 3) return undefined;

  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stddev = Math.sqrt(variance);

  if (stddev < 5) return 'low';
  if (stddev < 15) return 'med';
  return 'high';
}

// ---- main ------------------------------------------------------------------

/**
 * Calculate a deterministic health score for a plant given its latest
 * sensor readings, an optional profile (defaults to generic), and
 * historical readings for trend analysis.
 *
 * The `readings` object should have the sensor keys that match the
 * profile's `sensors` keys (temperature, humidity, soil_moisture,
 * light, electrical_conductivity).
 */
export function calculateHealth(
  readings: Record<string, number | null | undefined>,
  profileOrKey?: PlantProfile | string | null,
  options?: {
    growthStage?: string;
    season?: string;
    history?: Array<Record<string, any>>;
  }
): HealthResult {
  // resolve profile
  const profile: PlantProfile =
    typeof profileOrKey === 'string' || profileOrKey == null
      ? getProfile(profileOrKey as string | null)
      : profileOrKey;

  const subscores: Record<string, number> = {};
  const deviations: Deviation[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [sensorKey, sensorCfg] of Object.entries(profile.sensors)) {
    const rawValue = readings[sensorKey];
    if (rawValue == null) continue;                   // skip missing sensors

    // apply range overrides from stage / season modifiers
    let range = { ...sensorCfg.range };

    if (options?.growthStage && profile.stage_modifiers?.[options.growthStage]?.range_overrides) {
      range = { ...range, ...profile.stage_modifiers[options.growthStage].range_overrides };
    }
    if (options?.season && profile.season_modifiers?.[options.season]?.range_overrides) {
      range = { ...range, ...profile.season_modifiers[options.season].range_overrides };
    }

    // weight scaling from stage modifier
    let weight = sensorCfg.weight;
    if (options?.growthStage && profile.stage_modifiers?.[options.growthStage]?.weight_scale) {
      weight *= profile.stage_modifiers[options.growthStage].weight_scale!;
    }

    const sub = scoreSensor(rawValue, range);
    subscores[sensorKey] = Math.round(sub);

    weightedSum += sub * weight;
    totalWeight += weight;

    // register deviation if outside ideal
    if (sub < 100) {
      const direction: 'low' | 'high' = rawValue < range.ideal_min ? 'low' : 'high';
      deviations.push({
        metric: sensorKey,
        direction,
        severity: deriveSeverity(sub),
        value: rawValue,
        ideal_min: range.ideal_min,
        ideal_max: range.ideal_max,
      });
    }
  }

  const healthPercent = totalWeight > 0
    ? Math.round(Math.max(0, Math.min(100, weightedSum / totalWeight)))
    : 0;

  const status: HealthResult['status'] =
    healthPercent >= 70 ? 'GOOD' : healthPercent >= 40 ? 'WARNING' : 'BAD';

  // Trends (optional, require history)
  const trends: HealthResult['trends'] = {};
  if (options?.history && options.history.length > 0) {
    trends.ec_14d = ecTrend(options.history as any, 14);
    trends.moisture_var_7d = moistureVariance(options.history as any, 7);
  }

  return {
    health_percent: healthPercent,
    status,
    subscores,
    deviations,
    trends,
  };
}

// ============================================================
// Backward-compatible wrapper
// ============================================================
// `ShowPlantStats.tsx` currently calls `calculateHealth(latest)`
// and expects a plain number.  This wrapper preserves that API.
// When callers migrate they can use the full function above.
// ============================================================
export function calculateHealthLegacy(r: any): number {
  if (!r) return 0;
  return calculateHealth(r).health_percent;
}
