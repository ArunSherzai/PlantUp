// ============================================================
// Task 3 — Daily Mentor Input Builder
// ============================================================
// Compiles a compact DailyMentorInput for one plant on one day.
// This is what gets sent to the LLM (via the edge function).
// ============================================================

import { db } from '../../../utils/supabase';
import { DailyMentorInput, HealthResult } from '../types/mentor.types';
import { calculateHealth } from '../scoring/calculateHealth';
import { getProfile } from '../config/plantProfiles';

// ---- season helper (Vienna-based) ------------------------------------------

/**
 * Derive Northern-Hemisphere season from a date.
 * Vienna is in Central Europe so standard N-hemisphere rules apply.
 */
export function deriveSeason(
  date: Date = new Date()
): 'winter' | 'spring' | 'summer' | 'autumn' {
  const month = date.getMonth(); // 0-indexed
  if (month <= 1 || month === 11) return 'winter';   // Dec, Jan, Feb
  if (month <= 4) return 'spring';                    // Mar, Apr, May
  if (month <= 7) return 'summer';                    // Jun, Jul, Aug
  return 'autumn';                                    // Sep, Oct, Nov
}

// ---- growth stage heuristic ------------------------------------------------

/**
 * Infer growth stage from the age in days (very simple heuristic).
 * In a real app this could come from a user toggle in the UI.
 */
function inferGrowthStage(
  ageDays?: number
): 'seedling' | 'veg' | 'mature' | 'dormant' | undefined {
  if (ageDays == null) return undefined;
  if (ageDays < 21) return 'seedling';
  if (ageDays < 60) return 'veg';
  return 'mature';
}

// ---- main builder ----------------------------------------------------------

/**
 * Build the compact DailyMentorInput for a given user + plant + date.
 *
 * Steps:
 *  1. Fetch plant metadata (nickname, type, environment).
 *  2. Fetch latest sensor reading.
 *  3. Fetch recent history (for trends).
 *  4. Compute HealthResult.
 *  5. Package everything into a small JSON blob.
 */
export async function buildDailyMentorInput(
  userId: string,
  plantId: string,
  date: Date = new Date()
): Promise<DailyMentorInput> {
  // 1. Plant metadata
  const { data: plant, error: plantErr } = await db.social
    .from('Plants')
    .select('id, nickname, description, plant_data_id')
    .eq('id', plantId)
    .eq('user_id', userId)
    .maybeSingle();

  if (plantErr) throw new Error(`Failed to load plant: ${plantErr.message}`);
  if (!plant) throw new Error('Plant not found or not owned by user');

  // Resolve plant type name from Plant_data (if available)
  let plantTypeName = 'unknown';
  if (plant.plant_data_id) {
    const { data: typeRow } = await db.social
      .from('Plant_data')
      .select('common_name')
      .eq('id', plant.plant_data_id)
      .maybeSingle();
    if (typeRow?.common_name) {
      plantTypeName = typeRow.common_name;
    }
  }

  // First look up the device mapping
  const { data: deviceData } = await db.micro
    .from('Devices')
    .select('id')
    .eq('plant_id', plantId)
    .maybeSingle();

  const deviceId = deviceData?.id;

  // 2. Latest reading
  let latest = null;
  if (deviceId) {
    const { data } = await db.micro
      .from('Controllers')
      .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
      .eq('device_id', deviceId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    latest = data;
  }

  // 3. History for trends (last 14 days, up to 200 rows is plenty)
  const cutoff = new Date(Date.now() - 14 * 86_400_000).toISOString();
  let history = null;
  if (deviceId) {
    const { data } = await db.micro
      .from('Controllers')
      .select('electrical_conductivity, soil_moisture, created_at')
      .eq('device_id', deviceId)
      .gte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(200);
    history = data;
  }

  // 4. Compute health
  const profile = getProfile(plantTypeName);
  const season = deriveSeason(date);
  const ageDays = undefined;
  const growthStage = inferGrowthStage(ageDays);

  const healthResult: HealthResult = latest
    ? calculateHealth(latest as Record<string, number | null>, profile, {
        growthStage,
        season,
        history: (history ?? []) as Array<Record<string, any>>,
      })
    : {
        health_percent: 0,
        status: 'BAD',
        subscores: {},
        deviations: [],
        trends: {},
      };

  // 5. Assemble
  const input: DailyMentorInput = {
    plant_id: plantId,
    plant_type: plantTypeName,
    season,
    age_days: ageDays,
    growth_stage: growthStage,
    environment: 'indoor', // TODO: let user toggle indoor/outdoor
    health: healthResult,
  };

  return input;
}
