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
      const { data: controllerData, error: controllerError } = await db.micro
        .from('Controllers')
        .select('id, plant_id, plantbox_id, time, created_at')
        .in('plant_id', plantIds)
        .order('time', { ascending: false });

      if (controllerError) {
        console.log('Controller lookup error:', controllerError);
      } else {
        controllerData.forEach((controller) => {
          if (!controller.plant_id || latestControllerByPlant.has(controller.plant_id)) {
            return;
          }

          latestControllerByPlant.set(controller.plant_id, {
            sensorBoxId: controller.plantbox_id ?? controller.id,
            lastSeenAt: controller.time ?? controller.created_at ?? undefined,
          });
        });
      }
    }

    const mapped: PlantItem[] = data.map((p, idx) => ({
      id: p.id,
      name: p.nickname,
      type_id: p.plant_data_id ?? undefined,
      description: p.description,
      image_url: getPublicPlantImageUrl(p.image_url) || undefined,
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
