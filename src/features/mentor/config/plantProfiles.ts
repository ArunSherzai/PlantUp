// ============================================================
// Task 1 — Plant Profile Configs
// ============================================================
// Add plant types by adding objects here, NOT by writing code.
// Each profile defines sensor target ranges, weights, and
// optional stage/season modifiers.
//
// Current Plant_data entries:
//   id=2  Spider Plant (Chlorophytum comosum)
//   id=3  Strawberry (Ostara)
//   id=4  Mint (Mentha spicata)
//   id=5  Snow rose (Helleborus niger)
// ============================================================

import { PlantProfile } from '../types/mentor.types';

/** Default profile used when no plant-type-specific profile exists. */
export const DEFAULT_PROFILE: PlantProfile = {
  type_key: '_default',
  display_name: 'Generic Houseplant',
  sensors: {
    temperature: {
      range: { min: 10, ideal_min: 18, ideal_max: 28, max: 38 },
      weight: 0.20,
      unit: '°C',
    },
    humidity: {
      range: { min: 20, ideal_min: 40, ideal_max: 70, max: 90 },
      weight: 0.15,
      unit: '%',
    },
    soil_moisture: {
      range: { min: 10, ideal_min: 30, ideal_max: 65, max: 90 },
      weight: 0.25,
      unit: '%',
    },
    light: {
      range: { min: 200, ideal_min: 1000, ideal_max: 15000, max: 50000 },
      weight: 0.20,
      unit: 'lux',
    },
    electrical_conductivity: {
      range: { min: 0.2, ideal_min: 0.8, ideal_max: 2.5, max: 4.0 },
      weight: 0.20,
      unit: 'mS/cm',
    },
  },
  stage_modifiers: {
    seedling: {
      weight_scale: 1.3,
      range_overrides: { ideal_min: 20, ideal_max: 25 },
    },
    dormant: {
      weight_scale: 0.6,
    },
  },
  season_modifiers: {
    winter: {
      range_overrides: { ideal_min: 15, ideal_max: 22 },
    },
  },
};

/**
 * Library of plant-type profiles.
 *
 * ✅ To add a new plant type, simply add an entry here.
 * No other code changes are needed.
 */
