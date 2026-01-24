import { create } from 'zustand';
import { db } from '../utils/supabase';
import { useUserStore } from './UserStore';
import { getAvatarSource } from '../utils/avatarUtils';
import { MENTOR_MIN_LEVEL, MENTOR_MIN_POSTS } from '../utils/mentorUtils';

export interface Mentor {
    id: string;
    username: string;
    avatar_path: string | null;
    level: number;
    xp: number;
    post_count: number;
    bio?: string;
}

export interface MentorRequest {
    id: string;
    sender_id: string;
    mentor_id: string;
    status: 'pending' | 'accepted' | 'rejected';
    message: string | null;
    created_at: string;
    updated_at: string;
    // Joined data
    sender_username?: string;
    sender_avatar_path?: string | null;
    mentor_username?: string;
    mentor_avatar_path?: string | null;
}

interface MentorState {
    mentors: Mentor[];
    incomingRequests: MentorRequest[];
    outgoingRequests: MentorRequest[];
    loading: boolean;

    fetchMentors: () => Promise<void>;
    sendRequest: (mentorId: string, message?: string) => Promise<boolean>;
    acceptRequest: (requestId: string) => Promise<boolean>;
    rejectRequest: (requestId: string) => Promise<boolean>;
    fetchIncomingRequests: () => Promise<void>;
    fetchOutgoingRequests: () => Promise<void>;
    getRequestStatus: (mentorId: string) => 'none' | 'pending' | 'accepted' | 'rejected';
}

