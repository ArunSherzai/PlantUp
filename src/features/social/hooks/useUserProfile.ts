import { useState, useEffect } from 'react';
import { db } from '../../../utils/supabase';

export type UserProfileData = {
    id: string;
    username: string;
    plant_coins: number;
    xp: number;
    level: number;
    profile_image?: string;
};

export function useUserProfile(userId: string | undefined) {
    const [profile, setProfile] = useState<UserProfileData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const fetchProfile = async () => {
            setLoading(true);
            try {
                // 1. Fetch Gamification Stats
                const statsPromise = db.gamification
                    .from('player_stats')
                    .select('xp, level')
                    .eq('user_id', userId)
                    .single();

                // 2. Fetch User Data
                const userPromise = db.user
                    .from('Users')
                    .select('username, plant_coins, avatar_path') // Fetch avatar_path
                    .eq('id', userId)
                    .single();

                const [statsResult, userResult] = await Promise.all([statsPromise, userPromise]);

                const statsData = statsResult.data;
                const userData = userResult.data;

                // Generate Signed URL for Avatar if path exists
                let profileImageUrl = undefined;
                if (userData?.avatar_path) {
                    if (userData.avatar_path.startsWith('http')) {
                        profileImageUrl = userData.avatar_path;
                    } else {
                        const { data } = db.public.storage
                            .from('avatar')
                            .getPublicUrl(userData.avatar_path);
                        profileImageUrl = data.publicUrl;
                    }
                }

                setProfile({
                    id: userId,
                    username: userData?.username || 'Gardener',
                    plant_coins: userData?.plant_coins || 0,
                    xp: statsData?.xp || 0,
                    level: statsData?.level || 1,
                    profile_image: profileImageUrl,
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [userId]);

    return { profile, loading };
}
