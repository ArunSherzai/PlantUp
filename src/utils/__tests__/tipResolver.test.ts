// ============================================================
// Test Suite — IoT Sensor Tip Resolver
// ============================================================
// Covers: threshold-based tip triggering, season awareness,
//         severity levels, null sensor handling, fallback logic.
// ============================================================

import {
  getTriggeredTip,
  getRandomGeneralTip,
  GENERAL_TIPS,
  PlantDataInput,
  PlantThresholds,
} from '../tipResolver';

// ---- Test Fixtures ---------------------------------------------------------

/** Summer thresholds (typical indoor plant). */
const SUMMER_THRESHOLDS: PlantThresholds = {
  ideal_temperature_min_winter: 15,
  ideal_temperature_min_summer: 18,
  ideal_temperature_max_winter: 22,
  ideal_temperature_max_summer: 28,
  ideal_soil_moisture_min_summer: 30,
  ideal_soil_moisture_min_winter: 25,
  ideal_soil_moisture_max_summer: 65,
  ideal_soil_moisture_max_winter: 55,
  ideal_light_min_winter: 500,
  ideal_light_min_summer: 1000,
  ideal_light_max_winter: 10000,
  ideal_light_max_summer: 15000,
  ideal_ec_min_winter: 0.5,
  ideal_ec_min_summer: 0.8,
  ideal_ec_max_winter: 2.0,
  ideal_ec_max_summer: 2.5,
};

/** Plant data with all values in ideal summer range. */
function idealPlantData(overrides?: Partial<PlantDataInput>): PlantDataInput {
  return {
    plantName: 'My Basil',
    soilMoisture: 45,
    lightLevel: 5000,
    temperature: 22,
    ecValue: 1.5,
    ...overrides,
  };
}

// We need to control the season for deterministic tests
// The isSummer() function checks if month is 5-9
// We mock Date to control the season

const REAL_DATE = Date;

function mockSummer() {
  const mockDate = new REAL_DATE('2026-06-15T12:00:00Z'); // June = summer
  jest.spyOn(global, 'Date').mockImplementation(
    (...args: any[]) => args.length ? new REAL_DATE(...args as [any]) : mockDate,
  );
  (global.Date as any).now = REAL_DATE.now;
}

function mockWinter() {
  const mockDate = new REAL_DATE('2026-01-15T12:00:00Z'); // January = winter
  jest.spyOn(global, 'Date').mockImplementation(
    (...args: any[]) => args.length ? new REAL_DATE(...args as [any]) : mockDate,
  );
  (global.Date as any).now = REAL_DATE.now;
}

afterEach(() => {
  jest.restoreAllMocks();
});

// ============================================================
// 1. Happy Path — No Tips
// ============================================================

describe('getTriggeredTip — No Issues', () => {
  it('should return null when all values are within ideal range', () => {
    // Arrange
    mockSummer();
    const data = idealPlantData();

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).toBeNull();
  });

  it('should return null when plantData is null', () => {
    // Arrange & Act
    const tip = getTriggeredTip(null, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).toBeNull();
  });
});

// ============================================================
// 2. Soil Moisture Tips
// ============================================================

