import { db } from '../../../utils/supabase';
import type { TipObject } from '../../../utils/tipResolver';

export interface PlantAlertRow {
  id: string;
  plant_id: string;
  user_id: string;
  alert_key: string;
  alert_type: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  metric?: string | null;
  current_value?: number | null;
  target_min?: number | null;
  target_max?: number | null;
  source: string;
  reading_created_at?: string | null;
  first_triggered_at: string;
  last_triggered_at: string;
  metadata?: Record<string, any> | null;
  plant_name?: string | null;
}

const SEVERITY_ORDER: Record<PlantAlertRow['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

function sortAlerts(alerts: PlantAlertRow[]): PlantAlertRow[] {
  return [...alerts].sort((a, b) => {
    const severityDelta = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDelta !== 0) return severityDelta;
    return new Date(b.last_triggered_at).getTime() - new Date(a.last_triggered_at).getTime();
  });
}

export function mapPlantAlertToTip(alert: PlantAlertRow): TipObject {
  const plantName =
    alert.plant_name ??
    (typeof alert.metadata?.plant_name === 'string' ? alert.metadata.plant_name : null) ??
    (typeof alert.metadata?.plant_nickname === 'string' ? alert.metadata.plant_nickname : null);

  let title = alert.title;
  let message = alert.message;

  if (plantName) {
    if (alert.alert_type === 'progress_photo_due') {
      title = `Take a progress photo of ${plantName}`;
      message = `It has been at least 7 days since the last progress photo for ${plantName}. Capture a new update.`;
    } else {
      message = message
        .replace(/\bthis plant\b/gi, plantName)
        .replace(/\byour plant\b/gi, plantName);
    }
  }

  return {
    title,
    message,
    severity: alert.severity,
    plantId: alert.plant_id,
    dedupeKey: `alert:${alert.plant_id}:${alert.alert_key}`,
    source: 'alert',
  };
}

export async function fetchActivePlantAlerts(plantId?: string): Promise<PlantAlertRow[]> {
  const { data, error } = await db.social.rpc('get_my_active_plant_alerts', {
    p_plant_id: plantId ?? null,
  });

  if (error) {
    throw error;
  }

  const alerts = (data ?? []) as PlantAlertRow[];
  const plantIds = [...new Set(alerts.map((alert) => alert.plant_id).filter(Boolean))];

  if (plantIds.length === 0) {
    return sortAlerts(alerts);
  }

  const { data: plants, error: plantsError } = await db.social
    .from('Plants')
    .select('id, nickname')
    .in('id', plantIds);

  if (plantsError) {
    throw plantsError;
  }

  const plantNameById = new Map<string, string | null>(
    (plants ?? []).map((plant: any) => [plant.id, plant.nickname ?? null]),
  );

  return sortAlerts(
    alerts.map((alert) => ({
      ...alert,
      plant_name: plantNameById.get(alert.plant_id) ?? alert.plant_name ?? null,
    })),
  );
}

export async function fetchPrimaryPlantAlertTip(plantId?: string): Promise<TipObject | null> {
  const alerts = await fetchActivePlantAlerts(plantId);
  if (alerts.length === 0) return null;
  return mapPlantAlertToTip(alerts[0]);
}
