import { db } from '~/utils/supabase';

const SENSOR_ACTIVITY_WINDOW_HOURS = 24;

type LatestControllerRecord = {
  id: string;
  plant_id: string | null;
  plantbox_id?: string | null;
  sensor_id?: string | null;
  time: string | null;
  created_at: string | null;
  [key: string]: any;
};

export type PlantBoxOption = {
  controllerRecordId: string;
  sensorBoxId: string;
  latestSeenAt: string;
  existingPlantId: string | null;
};

export type PlantBoxValidationResult = {
  isValid: boolean;
  sensorBoxId?: string;
  latestSeenAt?: string;
  existingPlantId?: string | null;
  message?: string;
};

export function formatPlantBoxLastSeen(timestamp?: string | null) {
  if (!timestamp) return 'Unknown';

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';

  return date.toLocaleString();
}

export async function validatePlantBoxId(sensorBoxId: string, currentUserId?: string): Promise<PlantBoxValidationResult> {
  const normalizedId = sensorBoxId.trim();

  if (!normalizedId) {
    return { isValid: false, message: 'Enter a Sensor Box ID.' };
  }

  const { data, error } = await db.micro
    .from('Devices')
    .select('*')
    .eq('id', normalizedId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { isValid: false, message: 'No PlantBox found with this ID.' };
  }

  // We allow overwriting existing assignments if someone else has claimed it
  /*
  if (data.user_id && currentUserId && data.user_id !== currentUserId) {
    return { isValid: false, message: 'This PlantBox is already registered to another user.' };
  }
  */

  return {
    isValid: true,
    sensorBoxId: data.id,
    latestSeenAt: data.last_seen_at ?? data.created_at,
    existingPlantId: null, // Devices table does not track plant_id in this context
  };
}

export async function fetchAvailablePlantBoxes(): Promise<PlantBoxOption[]> {
  const { data, error } = await db.micro
    .from('Controllers')
    .select('*')
    .order('time', { ascending: false });

  if (error) throw error;

  const recentCutoff = Date.now() - SENSOR_ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000;

  return (data as LatestControllerRecord[])
    .filter((record) => {
      const sensorId = record.plantbox_id ?? record.sensor_id;
      if (!sensorId) return false;
      const latestSeenAt = record.time ?? record.created_at;
      if (!latestSeenAt) return false;
      const latestSeenDate = new Date(latestSeenAt);
      if (Number.isNaN(latestSeenDate.getTime())) return false;
      return latestSeenDate.getTime() >= recentCutoff;
    })
    .map((record) => {
      const latestSeenAt = record.time ?? record.created_at ?? '';
      const sensorId = record.plantbox_id ?? record.sensor_id ?? record.id;
      return {
        controllerRecordId: record.id,
        sensorBoxId: sensorId,
        latestSeenAt,
        existingPlantId: record.plant_id,
      };
    });
}

export async function connectPlantBoxToPlant(params: {
  sensorBoxId: string;
  plantId: string;
  userId?: string;
}) {
  const { sensorBoxId, plantId, userId } = params;


  // The device connection is handled entirely in the microcontroller schema.
  // There is no sensor_id in the Plants table.
  const { data, error: assignError } = await db.micro
    .from('Devices')
    .update({ plant_id: plantId, user_id: userId })
    .eq('id', sensorBoxId)
    .select()
    .single();
    
  if (assignError) {
    if (assignError.code === 'PGRST116') {
      throw new Error('PlantBox connection failed. It may be registered to someone else.');
    }
    throw assignError;
  }
  if (!data) throw new Error('PlantBox connection failed or you do not have permission to claim it.');

  // Controllers table is linked via device_id to the Devices table, so updating the device is sufficient.
}