describe('getTriggeredTip — Soil Moisture', () => {
  beforeEach(() => mockSummer());

  it('should return CRITICAL warning when soil moisture is extremely low', () => {
    // Arrange — min_summer=30, critical threshold = 30-15 = 15
    const data = idealPlantData({ soilMoisture: 10 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('CRITICAL');
    expect(tip!.message).toContain('My Basil');
  });

  it('should return warning when soil moisture is below ideal', () => {
    // Arrange — between critical (15) and min (30)
    const data = idealPlantData({ soilMoisture: 25 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too dry');
  });

  it('should return CRITICAL warning when soil moisture is extremely high', () => {
    // Arrange — max_summer=65, critical = 65+15 = 80
    const data = idealPlantData({ soilMoisture: 85 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('drowning');
  });

  it('should return warning when soil moisture is above ideal', () => {
    // Arrange — between max (65) and critical (80)
    const data = idealPlantData({ soilMoisture: 70 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too wet');
  });
});

// ============================================================
// 3. Temperature Tips
// ============================================================

describe('getTriggeredTip — Temperature', () => {
  beforeEach(() => mockSummer());

  it('should return FREEZING warning for extremely cold temperature', () => {
    // Arrange — min_summer=18, critical = 18-5 = 13
    const data = idealPlantData({ temperature: 10 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('FREEZING');
  });

  it('should return warning for slightly cold temperature', () => {
    // Arrange — between critical (13) and ideal_min (18)
    const data = idealPlantData({ temperature: 15 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too cold');
  });

  it('should return HEAT warning for extremely hot temperature', () => {
    // Arrange — max_summer=28, critical = 28+5 = 33
    const data = idealPlantData({ temperature: 38 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('HEAT');
  });

  it('should return warning for slightly hot temperature', () => {
    // Arrange
    const data = idealPlantData({ temperature: 30 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too hot');
  });
});

// ============================================================
// 4. Light Level Tips
// ============================================================

describe('getTriggeredTip — Light Level', () => {
  beforeEach(() => mockSummer());

  it('should return warning for low light', () => {
    // Arrange — min_summer=1000
    const data = idealPlantData({ lightLevel: 500 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('more light');
  });

  it('should return warning for excessive light', () => {
    // Arrange — max_summer=15000
    const data = idealPlantData({ lightLevel: 20000 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too much light');
  });
});

// ============================================================
// 5. EC (Electrical Conductivity) Tips
// ============================================================

describe('getTriggeredTip — EC Value', () => {
  beforeEach(() => mockSummer());

  it('should return warning for low nutrient levels', () => {
    // Arrange — min_summer=0.8
    const data = idealPlantData({ ecValue: 0.3 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('nutrient levels are low');
  });

  it('should return warning for high nutrient levels', () => {
    // Arrange — max_summer=2.5
    const data = idealPlantData({ ecValue: 3.5 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too high');
  });
});

// ============================================================
// 6. Season Awareness
// ============================================================

describe('getTriggeredTip — Season Switching', () => {
  it('should use summer thresholds in summer months', () => {
    // Arrange
    mockSummer();
    // Summer ideal_temp_min = 18, so 17 should trigger
    const data = idealPlantData({ temperature: 17 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.message).toContain('too cold');
  });

  it('should use winter thresholds in winter months', () => {
    // Arrange
    mockWinter();
    // Winter ideal_temp_min = 15, so 17 is within range (no tip)
    const data = idealPlantData({ temperature: 17 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert — 17°C is fine in winter (min is 15)
    expect(tip).toBeNull();
  });

  it('should trigger warning at 13°C in winter (below winter min 15)', () => {
    // Arrange
    mockWinter();
    const data = idealPlantData({ temperature: 13 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.message).toContain('too cold');
  });
});

// ============================================================
// 7. Fallback — No thresholds
// ============================================================

describe('getTriggeredTip — No Thresholds (Fallback)', () => {
  it('should use generic fallback when thresholds are null', () => {
    // Arrange
    const data = idealPlantData({ soilMoisture: 20 });

    // Act
    const tip = getTriggeredTip(data, null);

    // Assert — fallback logic: soilMoisture < 30 → warning
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('dry');
  });

  it('should return overwatered tip when moisture > 70 without thresholds', () => {
    // Arrange
    const data = idealPlantData({ soilMoisture: 75 });

    // Act
    const tip = getTriggeredTip(data, null);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('overwatered');
  });

  it('should return null when moisture is in safe range without thresholds', () => {
    // Arrange
    const data = idealPlantData({ soilMoisture: 50 });

    // Act
    const tip = getTriggeredTip(data, null);

    // Assert
    expect(tip).toBeNull();
  });
});

// ============================================================
// 8. Priority — First match wins
// ============================================================

describe('getTriggeredTip — Priority Order', () => {
  beforeEach(() => mockSummer());

  it('should prioritize soil moisture over light when both are bad', () => {
    // Arrange — both moisture AND light are out of range
    const data = idealPlantData({
      soilMoisture: 10,  // critically dry
      lightLevel: 500,   // too low
    });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert — moisture is checked first, so should be moisture tip
    expect(tip).not.toBeNull();
    expect(tip!.message).toContain('dry');
  });

  it('should include plant name in tip message', () => {
    // Arrange
    const data = idealPlantData({ plantName: 'Sir Basil III', soilMoisture: 10 });

    // Act
    const tip = getTriggeredTip(data, SUMMER_THRESHOLDS);

    // Assert
    expect(tip).not.toBeNull();
    expect(tip!.message).toContain('Sir Basil III');
  });
});

// ============================================================
// 9. General Tips
// ============================================================

describe('getRandomGeneralTip', () => {
  it('should return a TipObject with severity "info"', () => {
    // Arrange & Act
    const tip = getRandomGeneralTip();

    // Assert
    expect(tip).toBeDefined();
    expect(tip.severity).toBe('info');
    expect(typeof tip.message).toBe('string');
    expect(tip.message.length).toBeGreaterThan(0);
  });

  it('should always return a message from the GENERAL_TIPS array', () => {
    // Arrange & Act — call multiple times
    for (let i = 0; i < 20; i++) {
      const tip = getRandomGeneralTip();

      // Assert
      expect(GENERAL_TIPS).toContain(tip.message);
    }
  });
});
