import { create } from 'zustand';
import { db } from '../utils/supabase';
import { useUserStore } from './UserStore';
import { RealtimeChannel } from '@supabase/supabase-js';

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

    fetchMessages: (conversationId: string) => Promise<void>;
    sendMessage: (conversationId: string, content: string) => Promise<boolean>;
    subscribeToConversation: (conversationId: string) => void;
    unsubscribeFromConversation: (conversationId: string) => void;
    markAsRead: (conversationId: string) => Promise<void>;
    subscribeToInbox: () => void;
    unsubscribeFromInbox: () => void;
    handleConversationUpdate: (updatedConv: any) => void;
}

// Keep track of active subscriptions outside the store to avoid serialization issues if any
let activeChannel: RealtimeChannel | null = null;
let activeChannelId: string | null = null;
let inboxChannels: RealtimeChannel[] = [];

export const useDMStore = create<DMState>((set, get) => ({
    conversations: [],
    activeConversationId: null,
    messages: {},
    loading: false,

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

    fetchMessages: async (conversationId: string) => {
        set({ loading: true, activeConversationId: conversationId });

        console.log('[DMStore] Fetching messages for:', conversationId);

        try {
            const { data, error } = await db.social
                .from('dm_messages')
                .select('id, conversation_id, sender_id, content, created_at, read_at, message_type')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('[DMStore] Error fetching messages:', error);
                throw error;
            }

            console.log('[DMStore] Messages fetched:', data?.length);

            set(state => ({
                messages: {
                    ...state.messages,
                    [conversationId]: data || []
                },
                loading: false
            }));

        } catch (e) {
            console.error('[DMStore] Exception fetching messages:', e);
            set({ loading: false });
        }
    },

    sendMessage: async (conversationId: string, content: string) => {
        const user = useUserStore.getState().user;
        if (!user) {
            console.log('[DMStore] sendMessage: No user found');
            return false;
        }

        console.log('[DMStore] Sending message to:', conversationId, 'Content:', content);

        try {
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
                    console.log('[DMStore] Realtime Event Received:', payload);
                    const newMessage = payload.new as ChatMessage;

                    set(state => {
                        const currentMessages = state.messages[conversationId] || [];
                        // Avoid duplicates
                        if (currentMessages.find(m => m.id === newMessage.id)) return state;

                        return {
                            messages: {
                                ...state.messages,
                                [conversationId]: [...currentMessages, newMessage]
                            }
                        };
                    });
                }
            )
            .subscribe((status) => {
                console.log('[DMStore] Realtime subscription status for', conversationId, ':', status);
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

    subscribeToInbox: () => {
        const user = useUserStore.getState().user;
        const state = get();

        if (!user) return;

        // Prevent duplicate subscriptions
        if (inboxChannels.length > 0) {
            console.log('[DMStore] Inbox already subscribed');
            return;
        }

        console.log('[DMStore] Subscribing to Inbox updates for user:', user.id);

        const handleStatus = (status: string, channelName: string) => {
            console.log(`[DMStore] Inbox ${channelName} status:`, status);
        };

        // Channel 1: Where I am user_low
        const ch1 = db.public
            .channel(`inbox-low-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'social_media_schema',
                    table: 'dm_conversations',
                    filter: `user_low=eq.${user.id}`
                },
                (payload) => {
                    console.log('[DMStore] Inbox Update Received (Low):', payload);
                    get().handleConversationUpdate(payload.new);
                }
            )
            .subscribe((status) => handleStatus(status, 'user_low'));

        // Channel 2: Where I am user_high
        const ch2 = db.public
            .channel(`inbox-high-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'social_media_schema',
                    table: 'dm_conversations',
                    filter: `user_high=eq.${user.id}`
                },
                (payload) => {
                    console.log('[DMStore] Inbox Update Received (High):', payload);
                    get().handleConversationUpdate(payload.new);
                }
            )
            .subscribe((status) => handleStatus(status, 'user_high'));

        inboxChannels = [ch1, ch2];
    },

    unsubscribeFromInbox: () => {
        if (inboxChannels.length > 0) {
            console.log('[DMStore] Unsubscribing from Inbox');
            inboxChannels.forEach(ch => db.public.removeChannel(ch));
            inboxChannels = [];
        }
    },

    handleConversationUpdate: (updatedConv: any) => {
        console.log('[DMStore] Conversation updated:', updatedConv.id);
        set(state => {
            // Find existing
            const existingIdx = state.conversations.findIndex(c => c.id === updatedConv.id);
            if (existingIdx === -1) {
                // Ideally trigger a full re-fetch or fetch single, but for now ignore if new
                return state;
            }

            // Clone and update
            const oldConv = state.conversations[existingIdx];

            // Construct new last_message
            let lastMsg: ChatMessage | null = null;
            if (updatedConv.last_message_id) {
                lastMsg = {
                    id: updatedConv.last_message_id,
                    conversation_id: updatedConv.id,
                    sender_id: updatedConv.last_message_sender_id,
                    content: updatedConv.last_message_text,
                    created_at: updatedConv.last_message_at,
                    read_at: null,
                    message_type: 'text'
                };
            }

            const newConv = {
                ...oldConv,
                ...updatedConv,
                last_message: lastMsg,
                // Preserves participants
            };

            // Remove old, add to top
            const otherConvs = state.conversations.filter(c => c.id !== updatedConv.id);
            return {
                conversations: [newConv, ...otherConvs]
            };
        });
    }

}));
