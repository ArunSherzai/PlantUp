import { db } from './supabase';

/**
 * FYP Interaction Event Logger
 *
 * Logs user interaction events to the Interaction_events table
 * for the FYP recommendation system. These events drive:
 * - Trending score calculation
 * - User interest profile updates
 * - Creator affinity computation
 *
 * All events are fire-and-forget (non-blocking).
 */

export type InteractionEventType =
    | 'view'
    | 'dwell'
    | 'like'
    | 'unlike'
    | 'comment'
    | 'save'
    | 'unsave'
    | 'share'
    | 'follow'
    | 'skip'
    | 'report';

interface LogEventParams {
    userId: string;
    postId: string;
    eventType: InteractionEventType;
    durationMs?: number;
    metadata?: Record<string, any>;
}

/**
 * Log a single interaction event. Fire-and-forget — errors are logged but never thrown.
 */
export async function logInteractionEvent({
    userId,
    postId,
    eventType,
    durationMs = 0,
    metadata = {},
}: LogEventParams): Promise<void> {
    try {
        const { error } = await db.social.rpc('log_interaction_event', {
            p_user_id: userId,
            p_post_id: postId,
            p_event_type: eventType,
            p_duration_ms: durationMs,
            p_metadata: metadata,
        });

        if (error) {
            console.warn('[FYP] Failed to log interaction event:', error.message);
        }
    } catch (err) {
        // Never throw — this is a background analytics event
        console.warn('[FYP] Interaction event logging error:', err);
    }
}

/**
 * Log a view event with optional position metadata.
 */
export function logViewEvent(userId: string, postId: string, source?: string, position?: number) {
    logInteractionEvent({
        userId,
        postId,
        eventType: 'view',
        metadata: { source: source || 'feed', position },
    });
}

/**
 * Log a dwell (time spent) event.
 * @param durationMs – milliseconds the post was in viewport
 */
export function logDwellEvent(userId: string, postId: string, durationMs: number) {
    // Only log if user actually spent meaningful time (> 1 second)
    if (durationMs < 1000) return;
    // Cap at 60 seconds to avoid outliers
    const cappedMs = Math.min(durationMs, 60000);
    logInteractionEvent({
        userId,
        postId,
        eventType: 'dwell',
        durationMs: cappedMs,
    });
}

/**
 * Log a skip event (user scrolled past quickly).
 */
export function logSkipEvent(userId: string, postId: string) {
    logInteractionEvent({
        userId,
        postId,
        eventType: 'skip',
    });
}

/**
 * Log a like event.
 */
export function logLikeEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'like' });
}

/**
 * Log a comment event.
 */
export function logCommentEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'comment' });
}

/**
 * Log a save/bookmark event.
 */
export function logSaveEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'save' });
}

/**
 * Log a share event.
 */
export function logShareEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'share' });
}

/**
 * Log a follow-from-post event.
 */
export function logFollowEvent(userId: string, postId: string, creatorId: string) {
    logInteractionEvent({
        userId,
        postId,
        eventType: 'follow',
        metadata: { creator_id: creatorId },
    });
}

/**
 * Log a report event.
 */
export function logReportEvent(userId: string, postId: string, reason: string) {
    logInteractionEvent({
        userId,
        postId,
        eventType: 'report',
        metadata: { reason },
    });
}

/**
 * Log an unlike event (user removed their like).
 */
export function logUnlikeEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'unlike' });
}

/**
 * Log an unsave event (user removed their save/bookmark).
 */
export function logUnsaveEvent(userId: string, postId: string) {
    logInteractionEvent({ userId, postId, eventType: 'unsave' });
}
