export interface PlantDataInput {
    plantName: string;
    soilMoisture: number;
    lightLevel: number;
    temperature: number;
    humidityLevel?: number | null;
    ecValue: number;
}

export interface PlantThresholds {
    ideal_temperature_min_winter: number;
    ideal_temperature_min_summer: number;
    ideal_temperature_max_winter: number;
    ideal_temperature_max_summer: number;
    ideal_soil_moisture_min_summer: number;
    ideal_soil_moisture_min_winter: number;
    ideal_soil_moisture_max_summer: number;
    ideal_soil_moisture_max_winter: number;
    ideal_humidity_min_winter: number;
    ideal_humidity_min_summer: number;
    ideal_humidity_max_winter: number;
    ideal_humidity_max_summer: number;
    ideal_light_min_winter: number;
    ideal_light_min_summer: number;
    ideal_light_max_winter: number;
    ideal_light_max_summer: number;
    ideal_ec_min_winter: number;
    ideal_ec_min_summer: number;
    ideal_ec_max_winter: number;
    ideal_ec_max_summer: number;
}

export interface TipObject {
    message: string;
    severity: 'critical' | 'warning' | 'info';
    title?: string;
    dedupeKey?: string;
    source?: 'alert' | 'general' | 'fallback';
    /**
     * Optional: the plant this tip refers to.
     * Used to deep link from notifications into the correct PlantStats screen.
     */
    plantId?: string;
}

type SensorIssue = TipObject;

function isFiniteNumber(value: number | null | undefined): value is number {
    return typeof value === 'number' && Number.isFinite(value);
}

function isPlausiblePercentage(value: number | null | undefined): boolean {
    return isFiniteNumber(value) && value >= 0 && value <= 100;
}

function isPlausibleTemperature(value: number | null | undefined): boolean {
    return isFiniteNumber(value) && value >= -30 && value <= 60;
}

function isPlausibleLight(value: number | null | undefined): boolean {
    return isFiniteNumber(value) && value >= 0 && value <= 200000;
}

function isPlausibleEc(value: number | null | undefined): boolean {
    return isFiniteNumber(value) && value >= 0 && value <= 10;
}

