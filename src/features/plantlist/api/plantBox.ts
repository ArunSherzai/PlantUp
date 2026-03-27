import { db } from '~/utils/supabase';

const SENSOR_ACTIVITY_WINDOW_HOURS = 24;

type LatestControllerRecord = {
  id: string;
  plant_id: string | null;
  time: string | null;
  created_at: string | null;
};

export type PlantBoxOption = {
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

export async function validatePlantBoxId(sensorBoxId: string): Promise<PlantBoxValidationResult> {
  const normalizedId = sensorBoxId.trim();

  if (!normalizedId) {
    return { isValid: false, message: 'Enter a Sensor Box ID.' };
  }

  const { data, error } = await db.micro
    .from('Controllers')
    .select('id, plant_id, time, created_at')
    .eq('id', normalizedId)
    .order('time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const latestRecord = data as LatestControllerRecord | null;
  if (!latestRecord) {
    return { isValid: false, message: 'No sensor data was found for this Sensor Box ID.' };
  }

  const latestSeenAt = latestRecord.time ?? latestRecord.created_at;
  if (!latestSeenAt) {
    return { isValid: false, message: 'This Sensor Box has no usable timestamp yet.' };
  }

  const latestSeenDate = new Date(latestSeenAt);
  if (Number.isNaN(latestSeenDate.getTime())) {
    return { isValid: false, message: 'The latest Sensor Box entry has an invalid timestamp.' };
  }

  const recentCutoff = Date.now() - SENSOR_ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000;
  if (latestSeenDate.getTime() < recentCutoff) {
    return {
      isValid: false,
      message: `This Sensor Box has no recent data in the last ${SENSOR_ACTIVITY_WINDOW_HOURS} hours.`,
    };
  }

  return {
    isValid: true,
    sensorBoxId: normalizedId,
    latestSeenAt,
    existingPlantId: latestRecord.plant_id,
  };
}

export async function fetchAvailablePlantBoxes(): Promise<PlantBoxOption[]> {
  const { data, error } = await db.micro
    .from('Controllers')
    .select('id, plant_id, time, created_at')
    .order('time', { ascending: false })
    .limit(500);

  if (error) throw error;

  const latestBySensor = new Map<string, PlantBoxOption>();
  const recentCutoff = Date.now() - SENSOR_ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000;

  (data as LatestControllerRecord[]).forEach((record) => {
    if (latestBySensor.has(record.id)) return;

    const latestSeenAt = record.time ?? record.created_at;
    if (!latestSeenAt) return;

    const latestSeenDate = new Date(latestSeenAt);
    if (Number.isNaN(latestSeenDate.getTime())) return;
    if (latestSeenDate.getTime() < recentCutoff) return;

    latestBySensor.set(record.id, {
      sensorBoxId: record.id,
      latestSeenAt,
      existingPlantId: record.plant_id,
    });
  });

  return Array.from(latestBySensor.values()).filter((sensor) => !sensor.existingPlantId);
}

export async function connectPlantBoxToPlant(params: {
  sensorBoxId: string;
  plantId: string;
  userId?: string;
}) {
  const { sensorBoxId, plantId, userId } = params;

  const { error: clearExistingPlantBoxesError } = await db.micro
    .from('Controllers')
    .update({ plant_id: null })
    .eq('plant_id', plantId)
    .neq('id', sensorBoxId);

  if (clearExistingPlantBoxesError) throw clearExistingPlantBoxesError;

  const updatePayload: { plant_id: string; user_id?: string } = { plant_id: plantId };
  if (userId) updatePayload.user_id = userId;

  const { error: updatePlantError } = await db.social
    .from('Plants')
    .update({ sensor_id: sensorBoxId })
    .eq('id', plantId);

  if (updatePlantError) throw updatePlantError;

  const { error: connectError } = await db.micro
    .from('Controllers')
    .update(updatePayload)
    .eq('id', sensorBoxId);

  if (connectError) throw connectError;
}
