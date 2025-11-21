import { useEffect, useState } from 'react';
import { db } from '../../../utils/supabase';
import { PlantItem } from '../types/plant.types';
import { customGradients } from '../constants/plantGradient';

export function usePlants() {
  const [plants, setPlants] = useState<PlantItem[]>([]);

  const refreshPlants = async () => {
    const { data: userData } = await db.public.auth.getUser();
    const userId = userData?.user?.id;

    const { data, error } = await db.social
      .from('Plants')
      .select('id, nickname, description')
      .eq('user_id', userId);

    if (error) {
      console.log('Reload error:', error);
      return;
    }

    const mapped: PlantItem[] = data.map((p, idx) => ({
      id: p.id,
      name: p.nickname,
      description: p.description,
      image: require('../../../../assets/images/plant4.png'),
      gradientColors: customGradients[idx % customGradients.length],
    }));

    setPlants(mapped);
  };

  useEffect(() => {
    refreshPlants();
  }, []);

  return { plants, refreshPlants };
}
