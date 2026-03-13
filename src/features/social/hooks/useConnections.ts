import { useEffect, useState } from 'react';
import { db } from '../../../utils/supabase';
import { useUserStore } from '../../../stores/UserStore';
import { ErrorHandlerService } from '~/core/error/services/ErrorHandlerService';

export type ConnectionUser = {
    id: string;
    username: string;
    full_name?: string; // Optional if not in schema
    avatar_url?: string; // Optional
};

export function useConnections(targetUserId?: string) {
    const { user } = useUserStore();
    const [followers, setFollowers] = useState<ConnectionUser[]>([]);
    const [following, setFollowing] = useState<ConnectionUser[]>([]);
    const [loading, setLoading] = useState(false);

    const activeUserId = targetUserId || user?.id;

    const fetchConnections = async () => {
        if (!user || !activeUserId) return;
        setLoading(true);
        try {
            // 1. Fetch Followers (people who follow activeUserId)
            // Manual Fetch Strategy for safety:
            // Get IDs -> Fetch Users

            // RE-FETCHING PURE IDS
            const { data: rawFollowers } = await db.social.from('follows').select('follower_id').eq('following_id', activeUserId);
            const followerIds = rawFollowers?.map(f => f.follower_id) || [];

            let followersList: ConnectionUser[] = [];
            if (followerIds.length > 0) {
                const { data: usersData } = await db.user.from('Users').select('id, username, avatar_path').in('id', followerIds);
                followersList = usersData?.map(u => {
                    let avatarUrl = undefined;
                    if (u.avatar_path) {
                        if (u.avatar_path.startsWith('http')) {
                            avatarUrl = u.avatar_path;
                        } else {
                            const { data } = db.public.storage.from('avatar').getPublicUrl(u.avatar_path);
                            avatarUrl = data.publicUrl;
                        }
                    }
                    return {
                        id: u.id,
                        username: u.username,
                        avatar_url: avatarUrl
                    };
                }) || [];
            }
            setFollowers(followersList);

            // 2. Fetch Following (people activeUserId follows)
            const { data: rawFollowing } = await db.social.from('follows').select('following_id').eq('follower_id', activeUserId);
            const followingIds = rawFollowing?.map(f => f.following_id) || [];

            let followingList: ConnectionUser[] = [];
            if (followingIds.length > 0) {
                const { data: usersData } = await db.user.from('Users').select('id, username, avatar_path').in('id', followingIds);
                followingList = usersData?.map(u => {
                    let avatarUrl = undefined;
                    if (u.avatar_path) {
                        if (u.avatar_path.startsWith('http')) {
                            avatarUrl = u.avatar_path;
                        } else {
                            const { data } = db.public.storage.from('avatar').getPublicUrl(u.avatar_path);
                            avatarUrl = data.publicUrl;
                        }
                    }
                    return {
                        id: u.id,
                        username: u.username,
                        avatar_url: avatarUrl
                    };
                }) || [];
            }
            setFollowing(followingList);

        } catch (error) {
            ErrorHandlerService.handle(error, { showUI: false });
        } finally {
            setLoading(false);
        }
    };

    const followUser = async (targetId: string) => {
        if (!user) return;
        try {
            const { error } = await db.social.from('follows').insert({
                follower_id: user.id,
                following_id: targetId
            });
            if (error) throw error;
            await fetchConnections();
        } catch (error) {
            ErrorHandlerService.handle(error, { showUI: false });
        }
    };

    const unfollowUser = async (targetId: string) => {
        if (!user) return;
        try {
            const { error } = await db.social.from('follows').delete().match({
                follower_id: user.id,
                following_id: targetId
            });
            if (error) throw error;
            await fetchConnections();
        } catch (error) {
            ErrorHandlerService.handle(error, { showUI: false });
        }
    };

    useEffect(() => {
        fetchConnections();
    }, [user, activeUserId]);

    return { followers, following, loading, refreshConnections: fetchConnections, followUser, unfollowUser };
}
