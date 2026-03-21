// ============================================================
// Test Suite — Interaction Logger (FYP Recommendation Engine)
// ============================================================
// Covers: event logging, dwell thresholds, fire-and-forget
//         semantics, metadata enrichment, edge cases.
// All Supabase RPCs are mocked.
// ============================================================

// Mock Supabase before imports
const mockRpc = jest.fn().mockResolvedValue({ error: null });
jest.mock('../supabase', () => ({
  db: {
    social: { rpc: (...args: any[]) => mockRpc(...args) },
  },
}));

import {
  logInteractionEvent,
  logViewEvent,
  logDwellEvent,
  logSkipEvent,
  logLikeEvent,
  logCommentEvent,
  logSaveEvent,
  logShareEvent,
  logFollowEvent,
  logReportEvent,
  logUnlikeEvent,
  logUnsaveEvent,
} from '../interactionLogger';

afterEach(() => {
  jest.clearAllMocks();
});

// ============================================================
// 1. logInteractionEvent — Core Logger
// ============================================================

describe('logInteractionEvent', () => {
  it('should call Supabase RPC with correct parameters', async () => {
    // Arrange
    const params = {
      userId: 'user-123',
      postId: 'post-456',
      eventType: 'like' as const,
    };

    // Act
    await logInteractionEvent(params);

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', {
      p_user_id: 'user-123',
      p_post_id: 'post-456',
      p_event_type: 'like',
      p_duration_ms: 0,
      p_metadata: {},
    });
  });

  it('should include durationMs when provided', async () => {
    // Arrange & Act
    await logInteractionEvent({
      userId: 'u1', postId: 'p1', eventType: 'dwell', durationMs: 5000,
    });

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_duration_ms: 5000,
    }));
  });

  it('should include metadata when provided', async () => {
    // Arrange & Act
    await logInteractionEvent({
      userId: 'u1', postId: 'p1', eventType: 'follow',
      metadata: { creator_id: 'creator-1' },
    });

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_metadata: { creator_id: 'creator-1' },
    }));
  });

  it('should NOT throw on RPC error (fire-and-forget)', async () => {
    // Arrange
    mockRpc.mockResolvedValueOnce({ error: { message: 'DB error' } });

    // Act & Assert — should not throw
    await expect(
      logInteractionEvent({ userId: 'u1', postId: 'p1', eventType: 'like' })
    ).resolves.toBeUndefined();
  });

  it('should NOT throw on network exception (fire-and-forget)', async () => {
    // Arrange
    mockRpc.mockRejectedValueOnce(new Error('Network failure'));

    // Act & Assert
    await expect(
      logInteractionEvent({ userId: 'u1', postId: 'p1', eventType: 'like' })
    ).resolves.toBeUndefined();
  });
});

// ============================================================
// 2. logDwellEvent — Duration Filtering
// ============================================================

describe('logDwellEvent', () => {
  it('should NOT log events shorter than 1 second', () => {
    // Arrange & Act
    logDwellEvent('u1', 'p1', 500);

    // Assert
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('should log events of exactly 1 second', () => {
    // Arrange & Act
    logDwellEvent('u1', 'p1', 1000);

    // Assert
    expect(mockRpc).toHaveBeenCalled();
  });

  it('should cap duration at 60 seconds', () => {
    // Arrange & Act
    logDwellEvent('u1', 'p1', 120000);

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_duration_ms: 60000,
    }));
  });

  it('should pass through normal durations unchanged', () => {
    // Arrange & Act
    logDwellEvent('u1', 'p1', 15000);

    // Assert
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_duration_ms: 15000,
    }));
  });
});

// ============================================================
// 3. Convenience Wrappers
// ============================================================

describe('Interaction Logger Convenience Functions', () => {
  it('logViewEvent should log with "view" type and metadata', () => {
    logViewEvent('u1', 'p1', 'explore', 3);
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'view',
      p_metadata: { source: 'explore', position: 3 },
    }));
  });

  it('logViewEvent should default source to "feed"', () => {
    logViewEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_metadata: { source: 'feed', position: undefined },
    }));
  });

  it('logSkipEvent should log with "skip" type', () => {
    logSkipEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'skip',
    }));
  });

  it('logLikeEvent should log with "like" type', () => {
    logLikeEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'like',
    }));
  });

  it('logUnlikeEvent should log with "unlike" type', () => {
    logUnlikeEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'unlike',
    }));
  });

  it('logCommentEvent should log with "comment" type', () => {
    logCommentEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'comment',
    }));
  });

  it('logSaveEvent should log with "save" type', () => {
    logSaveEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'save',
    }));
  });

  it('logUnsaveEvent should log with "unsave" type', () => {
    logUnsaveEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'unsave',
    }));
  });

  it('logShareEvent should log with "share" type', () => {
    logShareEvent('u1', 'p1');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'share',
    }));
  });

  it('logFollowEvent should include creator_id in metadata', () => {
    logFollowEvent('u1', 'p1', 'creator-99');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'follow',
      p_metadata: { creator_id: 'creator-99' },
    }));
  });

  it('logReportEvent should include reason in metadata', () => {
    logReportEvent('u1', 'p1', 'spam');
    expect(mockRpc).toHaveBeenCalledWith('log_interaction_event', expect.objectContaining({
      p_event_type: 'report',
      p_metadata: { reason: 'spam' },
    }));
  });
});
