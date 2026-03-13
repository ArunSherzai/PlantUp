import { useEffect, useState, useCallback } from 'react';
import { db } from '../utils/supabase';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';

export interface Post {
    id: string;
    media_url: string;
    caption: string | null;
    type: string | null;
    likes: number | null;
    created_at: string;
    user_id: string;
    is_blocked?: boolean;
    Users?: {
        username: string;
        profile_image: string | null;
    }
}

import { useUserStore } from '../stores/UserStore';

export function useFeed() {
    const { user } = useUserStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);

            // 0. Fetch Blocked Posts
            let blockedPostIds: Set<string> = new Set();
            if (user?.id) {
                const { data: blockedData } = await db.social
                    .from('Block_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                
                if (blockedData) {
                    blockedData.forEach((b: any) => blockedPostIds.add(b.post_id));
                }
            }

            // 1. Fetch Posts
            const { data: postsData, error: postsError } = await db.social
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false });

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setPosts([]);
                return;
            }

            // 2. Extract User IDs
            const userIds = [...new Set(postsData.map((p: any) => p.user_id))];

            // 3. Fetch Users
            // Note: Users table is in user_schema
            const { data: usersData, error: usersError } = await db.user
                .from('Users')
                .select('id, username, avatar_path')
                .in('id', userIds);

            if (usersError) {
                ErrorHandlerService.handle(usersError, { showUI: false });
                // Proceed with posts but no user info
            }

            // 4. Merge
            const usersMap = new Map();
            usersData?.forEach((u: any) => usersMap.set(u.id, u));

            const mergedPosts = postsData.map((post: any) => {
                const user = usersMap.get(post.user_id);
                let profileImageUrl = null;

                if (user?.avatar_path) {
                    if (user.avatar_path.startsWith('http')) {
                        profileImageUrl = user.avatar_path;
                    } else {
                        const { data } = db.public.storage
                            .from('avatar')
                            .getPublicUrl(user.avatar_path);
                        profileImageUrl = data.publicUrl;
                    }
                }

                return {
                    ...post,
                    is_blocked: blockedPostIds.has(post.id),
                    Users: user ? {
                        username: user.username,
                        profile_image: profileImageUrl
                    } : undefined
                };
            });

            setPosts(mergedPosts);
            setError(null);

        } catch (err: any) {
            ErrorHandlerService.handle(err, { showUI: false });
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const refreshFeed = useCallback(() => fetchPosts(), [fetchPosts]);

    return { posts, loading, error, refreshFeed };
}
