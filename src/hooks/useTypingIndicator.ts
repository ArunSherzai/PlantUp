import { useEffect, useRef, useState } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { db } from '../utils/supabase';

interface TypingPresenceState {
    user_id: string;
    typing: boolean;
}

interface UseTypingIndicatorProps {
    conversationId: string;
    currentUserId: string;
    enabled: boolean; // Only enable when screen is focused
}

export const useTypingIndicator = ({ conversationId, currentUserId, enabled }: UseTypingIndicatorProps) => {
    const [isOtherUserTyping, setIsOtherUserTyping] = useState(false);
    const channelRef = useRef<RealtimeChannel | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastTypingStateRef = useRef(false);

    // Initialize presence channel
    useEffect(() => {
        if (!enabled || !conversationId || !currentUserId) return;

        console.log('[TypingIndicator] Initializing for conversation:', conversationId);

        // Create presence channel for this conversation
        const channel = db.public
            .channel(`typing:${conversationId}`, {
                config: {
                    presence: {
                        key: currentUserId, // Use userId as presence key
                    },
                },
            })
            .on('presence', { event: 'sync' }, () => {
                // Get all presence states
                const state = channel.presenceState<TypingPresenceState>();
                console.log('[TypingIndicator] Presence sync:', state);

                // Check if any OTHER user is typing (not current user)
                let someoneElseTyping = false;
                for (const key in state) {
                    const users = state[key];
                    for (const user of users) {
                        if (user.user_id !== currentUserId && user.typing) {
                            someoneElseTyping = true;
                            break;
                        }
                    }
                    if (someoneElseTyping) break;
                }

                setIsOtherUserTyping(someoneElseTyping);
            })
            .subscribe(async (status) => {
                console.log('[TypingIndicator] Channel status:', status);
                if (status === 'SUBSCRIBED') {
                    // Track initial state (not typing)
                    await channel.track({
                        user_id: currentUserId,
                        typing: false,
                    });
                    console.log('[TypingIndicator] ✅ Subscribed and tracking');
                }
            });

        channelRef.current = channel;

        // Cleanup on unmount
        return () => {
            console.log('[TypingIndicator] Cleaning up channel');
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            if (channelRef.current) {
                channelRef.current.untrack();
                db.public.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [conversationId, currentUserId, enabled]);

    // Start typing (debounced)
    const startTyping = () => {
        if (!channelRef.current || !enabled) return;

        // Clear existing auto-stop timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Debounce: only send update if not already sent recently
        if (!lastTypingStateRef.current) {
            // First keystroke - send immediately
            channelRef.current.track({
                user_id: currentUserId,
                typing: true,
            });
            lastTypingStateRef.current = true;
            console.log('[TypingIndicator] Started typing');
        } else {
            // Already typing - debounce updates
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(() => {
                if (channelRef.current) {
                    channelRef.current.track({
                        user_id: currentUserId,
                        typing: true,
                    });
                    console.log('[TypingIndicator] Refreshed typing state');
                }
            }, 1500); // 1.5s debounce
        }

        // Auto-stop after 3 seconds of no activity
        typingTimeoutRef.current = setTimeout(() => {
            stopTyping();
        }, 3000);
    };

    // Stop typing
    const stopTyping = () => {
        if (!channelRef.current || !enabled) return;

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
            debounceTimeoutRef.current = null;
        }

        if (lastTypingStateRef.current) {
            channelRef.current.track({
                user_id: currentUserId,
                typing: false,
            });
            lastTypingStateRef.current = false;
            console.log('[TypingIndicator] Stopped typing');
        }
    };

    return {
        isOtherUserTyping,
        startTyping,
        stopTyping,
    };
};