function getSensorIssues(
    plantData: PlantDataInput,
    thresholds: PlantThresholds | null,
): SensorIssue[] {
    const issues: SensorIssue[] = [];
    const {
        plantName,
        soilMoisture,
        lightLevel,
        temperature,
        humidityLevel,
        ecValue,
    } = plantData;

    if (!isPlausiblePercentage(soilMoisture)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an invalid soil moisture reading (${soilMoisture}). Please recalibrate or check the sensor.`,
            severity: 'critical',
        });
    }

    if (humidityLevel != null && !isPlausiblePercentage(humidityLevel)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an invalid humidity reading (${humidityLevel}). Please recalibrate or check the sensor.`,
            severity: 'warning',
        });
    }

    if (!isPlausibleTemperature(temperature)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an implausible temperature (${temperature}°C). Please check the sensor placement.`,
            severity: 'critical',
        });
    }

    if (!isPlausibleLight(lightLevel)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an invalid light reading (${lightLevel}). Please verify the sensor.`,
            severity: 'warning',
        });
    }

    if (!isPlausibleEc(ecValue)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an invalid nutrient reading (${ecValue}). Please verify the EC sensor or units.`,
            severity: 'critical',
        });
    }

    if (!thresholds && issues.length === 0 && !isPlausiblePercentage(soilMoisture)) {
        issues.push({
            message: `Sensor issue: ${plantName} reported an invalid soil moisture reading.`,
            severity: 'critical',
        });
    }

    return issues;
}

function pickHighestPriorityIssue(issues: SensorIssue[]): SensorIssue | null {
    if (issues.length === 0) return null;
    return issues.sort((a, b) => {
        const score = (tip: SensorIssue) => (tip.severity === 'critical' ? 2 : tip.severity === 'warning' ? 1 : 0);
        return score(b) - score(a);
    })[0];
}

export const GENERAL_TIPS = [
    "Remember to check your plants for pests regularly!",
    "Dusting leaves helps plants absorb more sunlight.",
    "Most plants prefer to be watered in the morning.",
    "Yellow leaves can indicate overwatering or nutrient deficiency.",
    "Rotate your plants occasionally for even growth.",
    "Mist your tropical plants to increase humidity.",
    "Deadheading spent flowers encourages new blooms.",
];

export function getRandomGeneralTip(): TipObject {
    const randomIndex = Math.floor(Math.random() * GENERAL_TIPS.length);
    return {
        message: GENERAL_TIPS[randomIndex],
        severity: 'info'
    };
}

function isSummer(): boolean {
    const month = new Date().getMonth() + 1; // 1-12
    // Simple logic: Summer in Northern Hemisphere is roughly May (5) to September (9)
    return month >= 5 && month <= 9;
}

export function getTriggeredTip(
    plantData: PlantDataInput | null,
    thresholds: PlantThresholds | null
): TipObject | null {
    if (!plantData) return null;

    const {
        plantName,
        soilMoisture,
        lightLevel,
        temperature,
        humidityLevel,
        ecValue
    } = plantData;

    const sensorIssue = pickHighestPriorityIssue(getSensorIssues(plantData, thresholds));
    if (sensorIssue) return sensorIssue;

    // Default thresholds if none provided (fallback to previous hardcoded values)
    if (!thresholds) {
        // Fallback to generic logic
        if (soilMoisture < 30) return { message: `Your ${plantName} is dry, please water it!`, severity: 'warning' };
        if (soilMoisture > 70) return { message: `Your ${plantName} is overwatered.`, severity: 'warning' };
        return null;
    }

    const summer = isSummer();

    // 1. Moisture Logic
    const minMoisture = summer ? thresholds.ideal_soil_moisture_min_summer : thresholds.ideal_soil_moisture_min_winter;
    const maxMoisture = summer ? thresholds.ideal_soil_moisture_max_summer : thresholds.ideal_soil_moisture_max_winter;

    // Critical levels (arbitrary buffer for demo: +/- 15% from ideal)
    if (soilMoisture < minMoisture - 15) {
        return { message: `CRITICAL: Your ${plantName} is extremely dry (${soilMoisture}%)! Water immediately.`, severity: 'critical' };
    }
    if (soilMoisture < minMoisture) {
        return { message: `Your ${plantName} is too dry (${soilMoisture}%). Target: >${minMoisture}%.`, severity: 'warning' };
    }
    if (soilMoisture > maxMoisture + 15) {
        return { message: `CRITICAL: Your ${plantName} is drowning (${soilMoisture}%)! Check drainage.`, severity: 'critical' };
    }
    if (soilMoisture > maxMoisture) {
        return { message: `Your ${plantName} is too wet (${soilMoisture}%). Target: <${maxMoisture}%.`, severity: 'warning' };
    }

    // 2. Humidity Logic
    const minHumidity = summer ? thresholds.ideal_humidity_min_summer : thresholds.ideal_humidity_min_winter;
    const maxHumidity = summer ? thresholds.ideal_humidity_max_summer : thresholds.ideal_humidity_max_winter;

    if (humidityLevel != null) {
        if (humidityLevel < minHumidity - 15) {
            return { message: `CRITICAL: The air around ${plantName} is far too dry (${humidityLevel}%). Raise humidity soon.`, severity: 'critical' };
        }
        if (humidityLevel < minHumidity) {
            return { message: `The air around ${plantName} is too dry (${humidityLevel}%). Target: >${minHumidity}%.`, severity: 'warning' };
        }
        if (humidityLevel > maxHumidity + 15) {
            return { message: `CRITICAL: The air around ${plantName} is excessively humid (${humidityLevel}%). Improve airflow.`, severity: 'critical' };
        }
        if (humidityLevel > maxHumidity) {
            return { message: `The air around ${plantName} is too humid (${humidityLevel}%). Target: <${maxHumidity}%.`, severity: 'warning' };
        }
    }

    // 3. Light Logic
    const minLight = summer ? thresholds.ideal_light_min_summer : thresholds.ideal_light_min_winter;
    const maxLight = summer ? thresholds.ideal_light_max_summer : thresholds.ideal_light_max_winter;

    if (lightLevel < minLight) {
        return { message: `Your ${plantName} needs more light. Current: ${lightLevel}, Target: >${minLight}.`, severity: 'warning' };
    }
    if (lightLevel > maxLight) {
        return { message: `Your ${plantName} has too much light. Current: ${lightLevel}, Target: <${maxLight}.`, severity: 'warning' };
    }

    // 4. Temperature Logic
    const minTemp = summer ? thresholds.ideal_temperature_min_summer : thresholds.ideal_temperature_min_winter;
    const maxTemp = summer ? thresholds.ideal_temperature_max_summer : thresholds.ideal_temperature_max_winter;

    if (temperature < minTemp - 5) {
        return { message: `FREEZING WARNING: Your ${plantName} is very cold (${temperature}°C)!`, severity: 'critical' };
    }
    if (temperature < minTemp) {
        return { message: `Your ${plantName} is too cold (${temperature}°C). Keep it above ${minTemp}°C.`, severity: 'warning' };
    }
    if (temperature > maxTemp + 5) {
        return { message: `HEAT WARNING: Your ${plantName} is burning up (${temperature}°C)!`, severity: 'critical' };
    }
    if (temperature > maxTemp) {
        return { message: `Your ${plantName} is too hot (${temperature}°C). Keep it below ${maxTemp}°C.`, severity: 'warning' };
    }

    // 5. EC Logic
    const minEc = summer ? thresholds.ideal_ec_min_summer : thresholds.ideal_ec_min_winter;
    const maxEc = summer ? thresholds.ideal_ec_max_summer : thresholds.ideal_ec_max_winter;

    if (ecValue < minEc) {
        return { message: `Your ${plantName} nutrient levels are low.`, severity: 'warning' };
    }
    if (ecValue > maxEc) {
        return { message: `Your ${plantName} nutrient levels are too high! Flush the soil.`, severity: 'warning' };
    }

    return null;
}
