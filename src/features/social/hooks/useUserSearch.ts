import { useState } from 'react';
import { db } from '../../../utils/supabase';

export type SearchUser = {
    id: string;
    username: string;
    plant_coins: number;
    // We will augment these with separate fetches or joins if possible
    level?: number;
    followers_count?: number;
    profile_image?: string;
};

export function useUserSearch() {
    const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
    const [loading, setLoading] = useState(false);

    const searchUsers = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            return;
        }

        setLoading(true);
        try {
            // 1. Search Users
            const { data: users, error } = await db.user
                .from('Users')
                .select('id, username, plant_coins, avatar_path')
                .ilike('username', `%${query}%`)
                .limit(20);

            if (error) throw error;

            if (!users || users.length === 0) {
                setSearchResults([]);
                setLoading(false);
                return;
            }

            // 2. Enrich with Level (player_stats) and Followers Count
            const enrichedUsers = await Promise.all(users.map(async (user) => {
                // Fetch Level
                const { data: stats } = await db.gamification
                    .from('player_stats')
                    .select('level')
                    .eq('user_id', user.id)
                    .single();

                // Fetch Followers Count
                const { count } = await db.social
                    .from('follows')
                    .select('*', { count: 'exact', head: true })
                    .eq('following_id', user.id);

                // Generate Profile Image URL
                let profileImageUrl = undefined;
                if (user.avatar_path) {
                    if (user.avatar_path.startsWith('http')) {
                        profileImageUrl = user.avatar_path;
                    } else {
                        const { data } = db.public.storage.from('avatar').getPublicUrl(user.avatar_path);
                        profileImageUrl = data.publicUrl;
                    }
                }

                return {
                    ...user,
                    level: stats?.level || 1,
                    followers_count: count || 0,
                    profile_image: profileImageUrl
                };
            }));

            setSearchResults(enrichedUsers);
        } catch (error) {
            console.error('Error searching users:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchResults([]);
    };

    return { searchResults, loading, searchUsers, clearSearch };
}
