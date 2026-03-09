import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../utils/supabase';
import { getPublicPostUrl } from '../utils/media';
import { useUserStore } from '../stores/UserStore';

export interface FypPost {
    id: string;
    media_url: string;
    caption: string | null;
    type: string | null;
    likes: number | null;
    shares: number | null;
    comments_count: number | null;
    created_at: string;
    user_id: string;
    is_blocked?: boolean;
    fyp_score?: number;
    fyp_source?: string;
    Users?: {
        username: string;
        profile_image: string | null;
    };
}

export type FeedMode = 'fyp' | 'chronological';

/**
 * useFypFeed — Feed hook with FYP/chronological toggle.
 *
 * Features:
 * - Calls get_fyp_feed RPC for personalized recommendations
 * - Falls back to chronological if RPC unavailable
 * - Triggers background score refresh on each fetch
 * - Tracks seen posts to avoid reshowing within a session
 */
export function useFypFeed(initialMode: FeedMode = 'fyp') {
    const { user } = useUserStore();
    const [posts, setPosts] = useState<FypPost[]>([]);
    const [loading, setLoading] = useState(true);
    const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);

    // Track posts already seen this session to avoid duplicates
    const seenPostIds = useRef<Set<string>>(new Set());

    // Fire-and-forget: refresh FYP scores in the background
    const refreshScores = useCallback(async () => {
        if (!user?.id) return;
        try {
            await db.social.rpc('refresh_fyp_scores', { p_user_id: user.id });
        } catch {
            // Non-critical — scores will still work with incremental trigger updates
        }
    }, [user?.id]);

    const fetchPosts = useCallback(async (mode: FeedMode) => {
        try {
            setLoading(true);

            // Kick off score refresh in the background (non-blocking)
            refreshScores();

            // 1. Fetch blocked post IDs
            let blockedPostIds = new Set<string>();
            if (user?.id) {
                const { data: blockedData } = await db.social
                    .from('Block_posts')
                    .select('post_id')
                    .eq('user_id', user.id);
                if (blockedData) {
                    blockedData.forEach((b: any) => blockedPostIds.add(b.post_id));
                }
            }

            // 2. Fetch posts — try RPC for FYP mode, otherwise chronological
            let postsData: any[] | null = null;

            if (mode === 'fyp' && user?.id) {
                const { data, error: rpcError } = await db.social.rpc('get_fyp_feed', {
                    p_user_id: user.id,
                    p_limit: 50,
                    p_cursor: null,
                });

                if (!rpcError && data && data.length > 0) {
                    postsData = data;
                } else {
                    if (rpcError) {
                        console.warn('[FYP] RPC unavailable, using chronological:', rpcError.message);
                    }
                    // RPC failed or returned empty — fall through to chronological
                }
            }

            // Chronological fallback (or explicit chronological mode)
            if (!postsData) {
                const { data, error: postsError } = await db.social
                    .from('Posts')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (postsError) throw postsError;
                postsData = data;
            }

            if (!postsData || postsData.length === 0) {
                setPosts([]);
                setLoading(false);
                return;
            }

            // Filter out already-seen posts (for FYP mode pagination)
            postsData = postsData.filter((p: any) => {
                if (mode === 'fyp' && seenPostIds.current.has(p.id)) return false;
                return true;
            });

            if (postsData.length === 0) {
                setPosts([]);
                setLoading(false);
                return;
            }

            // Mark these posts as seen
            postsData.forEach((p: any) => seenPostIds.current.add(p.id));

            // 3. Fetch user data
            const userIds = [...new Set(postsData.map((p: any) => p.user_id))];
            const { data: usersData } = await db.user
                .from('Users')
                .select('id, username, avatar_path')
                .in('id', userIds);

            const usersMap = new Map();
            usersData?.forEach((u: any) => usersMap.set(u.id, u));

            // 4. Merge posts with user data
            const mergedPosts: FypPost[] = postsData.map((post: any) => {
                const postUser = usersMap.get(post.user_id);
                let profileImageUrl = null;

                if (postUser?.avatar_path) {
                    if (postUser.avatar_path.startsWith('http')) {
                        profileImageUrl = postUser.avatar_path;
                    } else {
                        const { data: urlData } = db.public.storage
                            .from('avatar')
                            .getPublicUrl(postUser.avatar_path);
                        profileImageUrl = urlData.publicUrl;
                    }
                }

                return {
                    ...post,
                    media_url: getPublicPostUrl(post.media_url) || post.media_url,
                    is_blocked: blockedPostIds.has(post.id),
                    fyp_score: post.fyp_score,
                    fyp_source: post.fyp_source,
                    Users: postUser
                        ? { username: postUser.username, profile_image: profileImageUrl }
                        : undefined,
                };
            });

            setPosts(mergedPosts);
        } catch (err: any) {
            console.error('[Feed] Fetch error:', err);
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [user?.id, refreshScores]);

    // Fetch on mount, when user changes, or when mode changes
    useEffect(() => {
        fetchPosts(feedMode);
    }, [fetchPosts, feedMode]);

    const refreshFeed = useCallback(() => {
        // Clear seen posts on explicit refresh so user gets fresh content
        seenPostIds.current.clear();
        return fetchPosts(feedMode);
    }, [fetchPosts, feedMode]);

    const switchMode = useCallback((mode: FeedMode) => {
        // Clear seen posts when switching modes
        seenPostIds.current.clear();
        setFeedMode(mode);
    }, []);

    return {
        posts,
        loading,
        feedMode,
        refreshFeed,
        switchMode,
    };
}
