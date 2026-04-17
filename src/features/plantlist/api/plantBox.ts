import { db } from '~/utils/supabase';

const SENSOR_ACTIVITY_WINDOW_HOURS = 24;

type LatestControllerRecord = {
  id: string;
  device_id: string | null;
  time: string | null;
  created_at: string | null;
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

export async function validatePlantBoxId(
  sensorBoxId: string,
  currentUserId?: string
): Promise<PlantBoxValidationResult> {
  const normalizedId = sensorBoxId.trim();

  if (!normalizedId) {
    return { isValid: false, message: 'Enter a Sensor Box ID.' };
  }

  const { data: latestRecord, error } = await db.micro
    .from('Controllers')
    .select('id, device_id, time, created_at')
    .eq('device_id', normalizedId)
    .order('time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!latestRecord) {
    return { isValid: false, message: 'No PlantBox found with this ID.' };
  }

  const { data: deviceMapping } = await db.micro
    .from('Devices')
    .select('plant_id, user_id')
    .eq('id', normalizedId)
    .maybeSingle();

  return {
    isValid: true,
    sensorBoxId: latestRecord.device_id ?? normalizedId,
    latestSeenAt: latestRecord.time ?? latestRecord.created_at ?? undefined,
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
  const { data: mappings } = await db.micro.from('Devices').select('id, plant_id');
  const mappingMap = new Map((mappings ?? []).map((mapping) => [mapping.id, mapping.plant_id]));

  const results: PlantBoxOption[] = [];
  const seenDevices = new Set<string>();

  for (const record of (data ?? []) as LatestControllerRecord[]) {
    if (!record.device_id || seenDevices.has(record.device_id)) continue;

    const latestSeenAt = record.time ?? record.created_at;
    if (!latestSeenAt) continue;

    const latestSeenDate = new Date(latestSeenAt);
    if (Number.isNaN(latestSeenDate.getTime()) || latestSeenDate.getTime() < recentCutoff) {
      continue;
    }

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
  sensorBoxId: string;
  plantId: string;
  userId?: string;
}) {
  const { sensorBoxId, plantId, userId } = params;

  const { error: upsertError } = await db.micro
    .from('Devices')
    .upsert({ id: sensorBoxId, user_id: userId, plant_id: plantId }, { onConflict: 'id' });

  if (upsertError) throw upsertError;
}
