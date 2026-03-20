// ============================================================
// Test Suite — calculateHealth (Deterministic Health Scoring)
// ============================================================
// Covers: sensor scoring, weighted aggregation, deviations,
//         trend analysis, edge cases (null sensors, extremes).
// ============================================================

import {
  calculateHealth,
  calculateHealthLegacy,
  ecTrend,
  moistureVariance,
} from '../scoring/calculateHealth';
import { DEFAULT_PROFILE, getProfile, PLANT_PROFILES } from '../config/plantProfiles';
import type { PlantProfile, SensorRange, HealthResult } from '../types/mentor.types';

// ---- Helpers ---------------------------------------------------------------

/** Build a full readings object with ideal-range values for the default profile. */
function idealReadings(): Record<string, number> {
  return {
    temperature: 22,
    humidity: 55,
    soil_moisture: 45,
    light: 5000,
    electrical_conductivity: 1.5,
  };
}

/** Create time-series data points for EC trend testing. */
function buildECHistory(
  values: number[],
  startDaysAgo: number = 14,
): Array<{ electrical_conductivity: number; created_at: string }> {
  const now = Date.now();
  return values.map((v, i) => ({
    electrical_conductivity: v,
    created_at: new Date(now - (startDaysAgo - i) * 86_400_000).toISOString(),
  }));
}

/** Create time-series data points for moisture variance testing. */
function buildMoistureHistory(
  values: number[],
  startDaysAgo: number = 7,
): Array<{ soil_moisture: number; created_at: string }> {
  const now = Date.now();
  return values.map((v, i) => ({
    soil_moisture: v,
    created_at: new Date(now - (startDaysAgo - i) * 86_400_000).toISOString(),
  }));
}

// ============================================================
// 1. scoreSensor — via calculateHealth subscores
// ============================================================

describe('calculateHealth — Sensor Scoring', () => {
  it('should return 100 for all sensors when readings are in ideal range', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBe(100);
    expect(result.status).toBe('GOOD');
    expect(result.deviations).toHaveLength(0);
    Object.values(result.subscores).forEach((score) => {
      expect(score).toBe(100);
    });
  });

  it('should return 0% subscore when sensor is at absolute min', () => {
    // Arrange — temperature at min boundary (10°C for default profile)
    const readings = { ...idealReadings(), temperature: 10 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.temperature).toBe(0);
    expect(result.deviations).toContainEqual(
      expect.objectContaining({ metric: 'temperature', direction: 'low' }),
    );
  });

  it('should return 0% subscore when sensor is at absolute max', () => {
    // Arrange — temperature at max boundary (38°C for default profile)
    const readings = { ...idealReadings(), temperature: 38 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.temperature).toBe(0);
    expect(result.deviations).toContainEqual(
      expect.objectContaining({ metric: 'temperature', direction: 'high' }),
    );
  });

  it('should return 0% subscore when sensor far exceeds max', () => {
    // Arrange — temperature way beyond max
    const readings = { ...idealReadings(), temperature: 60 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.temperature).toBe(0);
  });

  it('should interpolate linearly between min and ideal_min', () => {
    // Arrange — temperature halfway between min(10) and ideal_min(18) = 14
    const readings = { ...idealReadings(), temperature: 14 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert — should be ~50% for temperature
    expect(result.subscores.temperature).toBe(50);
  });
});

// ============================================================
// 2. Weighted Aggregation & Status
// ============================================================

