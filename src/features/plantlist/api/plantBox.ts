import { db } from '~/utils/supabase';

const SENSOR_ACTIVITY_WINDOW_HOURS = 24;

type LatestControllerRecord = {
  id: string;
  device_id: string | null;
  time: string | null;
  created_at: string | null;
  Devices?: { plant_id: string | null } | { plant_id: string | null }[];
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

export async function validatePlantBoxId(sensorBoxId: string): Promise<PlantBoxValidationResult> {
  const normalizedId = sensorBoxId.trim();

  if (!normalizedId) {
    return { isValid: false, message: 'Enter a Sensor Box ID.' };
  }

  // Check if device_id exists in Controllers
  const { data, error } = await db.micro
    .from('Controllers')
    .select('id, device_id, time, created_at')
    .eq('device_id', normalizedId)
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

  // Check if already assigned to a plant via Devices table
  const { data: deviceMapping } = await db.micro
    .from('Devices')
    .select('plant_id')
    .eq('id', normalizedId)
    .maybeSingle();

  return {
    isValid: true,
    sensorBoxId: latestRecord.device_id ?? normalizedId,
    latestSeenAt,
    existingPlantId: deviceMapping?.plant_id ?? null,
  };
}

export async function fetchAvailablePlantBoxes(): Promise<PlantBoxOption[]> {
  const { data, error } = await db.micro
    .from('Controllers')
    .select('id, device_id, time, created_at')
    .order('time', { ascending: false });

  if (error) throw error;

  const recentCutoff = Date.now() - SENSOR_ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000;

  // Get existing device→plant mappings
  const { data: mappings } = await db.micro.from('Devices').select('id, plant_id');
  const mappingMap = new Map((mappings ?? []).map((m) => [m.id, m.plant_id]));

  const results: PlantBoxOption[] = [];
  const seenDevices = new Set<string>();

  for (const record of data as LatestControllerRecord[]) {
    if (!record.device_id || seenDevices.has(record.device_id)) continue;
    const latestSeenAt = record.time ?? record.created_at;
    if (!latestSeenAt) continue;
    const latestSeenDate = new Date(latestSeenAt);
    if (Number.isNaN(latestSeenDate.getTime()) || latestSeenDate.getTime() < recentCutoff) continue;

    seenDevices.add(record.device_id);
    results.push({
      controllerRecordId: record.id,
      sensorBoxId: record.device_id,
      latestSeenAt,
      existingPlantId: mappingMap.get(record.device_id) ?? null,
    });
  }

  return results;
}

export async function connectPlantBoxToPlant(params: {
  controllerRecordId?: string;
  sensorBoxId: string;
  plantId: string;
  userId?: string;
}) {
  const { sensorBoxId, plantId, userId } = params;

  // Upsert into Devices table — this is the source of truth for device→plant mapping
  const { error: upsertError } = await db.micro.from('Devices').upsert(
    { id: sensorBoxId, user_id: userId, plant_id: plantId },
    { onConflict: 'id' }
  );

  if (upsertError) throw upsertError;
}
