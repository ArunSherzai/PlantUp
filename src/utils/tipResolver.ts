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

export const GENERAL_TIPS = [
    "Remember to check your plants for pests regularly!",
    "Dusting leaves helps plants absorb more sunlight.",
    "Most plants prefer to be watered in the morning.",
    "Yellow leaves can indicate overwatering or nutrient deficiency.",
    "Rotate your plants occasionally for even growth.",
    "Mist your tropical plants to increase humidity.",
    "Deadheading spent flowers encourages new blooms.",
];

export function getRandomGeneralTip(): string {
    const randomIndex = Math.floor(Math.random() * GENERAL_TIPS.length);
    return GENERAL_TIPS[randomIndex];
}

function isSummer(): boolean {
    const month = new Date().getMonth() + 1; // 1-12
    // Simple logic: Summer in Northern Hemisphere is roughly May (5) to September (9)
    return month >= 5 && month <= 9;
}

export function getTriggeredTip(
    plantData: PlantDataInput | null,
    thresholds: PlantThresholds | null
): string | null {
    if (!plantData) return null;

    const {
        plantName,
        soilMoisture,
        lightLevel,
        temperature,
        ecValue
    } = plantData;

    // Default thresholds if none provided (fallback to previous hardcoded values)
    // or return null if we strictly require thresholds.
    // Let's use safe defaults or fallback to the hardcoded logic if thresholds are missing.
    if (!thresholds) {
        // Fallback to generic logic
        if (soilMoisture < 30) return `Your ${plantName} is dry, please water it!`;
        if (soilMoisture > 70) return `Your ${plantName} is overwatered.`;
        return null;
    }

    const summer = isSummer();

    // 1. Moisture Logic
    const minMoisture = summer ? thresholds.ideal_soil_moisture_min_summer : thresholds.ideal_soil_moisture_min_winter;
    const maxMoisture = summer ? thresholds.ideal_soil_moisture_max_summer : thresholds.ideal_soil_moisture_max_winter;

    if (soilMoisture < minMoisture) {
        return `Your ${plantName} is too dry (${soilMoisture}%). Target: >${minMoisture}%.`;
    }
    if (soilMoisture > maxMoisture) {
        return `Your ${plantName} is too wet (${soilMoisture}%). Target: <${maxMoisture}%.`;
    }

    // 2. Light Logic
    const minLight = summer ? thresholds.ideal_light_min_summer : thresholds.ideal_light_min_winter;
    const maxLight = summer ? thresholds.ideal_light_max_summer : thresholds.ideal_light_max_winter;

    if (lightLevel < minLight) {
        return `Your ${plantName} needs more light. Current: ${lightLevel}, Target: >${minLight}.`;
    }
    if (lightLevel > maxLight) {
        return `Your ${plantName} has too much light. Current: ${lightLevel}, Target: <${maxLight}.`;
    }

    // 3. Temperature Logic
    const minTemp = summer ? thresholds.ideal_temperature_min_summer : thresholds.ideal_temperature_min_winter;
    const maxTemp = summer ? thresholds.ideal_temperature_max_summer : thresholds.ideal_temperature_max_winter;

    if (temperature < minTemp) {
        return `Your ${plantName} is too cold (${temperature}°C). Keep it above ${minTemp}°C.`;
    }
    if (temperature > maxTemp) {
        return `Your ${plantName} is too hot (${temperature}°C). Keep it below ${maxTemp}°C.`;
    }

    // 4. EC Logic
    const minEc = summer ? thresholds.ideal_ec_min_summer : thresholds.ideal_ec_min_winter;
    const maxEc = summer ? thresholds.ideal_ec_max_summer : thresholds.ideal_ec_max_winter;

    if (ecValue < minEc) {
        return `Your ${plantName} nutrient levels are low.`;
    }
    if (ecValue > maxEc) {
        return `Your ${plantName} nutrient levels are too high! Flush the soil.`;
    }

    return null;
}
