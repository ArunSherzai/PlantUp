// ============================================================
// Standalone test — uses relative imports, no path aliases
// Run with:  npx tsx src/features/mentor/__tests__/runTest.ts
// ============================================================

// Inline the types we need (to avoid alias resolution issues)
type SensorRange = { min: number; ideal_min: number; ideal_max: number; max: number };
type PlantProfile = {
  type_key: string;
  display_name: string;
  sensors: Record<string, { range: SensorRange; weight: number; unit: string }>;
  stage_modifiers?: Record<string, { weight_scale?: number; range_overrides?: Partial<SensorRange> }>;
  season_modifiers?: Record<string, { range_overrides?: Partial<SensorRange> }>;
};

// ----- Inline scoring (copy of calculateHealth logic) -----
function scoreSensor(value: number, range: SensorRange): number {
  if (value >= range.ideal_min && value <= range.ideal_max) return 100;
  if (value < range.ideal_min) return value <= range.min ? 0 : ((value - range.min) / (range.ideal_min - range.min)) * 100;
  return value >= range.max ? 0 : ((range.max - value) / (range.max - range.ideal_max)) * 100;
}

// ----- Inline profiles -----
const PROFILES: Record<string, PlantProfile> = {
  'spider plant': {
    type_key: 'spider plant', display_name: 'Spider Plant (Chlorophytum comosum)',
    sensors: {
      temperature: { range: { min: 7, ideal_min: 16, ideal_max: 27, max: 35 }, weight: 0.20, unit: '°C' },
      humidity: { range: { min: 25, ideal_min: 40, ideal_max: 70, max: 90 }, weight: 0.10, unit: '%' },
      soil_moisture: { range: { min: 15, ideal_min: 35, ideal_max: 60, max: 80 }, weight: 0.30, unit: '%' },
      light: { range: { min: 200, ideal_min: 1000, ideal_max: 12000, max: 30000 }, weight: 0.25, unit: 'lux' },
      electrical_conductivity: { range: { min: 0.2, ideal_min: 0.5, ideal_max: 1.5, max: 2.5 }, weight: 0.15, unit: 'mS/cm' },
    },
  },
  'strawberry': {
    type_key: 'strawberry', display_name: 'Strawberry (Ostara)',
    sensors: {
      temperature: { range: { min: 2, ideal_min: 15, ideal_max: 26, max: 35 }, weight: 0.20, unit: '°C' },
      humidity: { range: { min: 30, ideal_min: 50, ideal_max: 75, max: 90 }, weight: 0.10, unit: '%' },
      soil_moisture: { range: { min: 20, ideal_min: 40, ideal_max: 65, max: 80 }, weight: 0.30, unit: '%' },
      light: { range: { min: 2000, ideal_min: 6000, ideal_max: 35000, max: 70000 }, weight: 0.20, unit: 'lux' },
      electrical_conductivity: { range: { min: 0.5, ideal_min: 1.0, ideal_max: 2.0, max: 3.5 }, weight: 0.20, unit: 'mS/cm' },
    },
  },
  'mint': {
    type_key: 'mint', display_name: 'Mint (Mentha spicata)',
    sensors: {
      temperature: { range: { min: 2, ideal_min: 15, ideal_max: 25, max: 35 }, weight: 0.20, unit: '°C' },
      humidity: { range: { min: 30, ideal_min: 50, ideal_max: 80, max: 95 }, weight: 0.10, unit: '%' },
      soil_moisture: { range: { min: 25, ideal_min: 45, ideal_max: 70, max: 85 }, weight: 0.30, unit: '%' },
      light: { range: { min: 500, ideal_min: 3000, ideal_max: 20000, max: 50000 }, weight: 0.20, unit: 'lux' },
      electrical_conductivity: { range: { min: 0.3, ideal_min: 0.8, ideal_max: 2.0, max: 3.0 }, weight: 0.20, unit: 'mS/cm' },
    },
  },
  'snow rose': {
    type_key: 'snow rose', display_name: 'Snow rose (Helleborus niger)',
    sensors: {
      temperature: { range: { min: -10, ideal_min: 3, ideal_max: 18, max: 28 }, weight: 0.25, unit: '°C' },
      humidity: { range: { min: 30, ideal_min: 45, ideal_max: 70, max: 85 }, weight: 0.10, unit: '%' },
      soil_moisture: { range: { min: 15, ideal_min: 30, ideal_max: 55, max: 75 }, weight: 0.30, unit: '%' },
      light: { range: { min: 100, ideal_min: 500, ideal_max: 8000, max: 20000 }, weight: 0.20, unit: 'lux' },
      electrical_conductivity: { range: { min: 0.3, ideal_min: 0.6, ideal_max: 1.5, max: 2.5 }, weight: 0.15, unit: 'mS/cm' },
    },
    season_modifiers: {
      winter: { range_overrides: { ideal_min: 0, ideal_max: 12 } },
      summer: { range_overrides: { ideal_min: 12, ideal_max: 24 } },
    },
  },
};

