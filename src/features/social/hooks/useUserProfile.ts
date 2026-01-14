import { useState, useEffect } from 'react';
import { db } from '../../../utils/supabase';

export type UserProfileData = {
    id: string;
    username: string;
    plant_coins: number;
    xp: number;
    level: number;
    profile_image?: string;
    bio?: string; // Add bio while we are at it
    title?: string; // Add title while we are at it
    titlecolor?: string;
    equipped_border?: {
        id: string;
        media_url: string;
        name: string;
    };
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
                    .select('username, plant_coins, avatar_path, bio') // Fetch avatar_path AND bio
                    .eq('id', userId)
                    .single();

                // 3. Fetch Title
                const titlePromise = db.gamification
                    .from('User_titles')
                    .select('selected, Titles (titlename, color)')
                    .eq('userid', userId)
                    .eq('selected', true)
                    .maybeSingle();

                // 4. Fetch Equipped Border
                const borderPromise = db.gamification
                    .from('User_owned_border')
                    .select('is_equipped, Cosmetic_avatar_borders (*)')
                    .eq('user_id', userId)
                    .eq('is_equipped', true)
                    .maybeSingle();

                const [statsResult, userResult, titleResult, borderResult] = await Promise.all([statsPromise, userPromise, titlePromise, borderPromise]);

                const statsData = statsResult.data;
                const userData = userResult.data;
                const titleInfo = titleResult.data?.Titles as any;

                // Process Border
                let equippedBorderData = borderResult.data?.Cosmetic_avatar_borders as any;
                if (equippedBorderData && equippedBorderData.media_url) {
                    let mediaPath = equippedBorderData.media_url;
                    // Legacy fix for seasonal folders if needed
                    if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
                        mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
                    }

                    if (!mediaPath.startsWith('http')) {
                        const { data } = db.public.storage.from('app-assets').getPublicUrl(mediaPath);
                        equippedBorderData.media_url = data.publicUrl;
                    }
                }

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
                    // New fields
                    bio: userData?.bio || '',
                    title: titleInfo?.titlename || '',
                    titlecolor: titleInfo?.color || '#000',
                    equipped_border: equippedBorderData ? {
                        id: equippedBorderData.id,
                        media_url: equippedBorderData.media_url,
                        name: equippedBorderData.name
                    } : undefined
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