export const PLANT_PROFILES: Record<string, PlantProfile> = {

  // ------------------------------------------------------------------
  // Spider Plant (Chlorophytum comosum)
  // Tropical houseplant — indirect light, consistent moisture, very
  // tolerant of a wide humidity range.  Low EC needs.
  // ------------------------------------------------------------------
  'spider plant': {
    type_key: 'spider plant',
    display_name: 'Spider Plant (Chlorophytum comosum)',
    sensors: {
      temperature: {
        range: { min: 7, ideal_min: 16, ideal_max: 27, max: 35 },
        weight: 0.20,
        unit: '°C',
      },
      humidity: {
        range: { min: 25, ideal_min: 40, ideal_max: 70, max: 90 },
        weight: 0.10,
        unit: '%',
      },
      soil_moisture: {
        range: { min: 15, ideal_min: 35, ideal_max: 60, max: 80 },
        weight: 0.30,
        unit: '%',
      },
      light: {
        // Thrives in bright indirect; tolerates low light
        range: { min: 200, ideal_min: 1000, ideal_max: 12000, max: 30000 },
        weight: 0.25,
        unit: 'lux',
      },
      electrical_conductivity: {
        // Sensitive to salt build-up — keep EC low
        range: { min: 0.2, ideal_min: 0.5, ideal_max: 1.5, max: 2.5 },
        weight: 0.15,
        unit: 'mS/cm',
      },
    },
    stage_modifiers: {
      seedling: {
        weight_scale: 1.2,
        range_overrides: { ideal_min: 20, ideal_max: 25 },
      },
    },
    season_modifiers: {
      winter: {
        range_overrides: { ideal_min: 13, ideal_max: 22 },
      },
    },
  },

  // ------------------------------------------------------------------
  // Strawberry (Ostara)
  // Fruit / berry — full sun, good drainage, moderate moisture,
  // higher EC tolerance during fruiting.
  // ------------------------------------------------------------------
  strawberry: {
    type_key: 'strawberry',
    display_name: 'Strawberry (Ostara)',
    sensors: {
      temperature: {
        range: { min: 2, ideal_min: 15, ideal_max: 26, max: 35 },
        weight: 0.20,
        unit: '°C',
      },
      humidity: {
        range: { min: 30, ideal_min: 50, ideal_max: 75, max: 90 },
        weight: 0.10,
        unit: '%',
      },
      soil_moisture: {
        // Needs consistent moisture but good drainage (no waterlogging)
        range: { min: 20, ideal_min: 40, ideal_max: 65, max: 80 },
        weight: 0.30,
        unit: '%',
      },
      light: {
        // Full sun — at least 6 h direct
        range: { min: 2000, ideal_min: 6000, ideal_max: 35000, max: 70000 },
        weight: 0.20,
        unit: 'lux',
      },
      electrical_conductivity: {
        range: { min: 0.5, ideal_min: 1.0, ideal_max: 2.0, max: 3.5 },
        weight: 0.20,
        unit: 'mS/cm',
      },
    },
    stage_modifiers: {
      seedling: {
        weight_scale: 1.3,
        range_overrides: { ideal_max: 22 },
      },
    },
    season_modifiers: {
      winter: {
        // Ostara is everbearing but slows in winter
        range_overrides: { ideal_min: 5, ideal_max: 15 },
      },
    },
  },

  // ------------------------------------------------------------------
  // Mint (Mentha spicata)
  // Herb — loves moisture, partial shade is fine, vigorous grower,
  // relatively low EC needs. Very cold-hardy.
  // ------------------------------------------------------------------
  mint: {
    type_key: 'mint',
    display_name: 'Mint (Mentha spicata)',
    sensors: {
      temperature: {
        range: { min: 2, ideal_min: 15, ideal_max: 25, max: 35 },
        weight: 0.20,
        unit: '°C',
      },
      humidity: {
        range: { min: 30, ideal_min: 50, ideal_max: 80, max: 95 },
        weight: 0.10,
        unit: '%',
      },
      soil_moisture: {
        // Likes consistently moist soil
        range: { min: 25, ideal_min: 45, ideal_max: 70, max: 85 },
        weight: 0.30,
        unit: '%',
      },
      light: {
        // Full sun to partial shade
        range: { min: 500, ideal_min: 3000, ideal_max: 20000, max: 50000 },
        weight: 0.20,
        unit: 'lux',
      },
      electrical_conductivity: {
        range: { min: 0.3, ideal_min: 0.8, ideal_max: 2.0, max: 3.0 },
        weight: 0.20,
        unit: 'mS/cm',
      },
    },
    stage_modifiers: {
      seedling: {
        weight_scale: 1.2,
        range_overrides: { ideal_max: 22 },
      },
    },
    season_modifiers: {
      winter: {
        // Mint goes dormant in winter — very tolerant of cold
        range_overrides: { ideal_min: 2, ideal_max: 12 },
      },
    },
  },

  // ------------------------------------------------------------------
  // Snow rose (Helleborus niger)
  // Shade-loving perennial — blooms in winter, prefers cool temps,
  // tolerates cold. Moderate moisture, good drainage.
  // ------------------------------------------------------------------
  'snow rose': {
    type_key: 'snow rose',
    display_name: 'Snow rose (Helleborus niger)',
    sensors: {
      temperature: {
        // Very cold-hardy — blooms in winter!
        range: { min: -10, ideal_min: 3, ideal_max: 18, max: 28 },
        weight: 0.25,
        unit: '°C',
      },
      humidity: {
        range: { min: 30, ideal_min: 45, ideal_max: 70, max: 85 },
        weight: 0.10,
        unit: '%',
      },
      soil_moisture: {
        // Likes moist but well-drained soil; hates waterlogging
        range: { min: 15, ideal_min: 30, ideal_max: 55, max: 75 },
        weight: 0.30,
        unit: '%',
      },
      light: {
        // Partial to full shade — no direct hot sun
        range: { min: 100, ideal_min: 500, ideal_max: 8000, max: 20000 },
        weight: 0.20,
        unit: 'lux',
      },
      electrical_conductivity: {
        range: { min: 0.3, ideal_min: 0.6, ideal_max: 1.5, max: 2.5 },
        weight: 0.15,
        unit: 'mS/cm',
      },
    },
    stage_modifiers: {
      dormant: {
        // Summer dormancy — less sensitive scoring
        weight_scale: 0.5,
      },
    },
    season_modifiers: {
      summer: {
        // Goes semi-dormant in heat — wider temp OK
        range_overrides: { ideal_min: 12, ideal_max: 24 },
      },
      winter: {
        // This is its peak season! Tighter scoring
        range_overrides: { ideal_min: 0, ideal_max: 12 },
      },
    },
  },
};

// ------------------------------------------------------------------
// Profile lookup with partial matching
// ------------------------------------------------------------------
// Plant_data.common_name values look like:
//   "Spider Plant (Chlorophytum comosum)"
//   "Strawberry (Ostara)"
//   "Mint (Mentha spicata)"
//   "Snow rose (Helleborus niger)"
//
// We match by checking if the common_name *contains* the profile key.
// ------------------------------------------------------------------

/**
 * Look up a profile by plant common_name.
 * Uses partial matching so "Spider Plant (Chlorophytum comosum)"
 * correctly matches the "spider plant" profile.
 * Falls back to `DEFAULT_PROFILE` if no match.
 */
export function getProfile(commonName?: string | null): PlantProfile {
  if (!commonName) return DEFAULT_PROFILE;

  const lower = commonName.toLowerCase();

  // 1. Exact key match
  if (PLANT_PROFILES[lower]) return PLANT_PROFILES[lower];

  // 2. Partial match — check if the common_name contains any profile key
  for (const [key, profile] of Object.entries(PLANT_PROFILES)) {
    if (lower.includes(key)) return profile;
  }

  return DEFAULT_PROFILE;
}
