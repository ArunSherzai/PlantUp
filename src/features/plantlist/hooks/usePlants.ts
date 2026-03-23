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

    const mapped: PlantItem[] = data.map((p, idx) => ({
      id: p.id,
      name: p.nickname,
      type_id: p.plant_data_id ?? undefined,
      description: p.description,
      image_url: getPublicPlantImageUrl(p.image_url) || undefined,
      image: require('../../../../assets/images/plant4.png'),
      gradientColors: customGradients[idx % customGradients.length],
    }));

    setPlants(mapped);
  };

  useEffect(() => {
    refreshPlants();
  }, [userId]);

  return { plants, refreshPlants };
}
