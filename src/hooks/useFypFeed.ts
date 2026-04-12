import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '../utils/supabase';
import { getPublicPostUrl } from '../utils/media';
import { useUserStore } from '../stores/UserStore';
import { ErrorHandlerService } from '../core/error/services/ErrorHandlerService';

const FEED_LIMIT = 50;
const FALLBACK_POOL_LIMIT = 150;
const FRESHNESS_WINDOW_MS = 1000 * 60 * 60 * 24 * 7;

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

type FetchPostsOptions = {
  waitForScoreRefresh?: boolean;
};

const getRowPostId = (row: any): string | undefined => {
  const id = row?.id ?? row?.post_id ?? row?.postId;
  return id ? String(id) : undefined;
};

const uniqueById = <T extends { id: string }>(items: T[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

export function useFypFeed(initialMode: FeedMode = 'fyp') {
  const { user } = useUserStore();
  const [posts, setPosts] = useState<FypPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedMode, setFeedMode] = useState<FeedMode>(initialMode);
  const requestIdRef = useRef(0);

  const refreshScores = useCallback(async () => {
    if (!user?.id) return;

    try {
      await db.social.rpc('refresh_fyp_scores', { p_user_id: user.id });
    } catch {
      // Non-critical. The feed can still use existing scores or client fallback ranking.
    }
  }, [user?.id]);

  const fetchBlockedPostIds = useCallback(async () => {
    const blockedPostIds = new Set<string>();
    if (!user?.id) return blockedPostIds;

    const { data, error } = await db.social
      .from('Block_posts')
      .select('post_id')
      .eq('user_id', user.id);

    if (error) {
      console.warn('[FYP] Failed to fetch blocked posts:', error.message);
      return blockedPostIds;
    }

    data?.forEach((row: any) => {
      if (row.post_id) blockedPostIds.add(String(row.post_id));
    });

    return blockedPostIds;
  }, [user?.id]);

  const fetchFollowingIds = useCallback(async () => {
    const followingIds = new Set<string>();
    if (!user?.id) return followingIds;

    const { data, error } = await db.social
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id);

    if (error) {
      console.warn('[FYP] Failed to fetch following graph:', error.message);
      return followingIds;
    }

    data?.forEach((row: any) => {
      if (row.following_id) followingIds.add(String(row.following_id));
    });

    return followingIds;
  }, [user?.id]);

  const hydrateRpcRows = useCallback(async (rows: any[]) => {
    if (rows.length === 0) return [];

    const postIds = rows.map(getRowPostId).filter(Boolean) as string[];
    const needsPostHydration = rows.some(
      (row) => !row.media_url || !row.user_id || !row.created_at
    );

    if (!needsPostHydration) {
      return rows.map((row) => ({ ...row, id: getRowPostId(row) })).filter((row) => row.id);
    }

    if (postIds.length === 0) return [];

    const { data: hydratedPosts, error } = await db.social
      .from('Posts')
      .select('*')
      .in('id', postIds);

    if (error) throw error;

    const postsById = new Map<string, any>();
    hydratedPosts?.forEach((post: any) => postsById.set(String(post.id), post));

    return rows
      .map((row) => {
        const id = getRowPostId(row);
        const post = id ? postsById.get(id) : null;
        if (!id || !post) return null;

        return {
          ...post,
          fyp_score: row.fyp_score ?? row.score,
          fyp_source: row.fyp_source ?? row.source,
        };
      })
      .filter(Boolean);
  }, []);

  const fetchRankedFallbackPosts = useCallback(async () => {
    const [{ data: postsData, error: postsError }, followingIds] = await Promise.all([
      db.social
        .from('Posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(FALLBACK_POOL_LIMIT),
      fetchFollowingIds(),
    ]);

    if (postsError) throw postsError;
    if (!postsData) return [];

    const now = Date.now();

    return postsData
      .map((post: any) => {
        const ageMs = Math.max(0, now - new Date(post.created_at).getTime());
        const freshnessScore = Math.max(0, 1 - ageMs / FRESHNESS_WINDOW_MS) * 40;
        const engagementScore =
          Number(post.likes ?? 0) * 4 +
          Number(post.comments_count ?? 0) * 6 +
          Number(post.shares ?? 0) * 8;
        const followScore = followingIds.has(String(post.user_id)) ? 25 : 0;
        const ownPostPenalty = user?.id && String(post.user_id) === user.id ? -20 : 0;
        const jitter = Math.random() * 3;

        return {
          ...post,
          fyp_score: freshnessScore + engagementScore + followScore + ownPostPenalty + jitter,
          fyp_source: 'client_fallback',
        };
      })
      .sort((a: any, b: any) => Number(b.fyp_score ?? 0) - Number(a.fyp_score ?? 0))
      .slice(0, FEED_LIMIT);
  }, [fetchFollowingIds, user?.id]);

  const fetchPosts = useCallback(
    async (mode: FeedMode, options: FetchPostsOptions = {}) => {
      const requestId = ++requestIdRef.current;

      try {
        setLoading(true);

        if (options.waitForScoreRefresh) {
          await refreshScores();
        } else {
          void refreshScores();
        }

        const blockedPostIds = await fetchBlockedPostIds();
        let postsData: any[] | null = null;

        if (mode === 'fyp' && user?.id) {
          const { data, error: rpcError } = await db.social.rpc('get_fyp_feed', {
            p_user_id: user.id,
            p_limit: FEED_LIMIT,
            p_cursor: null,
          });

          if (!rpcError && data && data.length > 0) {
            postsData = await hydrateRpcRows(data);
          } else {
            if (rpcError) {
              console.warn('[FYP] RPC unavailable, using ranked fallback:', rpcError.message);
            }
            postsData = await fetchRankedFallbackPosts();
          }
        }

        if (!postsData) {
          const { data, error } = await db.social
            .from('Posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(FEED_LIMIT);

          if (error) throw error;
          postsData = data;
        }

        const feedRows = uniqueById(
          (postsData ?? [])
            .map((post: any) => ({ ...post, id: getRowPostId(post) }))
            .filter((post: any) => post.id && !blockedPostIds.has(post.id))
        );

        if (feedRows.length === 0) {
          if (requestId === requestIdRef.current) setPosts([]);
          return;
        }

        const userIds = [...new Set(feedRows.map((post: any) => post.user_id).filter(Boolean))];
        const { data: usersData, error: usersError } =
          userIds.length > 0
            ? await db.user.from('Users').select('id, username, avatar_path').in('id', userIds)
            : { data: [], error: null };

        if (usersError) {
          console.warn('[FYP] Failed to fetch post authors:', usersError.message);
        }

        const usersMap = new Map();
        usersData?.forEach((postUser: any) => usersMap.set(postUser.id, postUser));

        const mergedPosts: FypPost[] = feedRows.map((post: any) => {
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
            is_blocked: false,
            Users: postUser
              ? {
                  username: postUser.username,
                  profile_image: profileImageUrl,
                }
              : undefined,
          };
        });

        if (requestId === requestIdRef.current) {
          setPosts(mergedPosts);
        }
      } catch (err: any) {
        ErrorHandlerService.handle(err, { showUI: false });
        if (requestId === requestIdRef.current) {
          setPosts([]);
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [user?.id, refreshScores, fetchBlockedPostIds, hydrateRpcRows, fetchRankedFallbackPosts]
  );

  useEffect(() => {
    fetchPosts(feedMode);
  }, [fetchPosts, feedMode]);

  const refreshFeed = useCallback(
    () => fetchPosts(feedMode, { waitForScoreRefresh: true }),
    [fetchPosts, feedMode]
  );

  const switchMode = useCallback((mode: FeedMode) => {
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
