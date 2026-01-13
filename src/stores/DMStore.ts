import { create } from 'zustand';
import { db } from '../utils/supabase';
import { useUserStore } from './UserStore';
import { RealtimeChannel } from '@supabase/supabase-js';
import { playSendSound, playReceiveSound } from '../utils/soundEffects';
import { useMessageNotificationStore } from './MessageNotificationStore';

export interface ChatMessage {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    created_at: string;
    read_at: string | null;
    message_type?: string;
}

export interface Conversation {
    id: string;
    created_at: string;
    updated_at: string;
    last_message?: ChatMessage | null;
    unread_count?: number;
    participants: {
        user_id: string;
        username: string; // Fetched from joined data
        avatar_path?: string; // Fetched from joined data
    }[];
}

interface DMState {
    conversations: Conversation[];
    activeConversationId: string | null;
    messages: { [conversationId: string]: ChatMessage[] }; // Cached messages by conversation
    loading: boolean;

    fetchConversations: () => Promise<void>;
    getOrCreateConversation: (otherUserId: string) => Promise<string | null>; // Returns conversation ID

    fetchMessages: (conversationId: string, offset?: number, background?: boolean) => Promise<void>;
    sendMessage: (conversationId: string, content: string) => Promise<boolean>;
    subscribeToConversation: (conversationId: string) => void;
    unsubscribeFromConversation: (conversationId: string) => void;
    markAsRead: (conversationId: string) => Promise<void>;
    subscribeToInbox: () => void;
    unsubscribeFromInbox: () => void;
    handleNewInboxMessage: (newMessage: ChatMessage) => void;
    upsertConversation: (row: Partial<Conversation>) => void;
}

// Keep track of active subscriptions outside the store to avoid serialization issues if any
let activeChannel: RealtimeChannel | null = null;
let activeChannelId: string | null = null;
let inboxChannels: RealtimeChannel[] = [];
// Track processed events to prevent duplicates from multiple subscriptions or echoes
const processedEvents = new Set<string>();

