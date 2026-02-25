// ============================================================
// Quick test for Layer A (scoring) + Layer B (builder types)
// Run with:  npx ts-node src/features/mentor/__tests__/testScoring.ts
// ============================================================

import { calculateHealth } from '../scoring/calculateHealth';
import { getProfile, PLANT_PROFILES } from '../config/plantProfiles';

// ---- Test 1: Profile lookup ----
console.log('\n=== TEST 1: Profile Lookup ===');

const tests = [
  'Spider Plant (Chlorophytum comosum)',
  'Strawberry (Ostara)',
  'Mint (Mentha spicata)',
  'Snow rose (Helleborus niger)',
  'Some Unknown Plant',
];

for (const name of tests) {
  const profile = getProfile(name);
  console.log(`  "${name}" → ${profile.display_name} (key: ${profile.type_key})`);
}

// ---- Test 2: Health scoring with good readings ----
console.log('\n=== TEST 2: Good Readings (Spider Plant) ===');

const goodReadings = {
  temperature: 22,
  humidity: 55,
  soil_moisture: 45,
  light: 5000,
  electrical_conductivity: 1.0,
};

const result1 = calculateHealth(goodReadings, 'Spider Plant (Chlorophytum comosum)');
console.log(`  Health: ${result1.health_percent}% (${result1.status})`);
console.log(`  Subscores:`, result1.subscores);
console.log(`  Deviations:`, result1.deviations.length === 0 ? 'None ✅' : result1.deviations);

// ---- Test 3: Health scoring with bad readings ----
console.log('\n=== TEST 3: Bad Readings (Mint - dry soil, too hot) ===');

const badReadings = {
  temperature: 38,       // way too hot for mint
  humidity: 20,           // too dry
  soil_moisture: 10,      // severely dry
  light: 50000,           // too much
  electrical_conductivity: 3.5, // too high
};

const result2 = calculateHealth(badReadings, 'Mint (Mentha spicata)');
console.log(`  Health: ${result2.health_percent}% (${result2.status})`);
console.log(`  Subscores:`, result2.subscores);
console.log(`  Deviations:`);
for (const d of result2.deviations) {
  console.log(`    ⚠️ ${d.metric}: ${d.value} is ${d.direction} (${d.severity}) — ideal: ${d.ideal_min}..${d.ideal_max}`);
}

// ---- Test 4: Snow rose in winter (its peak season) ----
console.log('\n=== TEST 4: Snow Rose in Winter (should score well at 5°C!) ===');

const winterReadings = {
  temperature: 5,         // cold but this is perfect for snow rose in winter!
  humidity: 55,
  soil_moisture: 40,
  light: 2000,
  electrical_conductivity: 0.8,
};

const result3 = calculateHealth(winterReadings, 'Snow rose (Helleborus niger)', {
  season: 'winter',
});
console.log(`  Health: ${result3.health_percent}% (${result3.status})`);
console.log(`  Subscores:`, result3.subscores);
console.log(`  Deviations:`, result3.deviations.length === 0 ? 'None ✅' : result3.deviations);

// ---- Test 5: Same readings WITHOUT winter modifier (to see difference) ----
console.log('\n=== TEST 5: Snow Rose in Summer (same 5°C — should score worse) ===');

const result4 = calculateHealth(winterReadings, 'Snow rose (Helleborus niger)', {
  season: 'summer',
});
console.log(`  Health: ${result4.health_percent}% (${result4.status})`);
console.log(`  Subscores:`, result4.subscores);

// ---- Test 6: Trigger rules ----
console.log('\n=== TEST 6: Layer D Trigger Rules ===');

console.log(`  GOOD status, no trends     → should NOT trigger:`, result1.status !== 'GOOD' ? '❌' : '✅');
console.log(`  BAD status                  → should trigger:`, result2.status !== 'GOOD' ? '✅' : '❌');

console.log('\n✅ All tests completed!\n');
