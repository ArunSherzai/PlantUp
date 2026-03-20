import {
  getTriggeredTip,
  getRandomGeneralTip,
  GENERAL_TIPS,
  PlantDataInput,
  PlantThresholds,
} from '../tipResolver';

const THRESHOLDS: PlantThresholds = {
  ideal_temperature_min_winter: 15,
  ideal_temperature_min_summer: 18,
  ideal_temperature_max_winter: 22,
  ideal_temperature_max_summer: 28,
  ideal_soil_moisture_min_summer: 30,
  ideal_soil_moisture_min_winter: 25,
  ideal_soil_moisture_max_summer: 65,
  ideal_soil_moisture_max_winter: 55,
  ideal_humidity_min_winter: 35,
  ideal_humidity_min_summer: 40,
  ideal_humidity_max_winter: 65,
  ideal_humidity_max_summer: 70,
  ideal_light_min_winter: 500,
  ideal_light_min_summer: 1000,
  ideal_light_max_winter: 10000,
  ideal_light_max_summer: 15000,
  ideal_ec_min_winter: 0.5,
  ideal_ec_min_summer: 0.8,
  ideal_ec_max_winter: 2.0,
  ideal_ec_max_summer: 2.5,
};

function buildPlantData(overrides?: Partial<PlantDataInput>): PlantDataInput {
  return {
    plantName: 'My Basil',
    soilMoisture: 45,
    lightLevel: 5000,
    temperature: 22,
    humidityLevel: 50,
    ecValue: 1.5,
    ...overrides,
  };
}

const REAL_DATE = Date;

function mockSummer() {
  const mockDate = new REAL_DATE('2026-06-15T12:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(
    (...args: any[]) => (args.length ? new REAL_DATE(...(args as [any])) : mockDate),
  );
  (global.Date as any).now = REAL_DATE.now;
}

function mockWinter() {
  const mockDate = new REAL_DATE('2026-01-15T12:00:00Z');
  jest.spyOn(global, 'Date').mockImplementation(
    (...args: any[]) => (args.length ? new REAL_DATE(...(args as [any])) : mockDate),
  );
  (global.Date as any).now = REAL_DATE.now;
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('getTriggeredTip', () => {
  it('returns null when all values are in range', () => {
    mockSummer();
    expect(getTriggeredTip(buildPlantData(), THRESHOLDS)).toBeNull();
  });

  it('returns a critical dry warning for very low soil moisture', () => {
    mockSummer();
    const tip = getTriggeredTip(buildPlantData({ soilMoisture: 10 }), THRESHOLDS);
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('CRITICAL');
  });

  it('returns a humidity warning when air is too dry', () => {
    mockSummer();
    const tip = getTriggeredTip(buildPlantData({ humidityLevel: 35 }), THRESHOLDS);
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('warning');
    expect(tip!.message).toContain('too dry');
  });

  it('returns a critical humidity warning when air is extremely humid', () => {
    mockSummer();
    const tip = getTriggeredTip(buildPlantData({ humidityLevel: 90 }), THRESHOLDS);
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('excessively humid');
  });

  it('uses winter thresholds in winter months', () => {
    mockWinter();
    expect(getTriggeredTip(buildPlantData({ temperature: 17 }), THRESHOLDS)).toBeNull();
    const coldTip = getTriggeredTip(buildPlantData({ temperature: 13 }), THRESHOLDS);
    expect(coldTip).not.toBeNull();
    expect(coldTip!.message).toContain('too cold');
  });

  it('falls back to generic moisture logic without thresholds', () => {
    const dryTip = getTriggeredTip(buildPlantData({ soilMoisture: 20 }), null);
    expect(dryTip).not.toBeNull();
    expect(dryTip!.message).toContain('dry');
  });

  it('prioritizes sensor sanity issues over plant care advice', () => {
    mockSummer();
    const tip = getTriggeredTip(buildPlantData({ soilMoisture: 1600, lightLevel: 200 }), THRESHOLDS);
    expect(tip).not.toBeNull();
    expect(tip!.severity).toBe('critical');
    expect(tip!.message).toContain('Sensor issue');
  });

  it('treats implausible EC as a sensor issue', () => {
    mockSummer();
    const tip = getTriggeredTip(buildPlantData({ ecValue: 5000 }), THRESHOLDS);
    expect(tip).not.toBeNull();
    expect(tip!.message).toContain('invalid nutrient reading');
  });
});

describe('getRandomGeneralTip', () => {
  it('returns an info tip from the general tips list', () => {
    const tip = getRandomGeneralTip();
    expect(tip.severity).toBe('info');
    expect(GENERAL_TIPS).toContain(tip.message);
  });
});
