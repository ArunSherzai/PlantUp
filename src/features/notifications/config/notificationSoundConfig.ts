export type NotificationSoundCategory = 'critical' | 'warning' | 'general' | 'chat';
export type NotificationSoundPreference = 'critical_sprig' | 'sprig_warning' | 'advices_ping' | 'rec' | 'sprig_noti' | 'off';

export const DEFAULT_NOTIFICATION_SOUND_SETTINGS: Record<NotificationSoundCategory, NotificationSoundPreference> = {
  critical: 'critical_sprig',
  warning: 'sprig_warning',
  general: 'advices_ping',
  chat: 'rec',
};

export const NOTIFICATION_SOUND_OPTIONS: Array<{ value: NotificationSoundPreference; label: string }> = [
  { value: 'critical_sprig', label: 'Critical Sprig' },
  { value: 'sprig_warning', label: 'Sprig Warning' },
  { value: 'advices_ping', label: 'Advice Ping' },
  { value: 'rec', label: 'Chat Ping' },
  { value: 'sprig_noti', label: 'Soft Sprig' },
  { value: 'off', label: 'Off' },
];

export const NOTIFICATION_SOUND_CATEGORY_LABELS: Record<NotificationSoundCategory, string> = {
  critical: 'Critical alerts',
  warning: 'Warnings',
  general: 'General tips',
  chat: 'Chat messages',
};

export function getNotificationSoundCategoryForTipSeverity(severity: 'critical' | 'warning' | 'info'): NotificationSoundCategory {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'warning';
  return 'general';
}
