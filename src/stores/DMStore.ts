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
}

// Keep track of active subscriptions outside the store to avoid serialization issues if any
let activeChannel: RealtimeChannel | null = null;
let activeChannelId: string | null = null;

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
            // 1. Get my conversations
            const { data: participations, error: partError } = await db.social
                .from('dm_participants')
                .select('conversation_id')
                .eq('user_id', user.id);

            if (partError) throw partError;
            if (!participations || participations.length === 0) {
                set({ conversations: [], loading: false });
                return;
            }

            const conversationIds = participations.map(p => p.conversation_id);

            // 2. Fetch conversations details
            const { data: convData, error: convError } = await db.social
                .from('dm_conversations')
                .select('*')
                .in('id', conversationIds)
                .order('updated_at', { ascending: false });

            if (convError) throw convError;

            // 3. Fetch participants for these conversations (to get names/avatars)
            const { data: allParticipants, error: allPartError } = await db.social
                .from('dm_participants')
                .select('conversation_id, user_id')
                .in('conversation_id', conversationIds);

            if (allPartError) throw allPartError;

            // Need to fetch User details (username, avatar) for the *other* participants
            // Filter out 'me'
            const otherParticipantIds = allParticipants
                ?.filter(p => p.user_id !== user.id)
                .map(p => p.user_id);

            let usersMap: Record<string, any> = {};
            if (otherParticipantIds && otherParticipantIds.length > 0) {
                const { data: usersData } = await db.user
                    .from('Users')
                    .select('id, username, avatar_path')
                    .in('id', otherParticipantIds);

                usersData?.forEach(u => { usersMap[u.id] = u; });
            }

            // 4. Fetch last message for each conversation
            const { data: lastMessages, error: msgError } = await db.social
                .from('dm_messages')
                .select('*')
                .in('conversation_id', conversationIds)
                .order('created_at', { ascending: false });

            // Helper to find latest message per conversation
            // Since we can't easily do "distinct on" via simple query with RLS sometimes, let's process in JS or optimize later
            // A better way is a Postgres function or view, but let's do JS for flexibility right now.

            const conversations: Conversation[] = convData.map(c => {
                // Find other participant
                const myPartRecord = participations.find(p => p.conversation_id === c.id);
                const parts = allParticipants?.filter(p => p.conversation_id === c.id) || [];
                const otherPart = parts.find(p => p.user_id !== user.id);
                const otherUser = otherPart ? usersMap[otherPart.user_id] : null;

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

                // Find last message
                // This is inefficient O(N^2) effectively if many messages, but strict limit usually applies
                // Optimally, we fetch only 1 message per conversation from DB
                const cMessages = lastMessages?.filter(m => m.conversation_id === c.id) || [];
                const latestMsg = cMessages[0]; // Assumes order by created_at desc

                return {
                    ...c,
                    last_message: latestMsg,
                    participants: otherUser ? [{
                        user_id: otherUser.id,
                        username: otherUser.username,
                        avatar_path: avatarUrl
                    }] : [],
                    unread_count: 0 // TODO: Calculate based on last_read_at
                };
            });

            set({ conversations, loading: false });

        } catch (e) {
            console.error('Error fetching conversations:', e);
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
                // If error says proper message about mutual follow, maybe toast it?
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

        console.log('Subscribing to conversation:', conversationId);

        const channel = db.public
            .channel(`conversation:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'social_media_schema',
                    table: 'dm_messages',
                    filter: `conversation_id=eq.${conversationId}`
                },
                (payload) => {
                    console.log('New Message Received:', payload.new);
                    const newMessage = payload.new as ChatMessage;

                    set(state => {
                        const currentMessages = state.messages[conversationId] || [];
                        // Avoid duplicates if any
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
            .subscribe();

        activeChannel = channel;
        activeChannelId = conversationId;
    },

    unsubscribeFromConversation: (conversationId: string) => {
        if (activeChannel && activeChannelId === conversationId) {
            db.public.removeChannel(activeChannel);
            activeChannel = null;
            activeChannelId = null;
        }
    }

}));