describe('calculateHealth — Weighted Aggregation', () => {
  it('should classify health >= 70 as GOOD', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBeGreaterThanOrEqual(70);
    expect(result.status).toBe('GOOD');
  });

  it('should classify health 40-69 as WARNING', () => {
    // Arrange — multiple sensors slightly out of range
    const readings = {
      temperature: 14,  // subscore ~50
      humidity: 30,      // subscore ~50
      soil_moisture: 20, // subscore ~50
      light: 600,        // subscore ~50
      electrical_conductivity: 0.5, // subscore ~50
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBeGreaterThanOrEqual(40);
    expect(result.health_percent).toBeLessThan(70);
    expect(result.status).toBe('WARNING');
  });

  it('should classify health < 40 as BAD', () => {
    // Arrange — all sensors at their absolute min/max
    const readings = {
      temperature: 10,
      humidity: 20,
      soil_moisture: 10,
      light: 200,
      electrical_conductivity: 0.2,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBeLessThan(40);
    expect(result.status).toBe('BAD');
  });

  it('should return 0 health when no sensors have data (all null)', () => {
    // Arrange
    const readings: Record<string, null> = {
      temperature: null,
      humidity: null,
      soil_moisture: null,
      light: null,
      electrical_conductivity: null,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBe(0);
    expect(result.subscores).toEqual({});
  });
});

// ============================================================
// 3. Sensor Disconnection — null / undefined values
// ============================================================

describe('calculateHealth — Sensor Disconnection (null values)', () => {
  it('should gracefully skip null sensor and still score remaining', () => {
    // Arrange — soil moisture sensor disconnected
    const readings = {
      ...idealReadings(),
      soil_moisture: null as any,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.soil_moisture).toBeUndefined();
    expect(result.health_percent).toBe(100); // remaining all ideal
    expect(result.deviations.some(d => d.metric === 'soil_moisture')).toBe(false);
  });

  it('should gracefully skip undefined sensor', () => {
    // Arrange
    const readings = {
      ...idealReadings(),
      electrical_conductivity: undefined as any,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.electrical_conductivity).toBeUndefined();
    expect(result.health_percent).toBe(100);
  });

  it('should handle all sensors being null/undefined without crashing', () => {
    // Arrange
    const readings: Record<string, null | undefined> = {
      temperature: null,
      humidity: undefined,
      soil_moisture: null,
      light: undefined,
      electrical_conductivity: null,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.health_percent).toBe(0);
    expect(result.status).toBe('BAD'); // healthPercent < 40
    expect(result.deviations).toHaveLength(0);
    expect(Object.keys(result.subscores)).toHaveLength(0);
  });

  it('should handle partial sensor data (only temperature available)', () => {
    // Arrange — only one sensor reporting
    const readings: Record<string, number | null> = {
      temperature: 22,
      humidity: null,
      soil_moisture: null,
      light: null,
      electrical_conductivity: null,
    };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.subscores.temperature).toBe(100);
    expect(result.health_percent).toBe(100); // only temp scored, and it's ideal
  });
});

// ============================================================
// 4. Deviations
// ============================================================

describe('calculateHealth — Deviations', () => {
  it('should tag severe deviation for subscore < 30', () => {
    // Arrange — temperature near absolute min
    const readings = { ...idealReadings(), temperature: 11 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    const tempDev = result.deviations.find(d => d.metric === 'temperature');
    expect(tempDev).toBeDefined();
    expect(tempDev!.severity).toBe('severe');
    expect(tempDev!.direction).toBe('low');
  });

  it('should tag moderate deviation for subscore 30-59', () => {
    // Arrange — temperature at 13: subscore = (13-10)/(18-10)*100 = 37.5
    const readings = { ...idealReadings(), temperature: 13 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    const tempDev = result.deviations.find(d => d.metric === 'temperature');
    expect(tempDev).toBeDefined();
    expect(tempDev!.severity).toBe('moderate');
  });

  it('should tag mild deviation for subscore 60-99', () => {
    // Arrange — temperature at 16: subscore = (16-10)/(18-10)*100 = 75
    const readings = { ...idealReadings(), temperature: 16 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    const tempDev = result.deviations.find(d => d.metric === 'temperature');
    expect(tempDev).toBeDefined();
    expect(tempDev!.severity).toBe('mild');
  });

  it('should include ideal_min and ideal_max in deviation', () => {
    // Arrange
    const readings = { ...idealReadings(), temperature: 12 };

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    const tempDev = result.deviations.find(d => d.metric === 'temperature');
    expect(tempDev).toBeDefined();
    expect(tempDev!.ideal_min).toBe(18);
    expect(tempDev!.ideal_max).toBe(28);
    expect(tempDev!.value).toBe(12);
  });
});

// ============================================================
// 5. Plant Profiles & Profile Resolution
// ============================================================

describe('calculateHealth — Plant Profile Resolution', () => {
  it('should use default profile when null/undefined key is passed', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealth(readings, null);

    // Assert — should match default behavior
    expect(result.health_percent).toBe(100);
  });

  it('should use default profile for unknown plant name', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealth(readings, 'aliens-weed');

    // Assert
    expect(result.health_percent).toBe(100); // ideal for default profile
  });

  it('should resolve spider plant profile by exact key', () => {
    // Arrange
    const profile = getProfile('spider plant');

    // Assert
    expect(profile.type_key).toBe('spider plant');
    expect(profile.display_name).toContain('Spider Plant');
  });

  it('should resolve profile by partial match (common_name includes key)', () => {
    // Arrange — DB returns "Spider Plant (Chlorophytum comosum)"
    const profile = getProfile('Spider Plant (Chlorophytum comosum)');

    // Assert
    expect(profile.type_key).toBe('spider plant');
  });

  it('should fallback to default for empty string', () => {
    // Arrange & Act
    const profile = getProfile('');

    // Assert
    expect(profile.type_key).toBe('_default');
  });

  it('should produce different health scores for different plant profiles with same readings', () => {
    // Arrange — readings that are ideal for default but not for strawberry (light too low)
    const readings = idealReadings(); // light: 5000

    // Act
    const defaultResult = calculateHealth(readings, DEFAULT_PROFILE);
    const strawberryResult = calculateHealth(readings, PLANT_PROFILES['strawberry']);

    // Assert — strawberry needs 6000+ lux ideal, so 5000 is below ideal
    expect(defaultResult.subscores.light).toBe(100);
    expect(strawberryResult.subscores.light).toBeLessThan(100);
  });
});

// ============================================================
// 6. Stage & Season Modifiers
// ============================================================

describe('calculateHealth — Stage & Season Modifiers', () => {
  it('should apply seedling stage modifier weight scaling', () => {
    // Arrange — seedling modifier increases weight_scale to 1.3
    const readings = { ...idealReadings(), temperature: 14 }; // slightly low

    // Act
    const resultNoStage = calculateHealth(readings, DEFAULT_PROFILE);
    const resultSeedling = calculateHealth(readings, DEFAULT_PROFILE, { growthStage: 'seedling' });

    // Assert — seedling penalty should be different due to weight scaling
    // AND possibly range override (seedling ideal_min: 20, ideal_max: 25)
    expect(resultSeedling.health_percent).not.toBe(resultNoStage.health_percent);
  });

  it('should apply winter season modifier range overrides', () => {
    // Arrange — default winter override: ideal_min: 15, ideal_max: 22
    const readings = { ...idealReadings(), temperature: 25 };

    // Act
    const resultNoSeason = calculateHealth(readings, DEFAULT_PROFILE);
    const resultWinter = calculateHealth(readings, DEFAULT_PROFILE, { season: 'winter' });

    // Assert — 25°C is fine normally but above ideal in winter (22 max)
    expect(resultNoSeason.subscores.temperature).toBe(100);
    expect(resultWinter.subscores.temperature).toBeLessThan(100);
  });

  it('should apply snow rose summer modifier', () => {
    // Arrange
    const profile = PLANT_PROFILES['snow rose'];
    const readings = { ...idealReadings(), temperature: 20 };

    // Act
    const resultSummer = calculateHealth(readings, profile, { season: 'summer' });

    // Assert — summer range is ideal_min:12, ideal_max:24 → 20 is within range
    expect(resultSummer.subscores.temperature).toBe(100);
  });
});

// ============================================================
// 7. EC Trend Analysis
// ============================================================

describe('ecTrend — Electrical Conductivity Trend', () => {
  it('should return "rising" for increasing EC values', () => {
    // Arrange
    const history = buildECHistory([0.5, 0.6, 0.7, 0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5]);

    // Act
    const trend = ecTrend(history, 14);

    // Assert
    expect(trend).toBe('rising');
  });

  it('should return "falling" for decreasing EC values', () => {
    // Arrange
    const history = buildECHistory([2.5, 2.3, 2.0, 1.8, 1.5, 1.2, 1.0, 0.8, 0.6, 0.5]);

    // Act
    const trend = ecTrend(history, 14);

    // Assert
    expect(trend).toBe('falling');
  });

  it('should return "stable" for constant EC values', () => {
    // Arrange
    const history = buildECHistory([1.5, 1.5, 1.5, 1.5, 1.5]);

    // Act
    const trend = ecTrend(history, 14);

    // Assert
    expect(trend).toBe('stable');
  });

  it('should return undefined when fewer than 3 data points', () => {
    // Arrange
    const history = buildECHistory([1.5, 1.6]);

    // Act
    const trend = ecTrend(history, 14);

    // Assert
    expect(trend).toBeUndefined();
  });

  it('should handle null EC values by filtering them out', () => {
    // Arrange
    const history = [
      { electrical_conductivity: null, created_at: new Date().toISOString() },
      { electrical_conductivity: null, created_at: new Date().toISOString() },
      { electrical_conductivity: 1.5, created_at: new Date().toISOString() },
    ];

    // Act
    const trend = ecTrend(history, 14);

    // Assert — only 1 valid point, should return undefined
    expect(trend).toBeUndefined();
  });

  it('should ignore data older than the specified window', () => {
    // Arrange — all data is 30 days old
    const history = buildECHistory([1.0, 1.5, 2.0, 2.5, 3.0], 30);

    // Act
    const trend = ecTrend(history, 7);

    // Assert — none within 7 day window
    expect(trend).toBeUndefined();
  });
});

// ============================================================
// 8. Moisture Variance
// ============================================================

describe('moistureVariance — Soil Moisture Variance', () => {
  it('should return "low" for stable moisture readings (stddev < 5)', () => {
    // Arrange
    const history = buildMoistureHistory([50, 51, 49, 50, 52]);

    // Act
    const variance = moistureVariance(history, 7);

    // Assert
    expect(variance).toBe('low');
  });

  it('should return "med" for moderate variance (stddev 5-15)', () => {
    // Arrange
    const history = buildMoistureHistory([30, 45, 35, 50, 40, 55, 38]);

    // Act
    const variance = moistureVariance(history, 7);

    // Assert
    expect(variance).toBe('med');
  });

  it('should return "high" for wild fluctuations (stddev >= 15)', () => {
    // Arrange
    const history = buildMoistureHistory([10, 80, 15, 75, 20, 85, 10]);

    // Act
    const variance = moistureVariance(history, 7);

    // Assert
    expect(variance).toBe('high');
  });

  it('should return undefined when fewer than 3 data points', () => {
    // Arrange
    const history = buildMoistureHistory([50, 55]);

    // Act
    const variance = moistureVariance(history, 7);

    // Assert
    expect(variance).toBeUndefined();
  });
});

// ============================================================
// 9. Legacy Wrapper
// ============================================================

describe('calculateHealthLegacy — Backward Compatibility', () => {
  it('should return a plain number (health_percent)', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealthLegacy(readings);

    // Assert
    expect(typeof result).toBe('number');
    expect(result).toBe(100);
  });

  it('should return 0 for null input', () => {
    // Arrange & Act
    const result = calculateHealthLegacy(null);

    // Assert
    expect(result).toBe(0);
  });

  it('should return 0 for undefined input', () => {
    // Arrange & Act
    const result = calculateHealthLegacy(undefined);

    // Assert
    expect(result).toBe(0);
  });
});

// ============================================================
// 10. Health with Trends (integrated)
// ============================================================

describe('calculateHealth — Integrated with Trends', () => {
  it('should populate trends when history is provided', () => {
    // Arrange
    const readings = idealReadings();
    const history = [
      ...buildECHistory([1.0, 1.0, 1.0, 1.0, 1.0]),
      ...buildMoistureHistory([50, 50, 50, 50, 50]).map(h => ({
        ...h,
        electrical_conductivity: 1.0,
      })),
    ];

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE, { history });

    // Assert
    expect(result.trends).toBeDefined();
    expect(result.trends.ec_14d).toBeDefined();
    expect(result.trends.moisture_var_7d).toBeDefined();
  });

  it('should return empty trends when no history is provided', () => {
    // Arrange
    const readings = idealReadings();

    // Act
    const result = calculateHealth(readings, DEFAULT_PROFILE);

    // Assert
    expect(result.trends).toEqual({});
  });
});