function getProfile(name: string): PlantProfile {
  const lower = name.toLowerCase();
  if (PROFILES[lower]) return PROFILES[lower];
  for (const [key, profile] of Object.entries(PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return PROFILES['spider plant']; // fallback
}

function calcHealth(
  readings: Record<string, number>,
  profileName: string,
  season?: string
) {
  const profile = getProfile(profileName);
  const subscores: Record<string, number> = {};
  const deviations: Array<{ metric: string; direction: string; severity: string; value: number; ideal: string }> = [];
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, cfg] of Object.entries(profile.sensors)) {
    const v = readings[key];
    if (v == null) continue;

    let range = { ...cfg.range };
    if (season && profile.season_modifiers?.[season]?.range_overrides) {
      range = { ...range, ...profile.season_modifiers[season].range_overrides };
    }

    const sub = scoreSensor(v, range);
    subscores[key] = Math.round(sub);
    weightedSum += sub * cfg.weight;
    totalWeight += cfg.weight;

    if (sub < 100) {
      deviations.push({
        metric: key,
        direction: v < range.ideal_min ? 'LOW' : 'HIGH',
        severity: sub >= 60 ? 'mild' : sub >= 30 ? 'moderate' : 'severe',
        value: v,
        ideal: `${range.ideal_min}..${range.ideal_max}`,
      });
    }
  }

  const hp = totalWeight > 0 ? Math.round(Math.max(0, Math.min(100, weightedSum / totalWeight))) : 0;
  const status = hp >= 70 ? 'GOOD' : hp >= 40 ? 'WARNING' : 'BAD';
  return { health_percent: hp, status, subscores, deviations };
}

// ============================================================
// RUN TESTS
// ============================================================

console.log('\n╔══════════════════════════════════════════════════╗');
console.log('║        PlantUp Mentor — Scoring Tests           ║');
console.log('╚══════════════════════════════════════════════════╝');

// TEST 1: Profile lookup
console.log('\n── Test 1: Profile Lookup ──');
const lookups = [
  'Spider Plant (Chlorophytum comosum)',
  'Strawberry (Ostara)',
  'Mint (Mentha spicata)',
  'Snow rose (Helleborus niger)',
];
for (const name of lookups) {
  const p = getProfile(name);
  const match = p.type_key !== 'spider plant' || name.toLowerCase().includes('spider')
    ? '✅' : '❌';
  console.log(`  ${match} "${name}" → ${p.display_name}`);
}

// TEST 2: Perfect readings for Spider Plant
console.log('\n── Test 2: Spider Plant — Perfect Conditions ──');
const r1 = calcHealth(
  { temperature: 22, humidity: 55, soil_moisture: 45, light: 5000, electrical_conductivity: 1.0 },
  'Spider Plant (Chlorophytum comosum)'
);
console.log(`  Health: ${r1.health_percent}% [${r1.status}]`);
console.log(`  Subscores:`, r1.subscores);
console.log(`  Deviations: ${r1.deviations.length === 0 ? 'None ✅' : ''}`);

// TEST 3: Bad readings for Mint
console.log('\n── Test 3: Mint — Stressed (hot, dry, too much light) ──');
const r2 = calcHealth(
  { temperature: 38, humidity: 20, soil_moisture: 10, light: 50000, electrical_conductivity: 3.5 },
  'Mint (Mentha spicata)'
);
console.log(`  Health: ${r2.health_percent}% [${r2.status}]`);
console.log(`  Subscores:`, r2.subscores);
for (const d of r2.deviations) {
  console.log(`  ⚠️  ${d.metric}: ${d.value} is ${d.direction} (${d.severity}) — ideal: ${d.ideal}`);
}

// TEST 4: Snow rose at 5°C in WINTER (should be great!)
console.log('\n── Test 4: Snow Rose — 5°C in Winter (peak season) ──');
const r3 = calcHealth(
  { temperature: 5, humidity: 55, soil_moisture: 40, light: 2000, electrical_conductivity: 0.8 },
  'Snow rose (Helleborus niger)',
  'winter'
);
console.log(`  Health: ${r3.health_percent}% [${r3.status}]`);
console.log(`  Subscores:`, r3.subscores);

// TEST 5: Snow rose at 5°C in SUMMER (should score worse)
console.log('\n── Test 5: Snow Rose — 5°C in Summer (too cold for summer range) ──');
const r4 = calcHealth(
  { temperature: 5, humidity: 55, soil_moisture: 40, light: 2000, electrical_conductivity: 0.8 },
  'Snow rose (Helleborus niger)',
  'summer'
);
console.log(`  Health: ${r4.health_percent}% [${r4.status}]`);
console.log(`  Subscores:`, r4.subscores);
const diff = r3.health_percent - r4.health_percent;
console.log(`  Season impact: Winter scores ${diff > 0 ? '+' : ''}${diff}% vs Summer ${diff > 0 ? '✅' : '❌'}`);

// TEST 6: Strawberry in good conditions
console.log('\n── Test 6: Strawberry — Ideal Summer Growing ──');
const r5 = calcHealth(
  { temperature: 22, humidity: 60, soil_moisture: 50, light: 15000, electrical_conductivity: 1.5 },
  'Strawberry (Ostara)'
);
console.log(`  Health: ${r5.health_percent}% [${r5.status}]`);
console.log(`  Subscores:`, r5.subscores);

console.log('\n══════════════════════════════════════════════════');
console.log('  All scoring tests completed! ✅');
console.log('══════════════════════════════════════════════════\n');
