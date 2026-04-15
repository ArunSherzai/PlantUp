import { useEffect, useState } from 'react';
import { db } from '../../../utils/supabase';
import { PlantItem } from '../types/plant.types';
import { customGradients } from '../constants/plantGradient';
import { getPublicPlantImageUrl } from '../../../utils/media';

export function usePlants(userId?: string) {
  const [plants, setPlants] = useState<PlantItem[]>([]);

  const refreshPlants = async () => {
    let targetId = userId;

    if (!targetId) {
      const { data: userData } = await db.public.auth.getUser();
      targetId = userData?.user?.id;
    }

    if (!targetId) return;

    const { data, error } = await db.social
      .from('Plants')
      .select('id, nickname, description, image_url, plant_data_id')
      .eq('user_id', targetId);

    if (error) {
      console.log('Reload error:', error);
      return;
    }

    const plantIds = data.map((plant) => plant.id);
    const latestControllerByPlant = new Map<string, { sensorBoxId: string; lastSeenAt?: string }>();

    if (plantIds.length > 0) {
      // Step 1: Get Devices.id for all plants
      const { data: devices, error: deviceError } = await db.micro
        .from('Devices')
        .select('id, plant_id')
        .in('plant_id', plantIds);

      if (deviceError) {
        console.log('Device lookup error:', deviceError);
      } else if (devices && devices.length > 0) {
        const deviceIds = devices.map((d) => d.id);
        const plantIdByDeviceId = new Map(devices.map((d) => [d.id, d.plant_id]));

        // Step 2: Get latest controller row per device
        const { data: controllerData, error: controllerError } = await db.micro
          .from('Controllers')
          .select('id, device_id, time, created_at')
          .in('device_id', deviceIds)
          .order('time', { ascending: false });

        if (controllerError) {
          console.log('Controller lookup error:', controllerError);
        } else {
          controllerData.forEach((controller) => {
            const plantId = plantIdByDeviceId.get(controller.device_id);
            if (!plantId || latestControllerByPlant.has(plantId)) return;

            latestControllerByPlant.set(plantId, {
              sensorBoxId: controller.device_id ?? controller.id,
              lastSeenAt: controller.time ?? controller.created_at ?? undefined,
            });
          });
        }
      }
    }

    const mapped: PlantItem[] = data.map((p, idx) => ({
      id: p.id,
      name: p.nickname,
      type_id: p.plant_data_id ?? undefined,
      description: p.description,
      image_url: getPublicPlantImageUrl(p.image_url) || undefined,
      imagePath: p.image_url,
      sensorBoxId: latestControllerByPlant.get(p.id)?.sensorBoxId,
      sensorLastSeenAt: latestControllerByPlant.get(p.id)?.lastSeenAt,
      image: '',
      gradientColors: customGradients[idx % customGradients.length],
    }));

    setPlants(mapped);
  };

  useEffect(() => {
    refreshPlants();
  }, [userId]);

  return { plants, refreshPlants };
}
