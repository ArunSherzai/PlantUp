export interface PlantDataInput {
    plantName: string;
    soilMoisture: number;
    lightLevel: number;
    temperature: number;
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
    /**
     * Optional: the plant this tip refers to.
     * Used to deep link from notifications into the correct PlantStats screen.
     */
    plantId?: string;
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
        ecValue
    } = plantData;

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

    // 2. Light Logic
    const minLight = summer ? thresholds.ideal_light_min_summer : thresholds.ideal_light_min_winter;
    const maxLight = summer ? thresholds.ideal_light_max_summer : thresholds.ideal_light_max_winter;

    if (lightLevel < minLight) {
        return { message: `Your ${plantName} needs more light. Current: ${lightLevel}, Target: >${minLight}.`, severity: 'warning' };
    }
    if (lightLevel > maxLight) {
        return { message: `Your ${plantName} has too much light. Current: ${lightLevel}, Target: <${maxLight}.`, severity: 'warning' };
    }

    // 3. Temperature Logic
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

    // 4. EC Logic
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
