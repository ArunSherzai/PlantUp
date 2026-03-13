import { useState, useEffect, useCallback } from 'react';
import { db } from '../../../utils/supabase';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

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

    const fetchProfile = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            // 1. Fetch Gamification Stats
            const statsPromise = db.gamification
                .from('Player_stats')
                .select('xp, level')
                .eq('user_id', userId)
                .maybeSingle();

            // 2. Fetch User Data
            const userPromise = db.user
                .from('Users')
                .select('username, plant_coins, avatar_path, bio')
                .eq('id', userId)
                .single();

            // 3. Robust Fetch Title
            const titlePromise = db.gamification
                .from('User_titles')
                .select('selected, Titles (titlename, color)')
                .eq('userid', userId)
                .eq('selected', true)
                .limit(1);

            // 4. Robust Fetch Border
            // First get the equipped border ID
            const { data: equippedBorderRef, error: borderRefError } = await db.gamification
                .from('User_owned_border')
                .select('border_id')
                .eq('user_id', userId)
                .eq('is_equipped', true)
                .maybeSingle();

            console.log('[useUserProfile] Border ref for', userId, ':', equippedBorderRef, 'error:', borderRefError);

            let borderResultData = null;
            if (equippedBorderRef?.border_id) {
                const { data: borderDetails, error: borderDetailsError } = await db.gamification
                    .from('Cosmetic_avatar_borders')
                    .select('*')
                    .eq('id', equippedBorderRef.border_id)
                    .maybeSingle();
                console.log('[useUserProfile] Border details:', borderDetails, 'error:', borderDetailsError);
                borderResultData = borderDetails;
            }

            const [statsResult, userResult, titleResult] = await Promise.all([statsPromise, userPromise, titlePromise]);

            const statsData = statsResult.data;
            const userData = userResult.data;
            
            // Fetch returns array because we used limit(1)
            const titleData = titleResult.data && titleResult.data.length > 0 ? titleResult.data[0] : null;
            const titleInfo = titleData?.Titles as any;
            
            console.log('[useUserProfile] Fetching Title for', userId, 'Result:', JSON.stringify(titleResult.data));

            // Process Border
            let equippedBorderData = borderResultData;
            if (equippedBorderData && equippedBorderData.media_url) {
                let mediaPath = equippedBorderData.media_url;
                // Legacy fix for seasonal folders if needed
                if (mediaPath.includes('seasonal_summer') || mediaPath.includes('seasonal_winter')) {
                    mediaPath = mediaPath.replace('seasonal_summer', 'seasonal').replace('seasonal_winter', 'seasonal');
                }

                if (!mediaPath.startsWith('http')) {
                    const { data } = db.public.storage.from('border-skins').getPublicUrl(mediaPath);
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

                const actualTitle = Array.isArray(titleInfo) ? titleInfo[0] : titleInfo;

                setProfile({
                    id: userId,
                    username: userData?.username || 'Gardener',
                    plant_coins: userData?.plant_coins || 0,
                    xp: statsData?.xp || 0,
                    level: statsData?.level || 1,
                    profile_image: profileImageUrl,
                    bio: userData?.bio || '',
                    title: actualTitle?.titlename || '',
                    titlecolor: actualTitle?.color || '#000',
                    equipped_border: equippedBorderData ? {
                        id: equippedBorderData.id,
                        media_url: equippedBorderData.media_url,
                        name: equippedBorderData.name
                    } : undefined
                });
            } catch (error) {
                ErrorHandlerService.handle(error, { showUI: false });
            } finally {
                setLoading(false);
            }

            const actualTitle = Array.isArray(titleInfo) ? titleInfo[0] : titleInfo;

            setProfile({
                id: userId,
                username: userData?.username || 'Gardener',
                plant_coins: userData?.plant_coins || 0,
                xp: statsData?.xp || 0,
                level: statsData?.level || 1,
                profile_image: profileImageUrl,
                bio: userData?.bio || '',
                title: actualTitle?.titlename || '',
                titlecolor: actualTitle?.color || '#000',
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
    }, [userId]);

    useEffect(() => {
        fetchProfile();
    }, [userId]);

    return { profile, loading, refreshProfile: fetchProfile };
}
