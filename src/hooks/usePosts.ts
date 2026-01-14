import { useEffect, useState, useCallback } from 'react';
import { db } from '../utils/supabase';
import { getPublicPostUrl } from '../utils/media';

export interface Post {
    id: string;
    media_url: string;
    caption: string | null;
    type: string | null;
    likes: number | null;
    created_at: string;
    user_id: string;
    is_blocked?: boolean; // New field
    Users?: {
        username: string;
        profile_image: string | null;
    }
}

interface UsePostsOptions {
    userId?: string;
    likedBy?: string;
}

import { useUserStore } from '../stores/UserStore';

export function usePosts(options?: UsePostsOptions) {
    const { user } = useUserStore();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosts = useCallback(async () => {
        try {
            setLoading(true);

            // 0. Fetch Blocked Posts (individual post blocks)
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

            // 0b. Fetch Blocked Users (users I blocked or who blocked me)
            // We can rely on UserStore for 'users I blocked', but for 'who blocked me' we might need a check
            // For now, let's grab the IDs of everyone involved in a block with me
            let blockedUserSet: Set<string> = new Set();
            if (user?.id) {
                 const { data: blockData, error: blockError } = await db.social
                    .from('user_blocks')
                    .select('blocker_id, blocked_id')
                    .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
                
                if (blockData) {
                    blockData.forEach((b: any) => {
                       if (b.blocker_id === user.id) blockedUserSet.add(b.blocked_id);
                       if (b.blocked_id === user.id) blockedUserSet.add(b.blocker_id);
                    });
                }
            }


            let query = db.social
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false });

            // Filter 1: My Posts
            if (options?.userId) {
                // Pre-check: if I am blocked by or have blocked this user, return empty immediately
                if (blockedUserSet.has(options.userId)) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }
                query = query.eq('user_id', options.userId);
            }

            // Filter 2: Liked By User
            if (options?.likedBy) {
                // If I'm blocked by this user, maybe I can't see their likes? Let's be permissive here unless critical.
                
                // 1. Get IDs of posts liked by this user
                const { data: interactionData, error: interactionError } = await db.social
                    .from('post_interactions')
                    .select('post_id')
                    .eq('user_id', options.likedBy)
                    .eq('interaction_type', 'like');

                if (interactionError) throw interactionError;

                if (!interactionData || interactionData.length === 0) {
                    setPosts([]);
                    setLoading(false);
                    return;
                }

                const likedPostIds = interactionData.map((i: any) => i.post_id);
                query = query.in('id', likedPostIds);
            }

            // Execute Query
            const { data: postsData, error: postsError } = await query;

            if (postsError) throw postsError;

            if (!postsData || postsData.length === 0) {
                setPosts([]);
                return;
            }

            // Client-side filtering for Global Feed or other lists where userId wasn't pre-filtered
            // Filter out posts from blocked users
            const filteredPostsData = postsData.filter((p: any) => !blockedUserSet.has(p.user_id));

            if (filteredPostsData.length === 0) {
                setPosts([]);
                return;
            }

            // 2. Extract User IDs to fetch authors
            const userIds = [...new Set(filteredPostsData.map((p: any) => p.user_id))];

            // 3. Fetch Users
            // Note: Users table is in user_schema
            const { data: usersData, error: usersError } = await db.user
                .from('Users')
                .select('id, username, avatar_path') // Added avatar_path
                .in('id', userIds);

            if (usersError) {
                console.error('Error fetching users for feed:', usersError);
                // Proceed with posts but no user info
            }

            // 4. Merge
            const usersMap = new Map();
            usersData?.forEach((u: any) => usersMap.set(u.id, u));

            const mergedPosts = filteredPostsData.map((post: any) => {
                const user = usersMap.get(post.user_id);
                let profileImageUrl = null;

                if (user?.avatar_path) {

                    const { data } = db.public.storage.from('avatar').getPublicUrl(user.avatar_path);
                    profileImageUrl = data.publicUrl;


                }

                return {
                    ...post,
                    media_url: getPublicPostUrl(post.media_url),
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
            console.error('Error fetching posts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [options?.userId, options?.likedBy, user?.id]);

    useEffect(() => {
        fetchPosts();
    }, [fetchPosts]);

    const refreshPosts = useCallback(() => fetchPosts(), [fetchPosts]);

    return { posts, loading, error, refreshPosts };
}
