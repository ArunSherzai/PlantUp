import { create } from 'zustand';
import { AppState } from 'react-native';
import { db } from '../utils/supabase';
import { useUserStore } from './UserStore';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';
import { RealtimeChannel } from '@supabase/supabase-js';
import { playSendSound, playReceiveSound } from '../utils/soundEffects';
import { useMessageNotificationStore } from './MessageNotificationStore';
import { NotificationService } from '../services/NotificationService';
import { useInboxStore } from './InboxStore';

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
    subscribeToInbox: () => Promise<void>;
    unsubscribeFromInbox: () => void;
    handleNewInboxMessage: (newMessage: ChatMessage) => void;
    upsertConversation: (row: Partial<Conversation>) => void;

    // Status tracking
    inboxStatus: string;
    chatStatus: string;
    getChannelStatuses: () => { inbox: string; chat: string };
}

// Keep track of active subscriptions outside the store to avoid serialization issues if any
let inboxChannels: RealtimeChannel[] = [];
let retryTimeout: NodeJS.Timeout | null = null;

export const useDMStore = create<DMState>((set, get) => ({
    conversations: [],
    messages: {},
    loading: false,
    activeConversationId: null,
    inboxStatus: 'DISCONNECTED',
    chatStatus: 'DISCONNECTED',

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
            ErrorHandlerService.handle(e, { showUI: false });
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
                ErrorHandlerService.handle(error, { showUI: false });
                return null;
            }

            return data as string; // UUID
        } catch (err) {
            ErrorHandlerService.handle(err, { showUI: false });
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
                ErrorHandlerService.handle(error, { showUI: false });
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
            ErrorHandlerService.handle(e, { showUI: false });
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
                ErrorHandlerService.handle(error, { showUI: false });
                return false;
            }
            console.log('[DMStore] Message sent successfully');

            // Play send sound
            playSendSound();

            return true;
        } catch (e) {
            ErrorHandlerService.handle(e, { showUI: false });
            return false;
        }
    },

    subscribeToConversation: (conversationId: string) => {
        set({
            activeConversationId: conversationId,
            chatStatus: get().inboxStatus === 'SUBSCRIBED' ? 'SUBSCRIBED' : get().inboxStatus
        });
        if (get().inboxStatus !== 'SUBSCRIBED') {
            console.warn('[DMStore] Navigated to chat, but global Inbox is not SUBSCRIBED yet. Status:', get().inboxStatus);
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
                    ErrorHandlerService.handle(err, { showUI: false });
                }
                if (status === 'SUBSCRIBED') {
                    console.log('[DMStore] ✅ Successfully subscribed to chat:', conversationId);
                } else if (status === 'CLOSED') {
                    console.log('[DMStore] ❌ Chat subscription closed:', conversationId);
                } else if (status === 'CHANNEL_ERROR') {
                    ErrorHandlerService.handle(new Error(`Chat subscription error for ${conversationId}`), { showUI: false });
                }
            });

        activeChannel = channel;
        activeChannelId = conversationId;
    },

    unsubscribeFromConversation: (conversationId: string) => {
        set({
            activeConversationId: null,
            chatStatus: get().inboxStatus === 'SUBSCRIBED' ? 'IDLE (READY)' : 'IDLE'
        });
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
            ErrorHandlerService.handle(e, { showUI: false });
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

    subscribeToInbox: async () => {
        if (inboxChannels.length > 0 && get().inboxStatus === 'SUBSCRIBED') {
            return;
        }

        // Cleanup
        if (inboxChannels.length > 0) {
            inboxChannels.forEach(ch => {
                console.log('[DMStore] Cleaning up old inbox channel:', ch.topic);
                db.public.removeChannel(ch);
            });
            inboxChannels = [];
        }

        const user = useUserStore.getState().user;
        if (!user) {
            console.log('[DMStore] Skipping subscription: No user session');
            return;
        }

        // Explicitly set realtime auth token before subscribing
        // This fixes the race condition where subscribeToInbox fires before
        // the global getSession().then() in supabase.ts has resolved
        try {
            const { data: { session } } = await db.public.auth.getSession();
            if (session?.access_token) {
                db.public.realtime.setAuth(session.access_token);
                console.log('[DMStore] ✅ Realtime auth token set before subscription');
            } else {
                console.warn('[DMStore] ⚠️ No session token available, subscription may fail');
            }
        } catch (e) {
            console.warn('[DMStore] Error getting session for realtime auth:', e);
        }

        console.log(`[DMStore] 📡 Attempting Global Inbox Subscription (v4) for: ${user.id}`);

        // MUST use db.public (the main client) for channel/removeChannel
        // but we filter for 'social_media_schema' inside the .on()
        const channel = db.public
            .channel(`realtime_inbox:${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'social_media_schema',
                    table: 'dm_messages',
                },
                async (payload: { new: ChatMessage }) => {
                    console.log('[DMStore] 📨 Realtime Message arrived:', payload.new.id);
                    const newMessage = payload.new;

                    // 1. Update Message Cache for ALL incoming messages
                    set(state => {
                        const conversationId = newMessage.conversation_id;
                        const currentMsgs = state.messages[conversationId] || [];
                        if (currentMsgs.find(m => m.id === newMessage.id)) return state;

                        return {
                            messages: {
                                ...state.messages,
                                [conversationId]: [newMessage, ...currentMsgs]
                            }
                        };
                    });

                    // 2. Ignore our own messages for Banners and Sounds
                    if (newMessage.sender_id === user.id) return;

                    const conversations = get().conversations;
                    const existingConvo = conversations.find(c => c.id === newMessage.conversation_id);

                    if (existingConvo) {
                        const senderName = existingConvo.participants?.[0]?.username || 'New Message';
                        const avatar = existingConvo.participants?.[0]?.avatar_path;
                        const nextUnreadCount = (existingConvo.unread_count || 0) + 1;

                        const isAppActive = AppState.currentState === 'active';
                        const isChatActive = get().activeConversationId === newMessage.conversation_id && isAppActive;

                        if (!isChatActive) {
                            playReceiveSound();

                            if (isAppActive) {
                                // 1. In-app banner (MessageNotificationStore) - ONLY when app is open
                                useMessageNotificationStore.getState().showNotification({
                                    senderName,
                                    content: newMessage.content,
                                    avatar: avatar ? { uri: avatar } : undefined,
                                    conversationId: newMessage.conversation_id,
                                });
                                useInboxStore.getState().addNotification({
                                    kind: 'chat',
                                    title: senderName,
                                    body: newMessage.content,
                                    avatarUri: avatar,
                                    groupKey: `chat:${newMessage.conversation_id}`,
                                    navigationTarget: {
                                        name: 'MessageDetail',
                                        params: {
                                            id: newMessage.conversation_id,
                                            name: senderName,
                                            avatar: avatar ? { uri: avatar } : require('../../assets/images/Profilbild.jpg'),
                                            userId: newMessage.sender_id,
                                        },
                                    },
                                });
                            } else {
                                // 2. OS Push Notification (NotificationService) - ONLY when app is background/closed
                                NotificationService.sendNotification(
                                    senderName,
                                    newMessage.content,
                                    'chat',
                                    {
                                        conversationId: newMessage.conversation_id,
                                        senderName,
                                        senderAvatar: avatar,
                                        senderUserId: newMessage.sender_id
                                    }
                                );
                            }
                        } else {
                            playReceiveSound();
                        }

                        const updatedConvo = {
                            ...existingConvo,
                            unread_count: isChatActive ? existingConvo.unread_count : nextUnreadCount,
                            last_message: newMessage,
                            updated_at: newMessage.created_at
                        };
                        get().upsertConversation(updatedConvo);
                    } else {
                        get().fetchConversations();
                    }
                }
            )
            // 🔔 Follow Notifications: Listen for new follows targeting this user
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'social_media_schema',
                    table: 'follows',
                },
                async (payload: any) => {
                    console.log('[DMStore] 🔔 FOLLOW EVENT RAW PAYLOAD:', JSON.stringify(payload));
                    const follow = payload.new;

                    if (!follow || !follow.following_id) {
                        console.warn('[DMStore] ⚠️ Follow payload missing data:', follow);
                        return;
                    }

                    // Only care about follows where WE are the one being followed
                    if (follow.following_id !== user.id) return;

                    console.log('[DMStore] 🔔 New follower detected:', follow.follower_id);

                    const isAppActive = AppState.currentState === 'active';

                    let followerName = 'Someone';
                    let followerAvatar: string | undefined;

                    // WARNING: Do NOT do async DB fetches in the background on React Native.
                    // The thread often freezes or crashes, which silently kills the notification.
                    // Only fetch avatar/name if the app is actually open.
                    if (isAppActive) {
                        try {
                            const { data: followerData } = await db.user
                                .from('Users')
                                .select('username, avatar_path')
                                .eq('id', follow.follower_id)
                                .single();
                                
                            if (followerData) {
                                followerName = followerData.username || 'Someone';
                                if (followerData.avatar_path) {
                                    if (followerData.avatar_path.startsWith('http')) {
                                        followerAvatar = followerData.avatar_path;
                                    } else {
                                        const { data: urlData } = db.public.storage.from('avatar').getPublicUrl(followerData.avatar_path);
                                        followerAvatar = urlData.publicUrl;
                                    }
                                }
                            }
                        } catch (e) {
                            console.warn('[DMStore] Could not fetch follower info:', e);
                        }

                        // In-app banner
                        useMessageNotificationStore.getState().showNotification({
                            senderName: 'New Follower 🌱',
                            content: `${followerName} is now following you!`,
                            avatar: followerAvatar ? { uri: followerAvatar } : undefined,
                            userId: follow.follower_id,
                            type: 'follow',
                        });
                        useInboxStore.getState().addNotification({
                            kind: 'follow',
                            title: 'New Follower',
                            body: `${followerName} is now following you!`,
                            avatarUri: followerAvatar,
                            groupKey: `follow:${follow.follower_id}`,
                            navigationTarget: {
                                name: 'PublicProfile',
                                params: { userId: follow.follower_id },
                            },
                        });
                    } else {
                        // OS Push Notification (Background)
                        // Trigger IMMEDIATELY without async DB calls
                        NotificationService.sendNotification(
                            'New Follower 🌱',
                            'Someone is now following you!',
                            'general',
                            {
                                category: 'follow',
                                followerId: follow.follower_id,
                                followerName: 'Someone',
                            }
                        );
                    }
                }
            )
            .subscribe((status, err) => {
                console.log('[DMStore] Inbox subscription status:', status);
                if (err) {
                    ErrorHandlerService.handle(err, { showUI: false });
                }

                if (err || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.warn(`[DMStore] 📡 Connection issue (${status}). Retrying...`);
                    set({ inboxStatus: 'RECONNECTING' });

                    if (retryTimeout) clearTimeout(retryTimeout);
                    const jitter = Math.random() * 1000;
                    retryTimeout = setTimeout(() => {
                        get().subscribeToInbox();
                    }, 2500 + jitter);
                }

                if (status === 'SUBSCRIBED') {
                    console.log('[DMStore] ✅ Successfully subscribed to inbox for user:', user.id);
                } else if (status === 'CLOSED') {
                    console.log('[DMStore] ❌ Inbox subscription closed');
                } else if (status === 'CHANNEL_ERROR') {
                    ErrorHandlerService.handle(new Error('Inbox subscription channel error'), { showUI: false });
                }
            });

        inboxChannels = [channel];
    },

    unsubscribeFromInbox: () => {
        if (inboxChannels.length > 0) {
            console.log('[DMStore] Closing Inbox Channels');
            inboxChannels.forEach(ch => db.public.removeChannel(ch));
            inboxChannels = [];
            set({ inboxStatus: 'DISCONNECTED', chatStatus: 'DISCONNECTED' });
        }
    },

    getChannelStatuses: () => {
        return {
            inbox: get().inboxStatus,
            chat: get().chatStatus
        };
    },

    handleNewInboxMessage: (newMessage: ChatMessage) => {
        // Deprecated/Unused with new logic but kept for interface compatibility if needed, 
        // or effectively no-op if we don't call it. 
        // The new logic uses upsertConversation handles reordering via the conversation update.
    }

}));
