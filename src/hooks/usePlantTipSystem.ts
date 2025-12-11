import { useEffect, useCallback } from 'react';
import { db } from '../utils/supabase';
import { getTriggeredTip, getRandomGeneralTip, PlantDataInput, TipObject } from '../utils/tipResolver';
import { saveTip } from '../utils/tipHistory';
import { useTipStore } from '../stores/TipStore';

export function usePlantTipSystem() {
    const {
        setActiveTip,
        activeTip,
        latestPlantData,
        setLatestPlantData,
        setLatestThresholds
    } = useTipStore();

    // Helper to save tip history
    const setAndSaveTip = (tip: TipObject | null) => {
        setActiveTip(tip);
        if (tip) {
            saveTip(tip);
        }
    };

    // 1. Polling System (Every 1 Minute)
    const checkPlantHealth = useCallback(async () => {
        try {
            const { data: { user } } = await db.public.auth.getUser();
            if (!user) return;

            // Get user's plants
            const { data: plants } = await db.social
                .from('Plants')
                .select('id, nickname, plant_data:Plant_data(*)')
                .eq('user_id', user.id);

            if (!plants || plants.length === 0) return;

            // Check each plant
            for (const plant of plants) {
                // Get latest sensor data for this plant
                const { data: latestController } = await db.micro
                    .from('Controllers')
                    .select('temperature, humidity, soil_moisture, light, electrical_conductivity, created_at')
                    .eq('plant_id', plant.id)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (!latestController) continue;

                // Prepare data for resolver
                const plantData: PlantDataInput = {
                    plantName: plant.nickname || 'your plant',
                    soilMoisture: latestController.soil_moisture,
                    lightLevel: latestController.light,
                    temperature: latestController.temperature,
                    ecValue: latestController.electrical_conductivity,
                };

                // Get thresholds
                const thresholds = Array.isArray(plant.plant_data) ? plant.plant_data[0] : plant.plant_data;

                // Store for manual trigger
                setLatestPlantData(plantData);
                setLatestThresholds(thresholds);

                // Check for tips
                const tip = getTriggeredTip(plantData, thresholds);

                if (tip) {
                    setAndSaveTip(tip);
                    // Return true if a tip was found/set
                    return true;
                }
            }

            // If we loop through all and find nothing, clear active tip
            // (Only if we want auto-clear behavior)
            // setActiveTip(null); 
            return false;

        } catch (err) {
            console.log("Polling error:", err);
            return false;
        }
    }, [setActiveTip, setLatestPlantData, setLatestThresholds]);

    useEffect(() => {
        // Run immediately on mount
        checkPlantHealth();

        // Then run every 1 minute
        const interval = setInterval(checkPlantHealth, 60 * 10000);

        return () => clearInterval(interval);
    }, [checkPlantHealth]);

    // 2. General Tips Timer
    useEffect(() => {
        const interval = setInterval(() => {
            if (!activeTip) {
                const randomTip = getRandomGeneralTip();
                setAndSaveTip(randomTip);
            }
        }, 30 * 60 * 1000); // 30 minutes

        return () => clearInterval(interval);
    }, [activeTip]);

    // 3. Manual Trigger
    const triggerManualTip = () => {
        const { latestPlantData, latestThresholds } = useTipStore.getState();

        if (latestPlantData) {
            const tip = getTriggeredTip(latestPlantData, latestThresholds);
            if (tip) {
                setAndSaveTip(tip);
                return;
            }
        }
        // Fallback to general tip
        const generalTip = getRandomGeneralTip();
        setAndSaveTip(generalTip);
    };

    const dismissTip = () => {
        setActiveTip(null);
    };

    return {
        triggerManualTip,
        checkPlantHealth, // Exposed for on-demand scanning
        activeTip, // Expose for backward compat if needed, though components should use store directly
        dismissTip,
        latestPlantData
    };
}
