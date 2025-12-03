import { useEffect, useState, useRef } from 'react';
import { Alert } from 'react-native';
import { db } from '../utils/supabase';
import { getTriggeredTip, getRandomGeneralTip, PlantDataInput } from '../utils/tipResolver';

export function usePlantTipSystem() {
    const [activePlantTip, setActivePlantTip] = useState<string | null>(null);
    const latestPlantDataRef = useRef<PlantDataInput | null>(null);
    const latestThresholdsRef = useRef<any | null>(null);

    // 1. Polling System (Every 1 Minute)
    useEffect(() => {
        const checkPlantHealth = async () => {
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
                    latestPlantDataRef.current = plantData;
                    latestThresholdsRef.current = thresholds;

                    // Check for tips
                    const tip = getTriggeredTip(plantData, thresholds);

                    if (tip) {
                        setActivePlantTip(tip);
                        break;
                    } else {
                        setActivePlantTip(null);
                    }
                }

            } catch (err) {
                console.log("Polling error:", err);
            }
        };

        // Run immediately on mount
        checkPlantHealth();

        // Then run every 1 minute
        const interval = setInterval(checkPlantHealth, 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    // 2. General Tips Timer
    useEffect(() => {
        const interval = setInterval(() => {
            if (!activePlantTip) {
                const randomTip = getRandomGeneralTip();
                setActivePlantTip(randomTip);
            }
        }, 5 * 60 * 1000); // 5 minutes

        return () => clearInterval(interval);
    }, [activePlantTip]);

    // 3. Manual Trigger
    const triggerManualTip = () => {
        if (latestPlantDataRef.current) {
            const tip = getTriggeredTip(latestPlantDataRef.current, latestThresholdsRef.current);
            if (tip) {
                setActivePlantTip(tip);
                return;
            }
        }
        // Fallback to general tip
        const generalTip = getRandomGeneralTip();
        setActivePlantTip(generalTip);
    };

    const dismissTip = () => {
        setActivePlantTip(null);
    };

    return {
        triggerManualTip,
        activePlantTip,
        dismissTip,
        latestPlantData: latestPlantDataRef.current
    };
}
