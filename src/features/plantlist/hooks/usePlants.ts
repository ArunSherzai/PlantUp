import { useEffect, useState } from 'react';
import { db } from '../../../utils/supabase';
import { PlantItem } from '../types/plant.types';
import { customGradients } from '../constants/plantGradient';
import { getPublicPlantImageUrl } from '../../../utils/media';

export function usePlants(userId?: string) {
  const [plants, setPlants] = useState<PlantItem[]>([]);

  const refreshPlants = async () => {
    try {
      let targetId = userId;

      if (!targetId) {
        const { data: userData, error: userError } = await db.public.auth.getUser();
        if (userError) {
          throw userError;
        }
        targetId = userData?.user?.id;
      }

      if (!targetId) return;

      console.log('[usePlants] refresh started', { userId: targetId });

      const { data, error } = await db.social
        .from('Plants')
        .select('id, nickname, description, image_url, plant_data_id')
        .eq('user_id', targetId);

      if (error) {
        throw error;
      }

      const plantRows = data ?? [];
      const plantIds = plantRows.map((plant) => plant.id);
      const latestControllerByPlant = new Map<
        string,
        { sensorBoxId: string; lastSeenAt?: string }
      >();

      if (plantIds.length > 0) {
        const { data: devices, error: deviceError } = await db.micro
          .from('Devices')
          .select('id, plant_id')
          .in('plant_id', plantIds);

        if (deviceError) {
          console.error('[usePlants] device lookup failed', deviceError);
        } else if (devices && devices.length > 0) {
          const deviceIds = devices.map((device) => device.id);
          const plantIdByDeviceId = new Map(devices.map((device) => [device.id, device.plant_id]));

          const { data: controllerData, error: controllerError } = await db.micro
            .from('Controllers')
            .select('id, device_id, time, created_at')
            .in('device_id', deviceIds)
            .order('time', { ascending: false });

          if (controllerError) {
            console.error('[usePlants] controller lookup failed', controllerError);
          } else {
            (controllerData ?? []).forEach((controller) => {
              const plantId = plantIdByDeviceId.get(controller.device_id);
              if (!plantId || latestControllerByPlant.has(plantId)) return;

              latestControllerByPlant.set(plantId, {
                sensorBoxId: controller.device_id ?? controller.id,
                lastSeenAt: controller.time ?? controller.created_at ?? undefined,
              });
            });
          }

          devices.forEach((device) => {
            if (!latestControllerByPlant.has(device.plant_id)) {
              latestControllerByPlant.set(device.plant_id, {
                sensorBoxId: device.id,
                lastSeenAt: undefined,
              });
            }
          });
        }
      }

      const mapped: PlantItem[] = plantRows.map((p, idx) => ({
        id: p.id,
        name: p.nickname ?? '',
        type_id: p.plant_data_id ?? undefined,
        description: p.description ?? '',
        image_url: getPublicPlantImageUrl(p.image_url) || undefined,
        imagePath: p.image_url,
        sensorBoxId: latestControllerByPlant.get(p.id)?.sensorBoxId,
        sensorLastSeenAt: latestControllerByPlant.get(p.id)?.lastSeenAt,
        image: '',
        gradientColors: customGradients[idx % customGradients.length],
      }));

      setPlants((previousPlants) => {
        if (previousPlants.length === 0) {
          return mapped;
        }

        const refreshedById = new Map(mapped.map((plant) => [plant.id, plant]));
        const previousOrderIds = previousPlants.map((plant) => plant.id);
        const orderedExistingPlants = previousOrderIds
          .map((plantId) => refreshedById.get(plantId))
          .filter((plant): plant is PlantItem => Boolean(plant));
        const newlyAddedPlants = mapped.filter((plant) => !previousOrderIds.includes(plant.id));

        return [...orderedExistingPlants, ...newlyAddedPlants];
      });

      console.log('[usePlants] refresh finished', { userId: targetId, count: mapped.length });
    } catch (error) {
      console.error('[usePlants] refresh failed', error);
      throw error;
    }
  };

  useEffect(() => {
    void refreshPlants().catch(() => undefined);
  }, [userId]);

  return { plants, refreshPlants };
}
