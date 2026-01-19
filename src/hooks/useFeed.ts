import { useEffect, useState, useCallback } from 'react';
import { db } from '../utils/supabase';

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

            // Fetch Recommended Feed via RPC (already handles blocking)
            const { data: postsData, error: postsError } = await db.social
                .rpc('get_recommended_feed', { p_limit: 20, p_offset: 0 });

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setPosts([]);
                return;
            }

            const mergedPosts = postsData.map((post: any) => {
                const user = post.Users; // JSON object from RPC
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
                    is_blocked: false, // RPC excludes blocked posts
                    Users: user ? {
                        username: user.username,
                        profile_image: profileImageUrl
                    } : undefined
                };
            });

            setPosts(mergedPosts);
            setError(null);

        } catch (err: any) {
            console.error('Error fetching feed:', err);
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
