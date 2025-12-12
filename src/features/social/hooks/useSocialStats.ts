import { useEffect, useState } from 'react';
import { db } from '../../../utils/supabase';

export function useSocialStats(userId: string | undefined) {
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [friendsCount, setFriendsCount] = useState(0);

    const fetchStats = async () => {
        if (!userId) return;

        try {
            // 1. Fetch Followers: People who follow ME (following_id = me)
            const { data: followers, error: followersError } = await db.social
                .from('follows')
                .select('follower_id')
                .eq('following_id', userId);

            if (followersError) throw followersError;

            // 2. Fetch Following: People I follow (follower_id = me)
            const { data: following, error: followingError } = await db.social
                .from('follows')
                .select('following_id')
                .eq('follower_id', userId);

            if (followingError) throw followingError;

            const followerIds = new Set(followers?.map((f) => f.follower_id));
            const followingIds = new Set(following?.map((f) => f.following_id));

            // 3. Followers Count
            setFollowersCount(followerIds.size);

            // 4. Friends (Mutuals) Count: Intersection
            let mutuals = 0;
            followerIds.forEach((id) => {
                if (followingIds.has(id)) {
                    mutuals++;
                }
            });
            // 5. Following Count
            setFollowingCount(followingIds.size);

            setFriendsCount(mutuals);

        } catch (error) {
            console.error('Error fetching social stats:', error);
        }
    };

    useEffect(() => {
        fetchStats();
    }, [userId]);

    return { followersCount, followingCount, friendsCount, refreshStats: fetchStats };
}