export const useMentorStore = create<MentorState>((set, get) => ({
    mentors: [],
    incomingRequests: [],
    outgoingRequests: [],
    loading: false,

    fetchMentors: async () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        set({ loading: true });

        try {
            // 1. Fetch users with level >= 25 from gamification.Player_stats
            const { data: stats, error: statsError } = await db.gamification
                .from('Player_stats')
                .select('user_id, xp, level')
                .gte('level', MENTOR_MIN_LEVEL);

            console.log('[MentorStore] Player_stats query result:', { stats, statsError });

            if (statsError) throw statsError;

            if (!stats || stats.length === 0) {
                console.log('[MentorStore] No users found with level >=', MENTOR_MIN_LEVEL);
                set({ mentors: [], loading: false });
                return;
            }

            // Filter out current user
            const filteredStats = stats.filter(s => s.user_id !== user.id);
            const userIds = filteredStats.map(s => s.user_id);

            if (userIds.length === 0) {
                set({ mentors: [], loading: false });
                return;
            }

            // 2. Fetch user details from Users table
            const { data: users, error: usersError } = await db.user
                .from('Users')
                .select('id, username, avatar_path, bio')
                .in('id', userIds);

            if (usersError) throw usersError;

            // Create user map for quick lookup
            const userMap: Record<string, any> = {};
            users?.forEach(u => { userMap[u.id] = u; });

            // 3. Fetch post counts for these users
            const { data: postCounts, error: postError } = await db.social
                .from('Posts')
                .select('user_id')
                .in('user_id', userIds);

            if (postError) throw postError;

            // Count posts per user
            const postCountMap: Record<string, number> = {};
            postCounts?.forEach((p: any) => {
                postCountMap[p.user_id] = (postCountMap[p.user_id] || 0) + 1;
            });

            // 4. Build mentor list - filter to users with >= 5 posts
            const mentors: Mentor[] = filteredStats
                .filter(s => (postCountMap[s.user_id] || 0) >= MENTOR_MIN_POSTS)
                .filter(s => userMap[s.user_id]) // Ensure user data exists
                .map(s => ({
                    id: s.user_id,
                    username: userMap[s.user_id]?.username || 'Unknown',
                    avatar_path: userMap[s.user_id]?.avatar_path || null,
                    level: s.level,
                    xp: s.xp,
                    post_count: postCountMap[s.user_id] || 0,
                    bio: userMap[s.user_id]?.bio,
                }));

            set({ mentors, loading: false });
        } catch (e) {
            console.error('[MentorStore] Error fetching mentors:', e);
            set({ loading: false });
        }
    },

    sendRequest: async (mentorId: string, message?: string) => {
        const user = useUserStore.getState().user;
        if (!user) return false;

        try {
            const { error } = await db.social
                .from('mentor_requests')
                .insert({
                    sender_id: user.id,
                    mentor_id: mentorId,
                    message: message || null,
                    status: 'pending',
                });

            if (error) {
                // Check for duplicate
                if (error.code === '23505') {
                    console.warn('[MentorStore] Request already exists');
                } else {
                    console.error('[MentorStore] Error sending request:', error);
                }
                return false;
            }

            // Refresh outgoing requests
            await get().fetchOutgoingRequests();
            return true;
        } catch (e) {
            console.error('[MentorStore] Exception sending request:', e);
            return false;
        }
    },

    acceptRequest: async (requestId: string) => {
        try {
            const { error } = await db.social
                .from('mentor_requests')
                .update({ status: 'accepted', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) {
                console.error('[MentorStore] Error accepting request:', error);
                return false;
            }

            // Refresh incoming requests
            await get().fetchIncomingRequests();
            return true;
        } catch (e) {
            console.error('[MentorStore] Exception accepting request:', e);
            return false;
        }
    },

    rejectRequest: async (requestId: string) => {
        try {
            const { error } = await db.social
                .from('mentor_requests')
                .update({ status: 'rejected', updated_at: new Date().toISOString() })
                .eq('id', requestId);

            if (error) {
                console.error('[MentorStore] Error rejecting request:', error);
                return false;
            }

            // Refresh incoming requests
            await get().fetchIncomingRequests();
            return true;
        } catch (e) {
            console.error('[MentorStore] Exception rejecting request:', e);
            return false;
        }
    },

    fetchIncomingRequests: async () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        try {
            const { data, error } = await db.social
                .from('mentor_requests')
                .select('*')
                .eq('mentor_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                set({ incomingRequests: [] });
                return;
            }

            // Fetch sender info
            const senderIds = [...new Set(data.map(r => r.sender_id))];
            const { data: senders } = await db.user
                .from('Users')
                .select('id, username, avatar_path')
                .in('id', senderIds);

            const senderMap: Record<string, any> = {};
            senders?.forEach(s => { senderMap[s.id] = s; });

            const requests: MentorRequest[] = data.map(r => ({
                ...r,
                sender_username: senderMap[r.sender_id]?.username,
                sender_avatar_path: senderMap[r.sender_id]?.avatar_path,
            }));

            set({ incomingRequests: requests });
        } catch (e) {
            console.error('[MentorStore] Error fetching incoming requests:', e);
        }
    },

    fetchOutgoingRequests: async () => {
        const user = useUserStore.getState().user;
        if (!user) return;

        try {
            const { data, error } = await db.social
                .from('mentor_requests')
                .select('*')
                .eq('sender_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!data || data.length === 0) {
                set({ outgoingRequests: [] });
                return;
            }

            // Fetch mentor info
            const mentorIds = [...new Set(data.map(r => r.mentor_id))];
            const { data: mentors } = await db.user
                .from('Users')
                .select('id, username, avatar_path')
                .in('id', mentorIds);

            const mentorMap: Record<string, any> = {};
            mentors?.forEach(m => { mentorMap[m.id] = m; });

            const requests: MentorRequest[] = data.map(r => ({
                ...r,
                mentor_username: mentorMap[r.mentor_id]?.username,
                mentor_avatar_path: mentorMap[r.mentor_id]?.avatar_path,
            }));

            set({ outgoingRequests: requests });
        } catch (e) {
            console.error('[MentorStore] Error fetching outgoing requests:', e);
        }
    },

    getRequestStatus: (mentorId: string) => {
        const { outgoingRequests } = get();
        const request = outgoingRequests.find(r => r.mentor_id === mentorId);
        return request ? request.status : 'none';
    },
}));
