import { db } from '~/utils/supabase';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

type TrackQuestActionParams = {
  actionCode: string;
  eventKey?: string;
  plantId?: string | null;
  amount?: number;
};

export const getTodayQuestKey = () => new Date().toISOString().split('T')[0];

export async function trackQuestAction({
  actionCode,
  eventKey,
  plantId = null,
  amount = 1,
}: TrackQuestActionParams) {
  try {
    const { error } = await db.gamification.rpc('record_quest_action', {
      p_action_code: actionCode,
      p_event_key: eventKey ?? null,
      p_plant_id: plantId,
      p_amount: amount,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    ErrorHandlerService.handle(error, { showUI: false });
  }
}