export const useDMStore = create<DMState>((set, get) => ({
    conversations: [],
    messages: {},
    loading: false,
    activeConversationId: null,

    fetchConversations: async () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        set({ loading: true });

        try {
            // 1. Fetch conversations 
            // Now we can just select * because last_message info is directly on the conversation row!
            // Using logic to check if user is low or high
            const { data: convData, error: convError } = await db.social
                .from('dm_conversations')
                .select('*')
                .or(`user_low.eq.${user.id},user_high.eq.${user.id}`)
                .order('updated_at', { ascending: false });

            if (convError) throw convError;

            if (!convData || convData.length === 0) {
                set({ conversations: [], loading: false });
                return;
            }

            // 2. Resolve "other" user IDs
            const otherUserIds = convData.map(c => {
                return c.user_low === user.id ? c.user_high : c.user_low;
            });
            const uniqueOtherIds = [...new Set(otherUserIds.filter(Boolean))];

            // 3. Fetch User details
            let usersMap: Record<string, any> = {};
            if (uniqueOtherIds.length > 0) {
                const { data: usersData } = await db.user
                    .from('Users')
                    .select('id, username, avatar_path')
                    .in('id', uniqueOtherIds);

                usersData?.forEach(u => { usersMap[u.id] = u; });
            }

            // 4. Fetch Unread Counts (Still need to count messages)
            const conversationIds = convData.map(c => c.id);
            const { data: unreadData, error: unreadError } = await db.social
                .from('dm_messages')
                .select('conversation_id')
                .in('conversation_id', conversationIds)
                .neq('sender_id', user.id)
                .is('read_at', null);

            const unreadCounts: Record<string, number> = {};
            unreadData?.forEach((row: any) => {
                unreadCounts[row.conversation_id] = (unreadCounts[row.conversation_id] || 0) + 1;
            });

            // 5. Assemble
            const conversations: Conversation[] = convData.map(c => {
                const otherUserId = c.user_low === user.id ? c.user_high : c.user_low;
                const otherUser = usersMap[otherUserId];

                // Resolve avatar URL
                let avatarUrl = undefined;
                if (otherUser?.avatar_path) {
                    if (otherUser.avatar_path.startsWith('http')) {
                        avatarUrl = otherUser.avatar_path;
                    } else {
                        const { data } = db.public.storage.from('avatar').getPublicUrl(otherUser.avatar_path);
                        avatarUrl = data.publicUrl;
                    }
                }

                // Construct last message from the new columns on the conversation row
                let lastMsg: ChatMessage | null = null;
                if (c.last_message_id) {
                    lastMsg = {
                        id: c.last_message_id,
                        conversation_id: c.id,
                        sender_id: c.last_message_sender_id,
                        content: c.last_message_text,
                        created_at: c.last_message_at,
                        read_at: null, // Not tracked on convo row, but sufficient for preview
                        message_type: 'text'
                    };
                }

                return {
                    ...c,
                    last_message: lastMsg,
                    participants: otherUser ? [{
                        user_id: otherUser.id,
                        username: otherUser.username,
                        avatar_path: avatarUrl
                    }] : [],
                    unread_count: unreadCounts[c.id] || 0
                };
            });

            set({ conversations, loading: false });

        } catch (e) {
            console.error('[DMStore] Error fetching conversations:', e);
            set({ loading: false });
        }
    },

    getOrCreateConversation: async (otherUserId: string) => {
        const user = useUserStore.getState().user;
        if (!user) return null;

        try {
            const { data, error } = await db.social.rpc('get_or_create_dm_conversation', {
                other_user: otherUserId
            });

            if (error) {
                console.error('Error creating conversation:', error);
                return null;
            }

            return data as string; // UUID
        } catch (err) {
            console.error('Exception creating conversation:', err);
            return null;
        }
    },

    fetchMessages: async (conversationId: string, offset = 0) => {
        // Only set loading on initial fetch
        if (offset === 0) {
            set({ loading: true, activeConversationId: conversationId });
        }

        console.log('[DMStore] Fetching messages for:', conversationId, 'Offset:', offset);

        try {
            const { data, error } = await db.social
                .from('dm_messages')
                .select('id, conversation_id, sender_id, content, created_at, read_at, message_type')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: false }) // Newest first
                .range(offset, offset + 14); // Fetch 15 at a time

            if (error) {
                console.error('[DMStore] Error fetching messages:', error);
                throw error;
            }

            console.log('[DMStore] Messages fetched:', data?.length);

            set(state => {
                const current = state.messages[conversationId] || [];
                // If offset 0, replace. Else append (older messages go to the end of the list).
                const newMessages = offset === 0 ? (data || []) : [...current, ...(data || [])];

                return {
                    messages: {
                        ...state.messages,
                        [conversationId]: newMessages
                    },
                    loading: false
                };
            });

        } catch (e) {
            console.error('[DMStore] Exception fetching messages:', e);
            set({ loading: false });
        }
    },

    sendMessage: async (conversationId: string, content: string) => {
        const user = useUserStore.getState().user;
        if (!user) return false;

        console.log('[DMStore] Sending message to:', conversationId);

        try {
            // Optimistic update could go here, but we rely on refetch/realtime for now to be safe
            // Actually, let's just insert.
            const { error } = await db.social
                .from('dm_messages')
                .insert({
                    conversation_id: conversationId,
                    sender_id: user.id,
                    content: content,
                    message_type: 'text'
                });

            if (error) {
                console.error('[DMStore] Error sending message:', error);
                return false;
            }
            console.log('[DMStore] Message sent successfully');

            // Play send sound
            playSendSound();

            return true;
        } catch (e) {
            console.error('[DMStore] Exception sending message:', e);
            return false;
        }
    },

    subscribeToConversation: (conversationId: string) => {
        // Unsubscribe from previous if different
        if (activeChannelId === conversationId && activeChannel) return;
        if (activeChannel) {
            db.public.removeChannel(activeChannel);
            activeChannel = null;
            activeChannelId = null;
        }

        console.log('[DMStore] Subscribing to conversation:', conversationId);

        const channel = db.public
            .channel(`dm:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'social_media_schema',
                    table: 'dm_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log('[DMStore] Realtime Chat Event:', payload);
                    const newMessage = payload.new as ChatMessage;
                    const user = useUserStore.getState().user;

                    set(state => {
                        const currentMessages = state.messages[conversationId] || [];
                        // Avoid duplicates
                        if (currentMessages.find(m => m.id === newMessage.id)) return state;

                        // Play receive sound only if message is from another user
                        if (user && newMessage.sender_id !== user.id) {
                            playReceiveSound();
                        }

                        // Newest First: Prepend the new message
                        return {
                            messages: {
                                ...state.messages,
                                [conversationId]: [newMessage, ...currentMessages]
                            }
                        };
                    });
                }
            )
            .subscribe((status, err) => {
                console.log('[DMStore] Chat subscription status:', status);
                if (err) {
                    console.error('[DMStore] Chat subscription error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    console.log('[DMStore] ✅ Successfully subscribed to chat:', conversationId);
                } else if (status === 'CLOSED') {
                    console.log('[DMStore] ❌ Chat subscription closed:', conversationId);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[DMStore] ❌ Chat subscription error:', conversationId);
                }
            });

        activeChannel = channel;
        activeChannelId = conversationId;
    },

    unsubscribeFromConversation: (conversationId: string) => {
        if (activeChannel && activeChannelId === conversationId) {
            db.public.removeChannel(activeChannel);
            activeChannel = null;
            activeChannelId = null;
        }
    },

    markAsRead: async (conversationId: string) => {
        const user = useUserStore.getState().user;
        if (!user) return;

        try {
            await db.social
                .from('dm_messages')
                .update({ read_at: new Date().toISOString() })
                .eq('conversation_id', conversationId)
                .is('read_at', null)
                .neq('sender_id', user.id);
        } catch (e) {
            console.error('[DMStore] Error marking as read:', e);
        }
    },

    upsertConversation: (row: Partial<Conversation>) => {
        if (!row.id) return;
        set((state) => {
            const idx = state.conversations.findIndex((c) => c.id === row.id);

            // Merge with existing to preserve fields like 'participants' if the row update is partial
            // (Though payload.new from supabase is usually the full row)
            // However, the payload row won't have the JOINED fields (username, avatar).
            // So we MUST preserve the existing participant info if available.
            // If it's a NEW conversation arriving via realtime, we might lack participant info until a fetch happens?
            // BUT, the user prompt says: "The user main objective is to fix... updates."
            // Assuming existing conversations update. unique constraint? 
            // If it is a brand new conversation, row won't have participants.
            // We might need to fetch if it is new.
            // For now, let's implement the upsert logic as requested, being careful to preserve existing data.

            const existing = state.conversations[idx];

            // If we have an existing record, we keep its participants/extended info.
            // If it's new, we might assume standard structure, but we might likely need to fetch details for a new conv.
            // For the "Inbox Update" case (updates to existing), this works perfect.

            const merged: Conversation = existing
                ? { ...existing, ...row, participants: existing.participants }
                : { ...row, participants: [], created_at: row.created_at!, updated_at: row.updated_at!, id: row.id! } as Conversation;

            const next = idx >= 0
                ? [merged, ...state.conversations.slice(0, idx), ...state.conversations.slice(idx + 1)]
                : [merged, ...state.conversations];

            return { conversations: next };
        });
    },

    subscribeToInbox: () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        // Prevent duplicate subscriptions
        if (inboxChannels.length > 0) {
            console.log('[DMStore] Inbox already subscribed');
            return;
        }

        console.log(`[DMStore] SUBSCRIBING inbox for ${user.id}`);

        const channel = db.public
            .channel(`dm_inbox:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'social_media_schema',
                    table: 'dm_conversations',
                    // filter: `or(user_low.eq.${user.id},user_high.eq.${user.id})`,
                },
                (payload) => {
                    console.log('[DMStore] 📬 INBOX EVENT RECEIVED');
                    const updatedConvo = payload.new as any;
                    const eventKey = `${updatedConvo.id}-${updatedConvo.last_message_time}`;

                    if (processedEvents.has(eventKey)) {
                        console.log('[DMStore] 🛑 Skipping duplicate event:', eventKey);
                        return;
                    }
                    processedEvents.add(eventKey);
                    // Clear after 5 seconds to free memory
                    setTimeout(() => processedEvents.delete(eventKey), 5000);

                    console.log('[DMStore] Payload:', JSON.stringify(payload.new, null, 2));
                    const user = useUserStore.getState().user;

                    console.log('[DMStore] Last message from:', updatedConvo.last_message_sender_id);
                    console.log('[DMStore] Current user:', user?.id);
                    console.log('[DMStore] Message text:', updatedConvo.last_message_text);

                    // Show notification & Update Badge if message is from another user
                    let nextUnreadCount = undefined;

                    if (updatedConvo.last_message_sender_id &&
                        updatedConvo.last_message_sender_id !== user?.id &&
                        updatedConvo.last_message_text) {

                        console.log('[DMStore] ✅ New message from OTHER user - showing notification');

                        // Find the conversation to get detailed info
                        const conversations = get().conversations;
                        const existingConvo = conversations.find(c => c.id === updatedConvo.id);

                        // DUPLICATE CHECK: Only notify if the time has actually changed or the message text is different
                        // This prevents re-notifying on metadata updates (like 'read' status changes happening concurrently)
                        console.log('[DuplicateCheck] Existing Time:', existingConvo?.last_message?.created_at);
                        console.log('[DuplicateCheck] New Time:', updatedConvo.last_message_time);

                        const existingTime = existingConvo?.last_message?.created_at ? new Date(existingConvo.last_message.created_at).getTime() : 0;
                        const newTime = updatedConvo.last_message_time ? new Date(updatedConvo.last_message_time).getTime() : 0;

                        const isDuplicate = existingConvo &&
                            existingTime === newTime &&
                            existingConvo.last_message?.content === updatedConvo.last_message_text;

                        if (!isDuplicate) {
                            const senderName = existingConvo?.participants?.[0]?.username || 'New Message';
                            const avatar = existingConvo?.participants?.[0]?.avatar_path;

                            // Increment badge locally
                            const currentUnread = existingConvo?.unread_count || 0;
                            nextUnreadCount = currentUnread + 1;

                            // Play sound
                            playReceiveSound();

                            // Show notification banner
                            useMessageNotificationStore.getState().showNotification({
                                senderName,
                                content: updatedConvo.last_message_text,
                                avatar: avatar ? { uri: avatar } : undefined,
                                conversationId: updatedConvo.id,
                            });
                        } else {
                            console.log('[DMStore] ⚠️ Ignoring duplicate/redundant update');
                        }
                    }

                    // Upsert with new unread count if applicable
                    get().upsertConversation({
                        ...updatedConvo as Conversation,
                        ...(nextUnreadCount !== undefined ? { unread_count: nextUnreadCount } : {})
                    });
                }
            )
            .subscribe((status, err) => {
                console.log('[DMStore] Inbox subscription status:', status);
                if (err) {
                    console.error('[DMStore] Inbox subscription error:', err);
                }
                if (status === 'SUBSCRIBED') {
                    console.log('[DMStore] ✅ Successfully subscribed to inbox for user:', user.id);
                } else if (status === 'CLOSED') {
                    console.log('[DMStore] ❌ Inbox subscription closed');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('[DMStore] ❌ Inbox subscription error');
                }
            });

        inboxChannels = [channel];
    },

    unsubscribeFromInbox: () => {
        if (inboxChannels.length > 0) {
            console.log('[DMStore] Unsubscribing from Inbox');
            inboxChannels.forEach(ch => db.public.removeChannel(ch));
            inboxChannels = [];
        }
    },

    handleNewInboxMessage: (newMessage: ChatMessage) => {
        // Deprecated/Unused with new logic but kept for interface compatibility if needed, 
        // or effectively no-op if we don't call it. 
        // The new logic uses upsertConversation handles reordering via the conversation update.
    }

}));
